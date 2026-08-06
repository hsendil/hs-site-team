#!/usr/bin/env node
/**
 * Chain 8: Kaynak Tarayici
 *
 * sources/kaynaklar.json listesindeki RSS/Atom feed'leri ceker, son N gunun
 * ogelerini toplar, Claude ile hedef kitleye gore skorlar ve en iyi 10 adayi
 * GitHub Issue olarak sahibe sunar. Icerik YAZMAZ, yayin YAPMAZ.
 * Secilenler Atifli Yorum formatina girer (bkz. CON.md).
 *
 * Gerekli env: ANTHROPIC_API_KEY, GITHUB_TOKEN, GITHUB_REPOSITORY
 * Opsiyonel: GUN (varsayilan 7), CHAIN8_MAX_TOKENS (varsayilan 12000)
 */

import fs from "node:fs";

const MODEL = process.env.CHAIN8_MODEL ?? "claude-sonnet-5";
const GUN = Number(process.env.GUN ?? "7");
const MAX_TOKENS = Number(process.env.CHAIN8_MAX_TOKENS ?? "12000");
const FEED_BASINA_TAVAN = 25;
const TOPLAM_TAVAN = 140;

function temizle(s) {
  return String(s ?? "")
    .replace(/<!\[CDATA\[|\]\]>/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function ogeAyikla(xml) {
  const bloklar = [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/g)].map((m) => m[0]);
  return bloklar.map((b) => {
    const baslik = temizle((b.match(/<title[^>]*>([\s\S]*?)<\/title>/) ?? [])[1]);
    let link = (b.match(/<link[^>]*href="([^"]+)"/) ?? [])[1];
    if (!link) link = temizle((b.match(/<link[^>]*>([\s\S]*?)<\/link>/) ?? [])[1]);
    const tarihHam =
      (b.match(/<pubDate>([\s\S]*?)<\/pubDate>/) ?? [])[1] ??
      (b.match(/<published>([\s\S]*?)<\/published>/) ?? [])[1] ??
      (b.match(/<updated>([\s\S]*?)<\/updated>/) ?? [])[1] ??
      (b.match(/<dc:date>([\s\S]*?)<\/dc:date>/) ?? [])[1];
    const tarih = tarihHam ? new Date(temizle(tarihHam)) : null;
    return { baslik, link, tarih };
  }).filter((o) => o.baslik && o.link);
}

async function feedCek(kaynak) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(kaynak.rss, {
      signal: ctrl.signal,
      headers: { "user-agent": "hs-site-team-chain8/1.0 (+https://hayrettinsendil.tr)" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    if (!/<rss|<feed|<channel/i.test(xml.slice(0, 2000))) throw new Error("RSS/Atom isareti yok");
    let ogeler = ogeAyikla(xml);
    const sinir = Date.now() - GUN * 86400000;
    ogeler = ogeler.filter((o) => !o.tarih || o.tarih.getTime() >= sinir);
    if (Array.isArray(kaynak.filtre) && kaynak.filtre.length) {
      ogeler = ogeler.filter((o) => {
        const t2 = ` ${o.baslik.toLowerCase()} `;
        return kaynak.filtre.some((f) => t2.includes(f.toLowerCase()));
      });
    }
    ogeler.sort((a, b2) => (b2.tarih?.getTime() ?? 0) - (a.tarih?.getTime() ?? 0));
    return ogeler.slice(0, FEED_BASINA_TAVAN).map((o) => ({
      kaynak: kaynak.ad,
      katman: kaynak.katman,
      baslik: o.baslik.slice(0, 200),
      link: o.link,
      tarih: o.tarih ? o.tarih.toISOString().slice(0, 10) : "tarihsiz",
    }));
  } finally {
    clearTimeout(t);
  }
}

async function skorla(ogeler) {
  const system = [
    "Turkce yazan kidemli bir kurumsal icerik editorusun.",
    "Gorev: asagidaki yabanci AI haber ve makale basliklarindan, Turkiye'deki kurumsal BT ve dijital donusum liderleri icin en degerli 10 adayi sec.",
    "Site sahibi: kurumsal yapay zeka ve context engineering egitmeni; 20+ yil BT operasyon liderligi (ITSM, ITIL, proje yonetimi) tecrubesi. Secilen icerikler onun yorumu ve atifla Turkce yazilara donusecek.",
    "Secim kriterleri: (1) Turkce kaynak boslugu: bu konu Turkce'de dogru islenmemis olmali, (2) kurumsal karar vericiye somut deger, (3) sahibin tecrubesiyle yorum katma alani, (4) kanit ve veri iceren, hype olmayan icerik. Ayni konudan tek aday sec, cesitlilik koru (haber + bilimsel + regulasyon karisimi ideal).",
    "Kurallar: em-dash karakteri YASAK. Verilen baslik ve linkleri AYNEN kullan, uydurma.",
    'Cikti YALNIZ gecerli JSON: {"secimler":[{"baslik":"...","kaynak":"...","link":"...","neden":"1 cumle","yorum_acisi":"sahibin hangi tecrubesiyle baglanir, 1 cumle"}]} tam 10 oge.',
  ].join(" ");

  const user = ogeler
    .map((o) => `- [${o.katman}/${o.kaynak}/${o.tarih}] ${o.baslik} :: ${o.link}`)
    .join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: MAX_TOKENS, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  if (json.stop_reason === "max_tokens") {
    throw new Error(`Yanit kesildi (max_tokens=${MAX_TOKENS}); CHAIN8_MAX_TOKENS ile artir.`);
  }
  const ham = (json.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const s = ham.indexOf("{");
  const e = ham.lastIndexOf("}");
  if (s === -1 || e <= s) throw new Error(`JSON yok. Bas: ${ham.slice(0, 200)}`);
  const data = JSON.parse(ham.slice(s, e + 1));
  if (!Array.isArray(data.secimler) || !data.secimler.length) throw new Error("secimler bos");
  return data.secimler.slice(0, 10);
}

async function issueAc(secimler, istatistik) {
  const tarih = new Date().toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
  const satirlar = secimler
    .map((x) =>
      [
        `- [ ] **[${x.baslik}](${x.link})**`,
        `  - Kaynak: ${x.kaynak}`,
        `  - Neden: ${x.neden}`,
        `  - Yorum acisi: ${x.yorum_acisi}`,
      ].join("\n")
    )
    .join("\n");

  const body = [
    `Son ${GUN} gunun taramasi. ${istatistik.feedOk} feed okundu, ${istatistik.feedHata} feed hata verdi, ${istatistik.toplamOge} oge degerlendirildi.`,
    "",
    satirlar,
    "",
    "Secilenler Atifli Yorum formatina girer (CON.md): birebir ceviri yok, kisa alintí + atif + sahip yorumu. Secim sonrasi Notion Icerik Takvimi'ne islenir.",
    istatistik.hatalar.length ? `\nBasarisiz feed'ler: ${istatistik.hatalar.join(" · ")}` : "",
  ].join("\n");

  const res = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: "application/vnd.github+json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ title: `Kaynak taramasi: ${tarih}`, body }),
  });
  if (!res.ok) throw new Error(`Issue acilamadi ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).html_url;
}

async function main() {
  const liste = JSON.parse(fs.readFileSync("sources/kaynaklar.json", "utf8")).kaynaklar.filter((k) => k.aktif && k.rss);
  console.log(`Aktif feed: ${liste.length} · pencere: son ${GUN} gun`);
  const hepsi = [];
  const hatalar = [];
  for (const k of liste) {
    try {
      const ogeler = await feedCek(k);
      console.log(`  ok  ${k.ad}: ${ogeler.length} oge`);
      hepsi.push(...ogeler);
    } catch (err) {
      console.log(`  HATA ${k.ad}: ${err.message}`);
      hatalar.push(`${k.ad} (${err.message})`);
    }
  }
  if (!hepsi.length) throw new Error("Hicbir feed'den oge alinamadi");
  let ogeler = hepsi;
  if (ogeler.length > TOPLAM_TAVAN) {
    const grup = new Map();
    for (const o of ogeler) {
      if (!grup.has(o.kaynak)) grup.set(o.kaynak, []);
      grup.get(o.kaynak).push(o);
    }
    ogeler = [...grup.values()].flatMap((g) => g.slice(0, 12)).slice(0, TOPLAM_TAVAN);
  }
  console.log(`Degerlendirmeye giden oge: ${ogeler.length}`);
  const secimler = await skorla(ogeler);
  for (const x of secimler) console.log(`- ${x.kaynak}: ${x.baslik}`);
  const url = await issueAc(secimler, {
    feedOk: liste.length - hatalar.length,
    feedHata: hatalar.length,
    toplamOge: ogeler.length,
    hatalar,
  });
  console.log(`Issue: ${url}`);
}

main().catch((err) => {
  console.error(`HATA: ${err.message ?? err}`);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Chain 7: Konu Onerici
 *
 * Canli sitenin sitemap'inden mevcut blog yazilarini okur, Claude ile
 * 5 konu onerisi uretir (2 derin vaka + 3 saha notu) ve GitHub Issue acar.
 * Bu script yayin YAPMAZ, icerik YAZMAZ; yalniz oneri listeler.
 * Haftalik kural (sahip onayi 28.07.2026): 1 Derin Vaka + 1 Saha Notu secilir.
 *
 * Idempotans (11.08.2026): ayni gun icin Issue zaten varsa yenisi ACILMAZ.
 * Kontrol Anthropic cagrisindan once yapilir. FORCE=1 ile ezilebilir.
 *
 * Gerekli env: ANTHROPIC_API_KEY, GITHUB_TOKEN, GITHUB_REPOSITORY
 * Opsiyonel: CHAIN7_MAX_TOKENS (varsayilan 12000), FORCE
 */

const SITE = "https://hayrettinsendil.tr";
const MODEL = process.env.CHAIN7_MODEL ?? "claude-sonnet-5";
const MAX_TOKENS = Number(process.env.CHAIN7_MAX_TOKENS ?? "12000");

function bugun() {
  return new Date().toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
}

function ghBaslik() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "content-type": "application/json",
  };
}

/**
 * Ayni baslikta bir Issue zaten acilmis mi?
 * Kapali olanlari da sayar: kapatilmis bir Issue'nun yerine yenisini acmak
 * mukerrer kayit uretir ve sahibin isaretledigi secim kaybolur.
 */
async function mevcutIssue(baslik) {
  const res = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/issues?state=all&per_page=50`,
    { headers: ghBaslik() }
  );
  if (!res.ok) {
    console.log(`  UYARI: mevcut Issue kontrolu yapilamadi (${res.status}); kontrol atlaniyor`);
    return null;
  }
  const liste = await res.json();
  const bulunan = liste.find((i) => i.title === baslik && !i.pull_request);
  return bulunan ? bulunan.html_url : null;
}

async function mevcutYazilar() {
  const res = await fetch(`${SITE}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  return locs.filter((u) => u.includes("/blog/") && !u.endsWith("/blog"));
}

async function oneriUret(yazilar) {
  const system = [
    "Turkce yazan kidemli bir kurumsal icerik editorusun.",
    "Site: hayrettinsendil.tr. Sahibi kurumsal yapay zeka ve context engineering egitmeni; 20+ yil BT operasyon liderligi gecmisi var.",
    "Hedef kitle: kurumsal BT ve dijital donusum liderleri, egitim satin alan IK/gelisim birimleri.",
    "Konu alani: kurumsal AI, context engineering, Claude Code ve Cowork, MCP, agent skill'ler, cok ajanli sistemler, AI ile ITSM/ITIL kesisimi, pilottan uretime gecis.",
    "Kurallar: em-dash karakteri YASAK. Abarti ve reklam dili yasak. Her oneri sahibin canli sistemlerinden (site repo'su, 7 ajanli takim, is pratigi) uretilebilecek kanita baglanmali.",
    "gerekce ve kanit_ihtiyaci alanlari en fazla 2 cumle olsun.",
    'Cikti YALNIZ gecerli JSON: {"oneriler":[{"baslik":"...","format":"derin-vaka","gerekce":"...","kanit_ihtiyaci":"..."}]}',
  ].join(" ");

  const user = [
    "Sitede yayinda olan yazilar:",
    ...yazilar.map((u) => `- ${u}`),
    "",
    "5 yeni konu onerisi uret: tam 2 adet derin-vaka, tam 3 adet saha-notu.",
    "Mevcut yazilarla konu cakismasi olmasin. Basliklar 60 karakterin altinda kalsin.",
    "derin-vaka: 1000-2000 kelimelik, commit/tarih/olcum kanitli vaka calismasi.",
    "saha-notu: 400-600 kelimelik, tek pratik ders anlatan kisa yazi.",
  ].join("\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = await res.json();
  if (json.stop_reason === "max_tokens") {
    throw new Error(`Yanit kesildi (max_tokens=${MAX_TOKENS}); CHAIN7_MAX_TOKENS ile artir.`);
  }
  const ham = (json.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  const start = ham.indexOf("{");
  const end = ham.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`Yanitta JSON bulunamadi. Yanit basi: ${ham.slice(0, 200)}`);
  }
  let data;
  try {
    data = JSON.parse(ham.slice(start, end + 1));
  } catch (e) {
    throw new Error(`JSON parse hatasi: ${e.message}. Yanit basi: ${ham.slice(0, 200)}`);
  }
  if (!Array.isArray(data.oneriler) || data.oneriler.length !== 5) {
    throw new Error(`Beklenen 5 oneri, gelen: ${data.oneriler?.length}`);
  }
  for (const o of data.oneriler) {
    if (String(o.baslik).includes("—")) throw new Error(`Em-dash tespit edildi: ${o.baslik}`);
  }
  return data.oneriler;
}

async function issueAc(baslik, oneriler) {
  const satirlar = oneriler
    .map((o) =>
      [
        `- [ ] **${o.baslik}**`,
        `  - Format: ${o.format === "derin-vaka" ? "Derin Vaka" : "Saha Notu"}`,
        `  - Gerekce: ${o.gerekce}`,
        `  - Kanit ihtiyaci: ${o.kanit_ihtiyaci}`,
      ].join("\n")
    )
    .join("\n");

  const body = [
    "Bu haftanin konu onerileri. Kural: haftada 1 Derin Vaka + 1 Saha Notu secilir.",
    "",
    satirlar,
    "",
    "Secilen 2 konuyu isaretle; Pazartesi oturumunda Notion Icerik Takvimi'ne islenir.",
    "Bu issue yalniz oneridir. Yayin kapilari degismez: taslak + Iddia Envanteri, EDT denetimi, PR ve sahip onayi.",
  ].join("\n");

  const res = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/issues`, {
    method: "POST",
    headers: ghBaslik(),
    body: JSON.stringify({ title: baslik, body }),
  });
  if (!res.ok) throw new Error(`Issue acilamadi ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const issue = await res.json();
  return issue.html_url;
}

async function main() {
  const baslik = `Konu onerileri: ${bugun()}`;

  if (process.env.FORCE !== "1") {
    const varOlan = await mevcutIssue(baslik);
    if (varOlan) {
      console.log(`Bugun icin Issue zaten var, yenisi acilmadi: ${varOlan}`);
      console.log("Bilincli olarak tekrar uretmek istersen FORCE=1 ile kos.");
      return;
    }
  }

  const yazilar = await mevcutYazilar();
  console.log(`Mevcut yazi: ${yazilar.length}`);
  const oneriler = await oneriUret(yazilar);
  for (const o of oneriler) console.log(`- [${o.format}] ${o.baslik}`);
  const url = await issueAc(baslik, oneriler);
  console.log(`Issue: ${url}`);
}

main().catch((err) => {
  console.error(`HATA: ${err.message ?? err}`);
  process.exit(1);
});

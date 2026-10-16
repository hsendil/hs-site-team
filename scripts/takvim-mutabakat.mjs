#!/usr/bin/env node
/**
 * Chain 12: Takvim Mutabakati
 *
 * Tek gercek canli sitedir. hayrettinsendil.tr/sitemap.xml'deki /blog/<slug>
 * adreslerini okur, her yazinin og:title'ini ceker, Notion Icerik Takvimi
 * kartlariyla eslestirir ve sapmayi kapatir:
 *   1. Sitede var, kart yok        -> kart acar (Durum: Yayinda, tarih sitemap lastmod)
 *   2. Kart var, Durum yayin oncesi -> Durum: Yayinda
 *   3. Baslik farkli               -> site basligini yazar
 *   4. Kart var, sitede yok, hedef tarih gecmis -> dokunmaz, raporlar (gecikmis kart)
 * Degisiklik ya da sapma varsa GitHub Issue acar; temizse Issue acmaz.
 *
 * Icerik yazmaz, yayin yapmaz, kart silmez, kart kapatmaz. Sosyal Cikti
 * durumuna dokunmaz (o bilgi sitede yok).
 *
 * Gerekli env: NOTION_TOKEN, NOTION_DB_ID, GITHUB_TOKEN, GITHUB_REPOSITORY
 * Opsiyonel: SITE (varsayilan https://hayrettinsendil.tr), DRY_RUN=1
 */

const SITE = process.env.SITE ?? "https://hayrettinsendil.tr";
const DB = process.env.NOTION_DB_ID;
const DRY = process.env.DRY_RUN === "1";
const YAYINDA = new Set(["Yayında", "Sosyal Çıktı"]);

function bugun() {
  return new Date().toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
}

function notionBaslik() {
  return {
    Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
    "Notion-Version": "2022-06-28",
    "content-type": "application/json",
  };
}

function ghBaslik() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "content-type": "application/json",
  };
}

function temizle(s) {
  return String(s ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function siteYazilari() {
  const res = await fetch(`${SITE}/sitemap.xml`, {
    headers: { "user-agent": "hs-site-team-chain12/1.0 (+https://hayrettinsendil.tr)" },
  });
  if (!res.ok) throw new Error(`sitemap HTTP ${res.status}`);
  const xml = await res.text();
  const yazilar = [];
  for (const m of xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/g)) {
    const loc = m[1];
    const mm = loc.match(/\/blog\/([^/]+)$/);
    if (!mm || mm[1] === "etiket") continue;
    yazilar.push({ slug: mm[1], url: loc, tarih: m[2].slice(0, 10) });
  }
  for (const y of yazilar) {
    const r = await fetch(y.url, { headers: { "user-agent": "hs-site-team-chain12/1.0" } });
    if (!r.ok) {
      y.baslik = null;
      continue;
    }
    const html = await r.text();
    const og = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/) ?? html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/);
    let t = temizle(og?.[1] ?? (html.match(/<title>([^<]+)<\/title>/) ?? [])[1]);
    t = t.replace(/\s*\|\s*Hayrettin Şendil\s*$/, "");
    y.baslik = t || null;
  }
  return yazilar;
}

function dz(prop) {
  if (!prop) return "";
  if (prop.type === "title") return prop.title.map((t) => t.plain_text).join("");
  if (prop.type === "rich_text") return prop.rich_text.map((t) => t.plain_text).join("");
  if (prop.type === "select") return prop.select?.name ?? "";
  if (prop.type === "date") return prop.date?.start ?? "";
  return "";
}

async function notionKartlar() {
  const kartlar = [];
  let cursor;
  do {
    const res = await fetch(`https://api.notion.com/v1/databases/${DB}/query`, {
      method: "POST",
      headers: notionBaslik(),
      body: JSON.stringify(cursor ? { start_cursor: cursor, page_size: 100 } : { page_size: 100 }),
    });
    if (!res.ok) throw new Error(`Notion query ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const j = await res.json();
    for (const p of j.results) {
      kartlar.push({
        id: p.id,
        url: p.url,
        slug: dz(p.properties["Slug"]).trim(),
        baslik: dz(p.properties["Başlık"]).trim(),
        durum: dz(p.properties["Durum"]),
        hedef: dz(p.properties["Hedef Yayın"]),
      });
    }
    cursor = j.has_more ? j.next_cursor : undefined;
  } while (cursor);
  return kartlar;
}

async function kartGuncelle(id, properties) {
  if (DRY) return;
  const res = await fetch(`https://api.notion.com/v1/pages/${id}`, {
    method: "PATCH",
    headers: notionBaslik(),
    body: JSON.stringify({ properties }),
  });
  if (!res.ok) throw new Error(`Notion update ${res.status}: ${(await res.text()).slice(0, 300)}`);
}

async function kartAc(y) {
  if (DRY) return "(dry-run)";
  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: notionBaslik(),
    body: JSON.stringify({
      parent: { database_id: DB },
      properties: {
        "Başlık": { title: [{ text: { content: y.baslik ?? y.slug } }] },
        Slug: { rich_text: [{ text: { content: y.slug } }] },
        Durum: { select: { name: "Yayında" } },
        "Hedef Yayın": { date: { start: y.tarih } },
        "Kanıt Kaynağı": {
          rich_text: [
            {
              text: {
                content: `Chain 12 otomatik açtı (${bugun()}): yazı canlı sitede, kartı yoktu. Kaynak ${y.url}, sitemap lastmod ${y.tarih}. Format, PR, sosyal ve kanıt kaynağı sahip tarafından tamamlanır.`,
              },
            },
          ],
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Notion create ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).url;
}

async function issueAc(baslik, satirlar) {
  const body = [
    `Kaynak: ${SITE}/sitemap.xml (tek gerçek). Notion İçerik Takvimi ile eşlendi.`,
    "",
    ...satirlar,
    "",
    "Kart açma ve durum düzeltme otomatik yapıldı; gecikmiş kart kararı sahibindir (tarih kaydır ya da Fikir'e düşür).",
  ].join("\n");
  if (DRY) {
    console.log(`\n[dry-run] Issue: ${baslik}\n${body}`);
    return "(dry-run)";
  }
  const res = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/issues`, {
    method: "POST",
    headers: ghBaslik(),
    body: JSON.stringify({ title: baslik, body }),
  });
  if (!res.ok) throw new Error(`Issue açılamadı ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()).html_url;
}

async function main() {
  if (!process.env.NOTION_TOKEN || !DB) throw new Error("NOTION_TOKEN ve NOTION_DB_ID gerekli");
  const yazilar = await siteYazilari();
  const kartlar = await notionKartlar();
  console.log(`Sitede ${yazilar.length} yazı, Notion'da ${kartlar.length} kart`);

  const slugIndeks = new Map(kartlar.filter((k) => k.slug).map((k) => [k.slug, k]));
  const rapor = [];

  for (const y of yazilar) {
    const k = slugIndeks.get(y.slug);
    if (!k) {
      const url = await kartAc(y);
      rapor.push(`- YETİM KAPATILDI: \`${y.slug}\` (${y.tarih}) kartı yoktu, açıldı → ${url}`);
      console.log(`  kart açıldı: ${y.slug}`);
      continue;
    }
    const props = {};
    if (!YAYINDA.has(k.durum)) {
      props.Durum = { select: { name: "Yayında" } };
      rapor.push(`- DURUM: \`${y.slug}\` "${k.durum || "boş"}" → "Yayında" (${k.url})`);
    }
    if (y.baslik && k.baslik !== y.baslik) {
      props["Başlık"] = { title: [{ text: { content: y.baslik } }] };
      rapor.push(`- BAŞLIK: \`${y.slug}\` "${k.baslik}" → "${y.baslik}"`);
    }
    if (Object.keys(props).length) {
      await kartGuncelle(k.id, props);
      console.log(`  kart güncellendi: ${y.slug} (${Object.keys(props).join(", ")})`);
    }
  }

  const bugunISO = new Date().toISOString().slice(0, 10);
  const siteSluglar = new Set(yazilar.map((y) => y.slug));
  for (const k of kartlar) {
    if (k.slug && siteSluglar.has(k.slug)) continue;
    if (YAYINDA.has(k.durum)) {
      rapor.push(`- HAYALET: "${k.baslik}" kartı ${k.durum} ama sitede yok (${k.url})`);
      continue;
    }
    if (k.hedef && k.hedef < bugunISO) {
      rapor.push(`- GECİKMİŞ: "${k.baslik}" hedef ${k.hedef}, durum ${k.durum || "boş"}, sitede yok (${k.url}); karar sahipte`);
    }
  }

  if (!rapor.length) {
    console.log("Mutabakat temiz; Issue açılmadı.");
    return;
  }
  for (const r of rapor) console.log(r);
  const url = await issueAc(`Takvim mutabakatı: ${bugun()}`, rapor);
  console.log(`Issue: ${url}`);
}

main().catch((err) => {
  console.error(`HATA: ${err.message ?? err}`);
  process.exit(1);
});

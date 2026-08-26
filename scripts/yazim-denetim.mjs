#!/usr/bin/env node
/**
 * Yazım denetimi — kuyruk dosyalarını yayından ÖNCE denetler.
 *
 * Neden ayrı bir adım? Yayın betiklerindeki em-dash kontrolü (x-post.mjs,
 * linkedin-post.mjs, instagram-post.mjs) ancak dosya main'e düştükten sonra,
 * yani yayın anında çalışır. Merge etmek yayınlamaktır; o noktada uyarı geç
 * kalır. Bu betik aynı kuralı PR aşamasında koşturur, kapı sahibin önüne
 * temiz gelir. Yayın betiklerindeki kontrol kaldırılmadı, son savunma hattı
 * olarak yerinde durur.
 *
 * Kullanım:
 *   node scripts/yazim-denetim.mjs                 # queue/ altındaki her .json
 *   node scripts/yazim-denetim.mjs dosya1 dosya2   # verilen dosyalar
 *
 * Çıkış kodu: hata varsa 1, yalnız uyarı varsa 0.
 *
 * İKİ SEVİYE, bilerek ayrıldı:
 *   HATA   → kesin kural, makine karar verebilir (em-dash).
 *   UYARI  → sezgisel kontrol, yanlış pozitif üretebilir (Türkçe büyük harf).
 * Sezgisel bir kontrol yayını durdurmaz; durdursaydı tek yanlış pozitif
 * Perşembe yayınını düşürürdü.
 */

import fs from "node:fs";
import path from "node:path";

const QUEUE_DIR = "queue";

/**
 * Yasak tire karakterleri.
 * U+2014 em dash, marka kuralının asıl hedefi.
 * U+2015 yatay çubuk, ekranda em-dash ile aynı görünür, kopyala yapıştırda gelir.
 * U+2013 en dash bilerek DIŞARIDA: sayı aralığında (2020–2024) meşru kullanımı var.
 */
const YASAK_TIRE = {
  "—": "em-dash (U+2014)",
  "―": "yatay çubuk (U+2015)",
};

/** Türkçe'de ön ünlüler. Bunlardan biriyle "I" aynı sözcükte ise ünlü uyumu bozulur. */
const ON_UNLU = /[EİÖÜ]/;

/** Büyük harf denetiminden muaf kısaltmalar. */
const KISALTMA = new Set([
  "AI", "IT", "API", "ITIL", "ISO", "PMI", "PMP", "KPI", "SLA", "IK", "BT",
  "CI", "UI", "IP", "ID", "SIEM", "AIOPS", "FINOPS", "SECOPS",
]);

/** Metindeki yasak tireleri bulur. Kesin kural, hata üretir. */
export function tireHatalari(metin, etiket) {
  const hatalar = [];
  for (const [karakter, ad] of Object.entries(YASAK_TIRE)) {
    if (metin.includes(karakter)) {
      hatalar.push(`${etiket}: ${ad} içeriyor (marka kuralı, em-dash yasak)`);
    }
  }
  return hatalar;
}

/**
 * Türkçe büyük harf tuzağı.
 *
 * `upper()` Latin kuralı uygular ve "i" harfini "İ" yerine "I" yapar. Sonuç
 * TÜRKIYE, BÖLELIM gibi sözcüklerdir. Tespit ünlü uyumuna dayanır: Türkçe bir
 * sözcükte ön ünlü (E, İ, Ö, Ü) ile arka ünlü "I" birlikte bulunmaz. İkisi
 * aynı sözcükteyse "I" büyük olasılıkla yanlış eşlenmiş bir "i"dir.
 *
 * SINIRI AÇIK: yalnız I harfi taşıyan sözcükte (BILGI) sinyal yoktur, bu
 * kontrol onu yakalayamaz. Yakalayabildiği kadarını uyarı olarak bildirir,
 * yayını durdurmaz.
 */
export function buyukHarfUyarilari(metin, etiket) {
  const uyarilar = [];
  const kelimeler = metin.match(/[A-ZÇĞİÖŞÜ]{2,}/g) ?? [];
  for (const kelime of new Set(kelimeler)) {
    if (KISALTMA.has(kelime)) continue;
    if (!kelime.includes("I")) continue;
    if (!ON_UNLU.test(kelime)) continue;
    const onerilen = kelime.replaceAll("I", "İ");
    uyarilar.push(
      `${etiket}: "${kelime}" ünlü uyumunu bozuyor, I yerine İ olabilir (önerilen: "${onerilen}")`
    );
  }
  return uyarilar;
}

/** Kuyruk kaydından denetlenecek metin alanlarını çıkarır. Kanal başına şema farklı. */
export function metinAlanlari(kayit) {
  const alanlar = [];
  if (Array.isArray(kayit.tweets)) {
    kayit.tweets.forEach((t, i) => {
      if (typeof t === "string") alanlar.push([`tweet ${i + 1}`, t]);
    });
  }
  if (typeof kayit.text === "string") alanlar.push(["text", kayit.text]);
  if (typeof kayit.caption === "string") alanlar.push(["caption", kayit.caption]);
  if (typeof kayit.altText === "string") alanlar.push(["altText", kayit.altText]);
  if (Array.isArray(kayit.images)) {
    kayit.images.forEach((g, i) => {
      if (g && typeof g.altText === "string") alanlar.push([`images[${i}].altText`, g.altText]);
    });
  }
  return alanlar;
}

/** Tek dosyayı denetler. */
export function dosyaDenetle(dosya) {
  const hatalar = [];
  const uyarilar = [];
  let kayit;
  try {
    kayit = JSON.parse(fs.readFileSync(dosya, "utf8"));
  } catch (err) {
    return { hatalar: [`${dosya}: JSON okunamadı, ${err.message}`], uyarilar: [] };
  }

  for (const [alan, metin] of metinAlanlari(kayit)) {
    const etiket = `${dosya} > ${alan}`;
    hatalar.push(...tireHatalari(metin, etiket));
    uyarilar.push(...buyukHarfUyarilari(metin, etiket));
  }
  return { hatalar, uyarilar };
}

/** queue/ altındaki tüm .json dosyalarını toplar. */
function kuyrukDosyalari(kok = QUEUE_DIR) {
  if (!fs.existsSync(kok)) return [];
  const cikti = [];
  for (const giris of fs.readdirSync(kok, { withFileTypes: true })) {
    const tam = path.join(kok, giris.name);
    if (giris.isDirectory()) cikti.push(...kuyrukDosyalari(tam));
    else if (giris.name.endsWith(".json")) cikti.push(tam);
  }
  return cikti.sort();
}

function main() {
  const argvDosyalari = process.argv.slice(2);
  const dosyalar = argvDosyalari.length ? argvDosyalari : kuyrukDosyalari();

  if (!dosyalar.length) {
    console.log("Denetlenecek kuyruk dosyası yok.");
    return;
  }

  const tumHatalar = [];
  const tumUyarilar = [];
  for (const dosya of dosyalar) {
    const { hatalar, uyarilar } = dosyaDenetle(dosya);
    tumHatalar.push(...hatalar);
    tumUyarilar.push(...uyarilar);
  }

  console.log(`${dosyalar.length} dosya denetlendi.`);

  if (tumUyarilar.length) {
    console.log(`\nUYARI (${tumUyarilar.length}), yayını durdurmaz:`);
    tumUyarilar.forEach((u) => console.log(`  ! ${u}`));
  }

  if (tumHatalar.length) {
    console.error(`\nHATA (${tumHatalar.length}):`);
    tumHatalar.forEach((h) => console.error(`  x ${h}`));
    console.error("\nKuyruk düştü. Metni düzeltmeden merge edilmez.");
    process.exit(1);
  }

  console.log("\nTemiz. Yasak tire yok.");
}

if (import.meta.url === `file://${process.argv[1]}`) main();

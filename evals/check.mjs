#!/usr/bin/env node
// Kullanım: node evals/check.mjs vaka.json sonuc.json
// sonuc.json: claude -p --output-format json çıktısı ({ result: "..." }) veya düz metin.
// Kontrol değeri düz metin ya da {"cp": 8212} biçiminde kod noktası olabilir;
// ikincisi vaka dosyasına yasak karakter yazmamak içindir.
import fs from "node:fs";

const [vakaYolu, sonucYolu] = process.argv.slice(2);
if (!vakaYolu || !sonucYolu) { console.error("kullanım: check.mjs vaka.json sonuc.json"); process.exit(2); }

const vaka = JSON.parse(fs.readFileSync(vakaYolu, "utf8"));
const ham = fs.readFileSync(sonucYolu, "utf8");
let metin = ham;
try { const j = JSON.parse(ham); if (typeof j.result === "string") metin = j.result; } catch {}

function deger(v) {
  if (v && typeof v === "object" && Number.isInteger(v.cp)) return String.fromCodePoint(v.cp);
  return String(v);
}

export function degerlendir(kontroller, metin) {
  const bulgular = [];
  for (const k of kontroller) {
    const v = deger(k.value);
    let gecti = false;
    if (k.type === "contains") gecti = metin.includes(v);
    else if (k.type === "not_contains") gecti = !metin.includes(v);
    else if (k.type === "regex") gecti = new RegExp(v, k.flags ?? "").test(metin);
    else { bulgular.push({ kontrol: k, gecti: false, not: "bilinmeyen tip" }); continue; }
    bulgular.push({ kontrol: k, gecti });
  }
  return bulgular;
}

const bulgular = degerlendir(vaka.checks ?? [], metin);
const kalan = bulgular.filter((b) => !b.gecti);
for (const b of bulgular) console.log(`${b.gecti ? "ok " : "x  "} ${b.kontrol.type} ${JSON.stringify(b.kontrol.value)}`);
console.log(kalan.length ? `VAKA DÜŞTÜ: ${vaka.id}` : `VAKA GEÇTİ: ${vaka.id}`);
process.exit(kalan.length ? 1 : 0);

#!/usr/bin/env node
// PreToolUse kancası: Write, Edit, MultiEdit.
// Yazılacak metinde yasak tire varsa eylemi durdurur (çıkış kodu 2).
// Kural: em-dash (U+2014) ve yatay çubuk (U+2015) hiçbir çıktıda kullanılmaz.
// Skill bunu tavsiye eder; bu kanca zorlar. Deterministik, ağ yok, saniyenin altında.
// Sabitler kod noktasından üretilir; dosyada tire karakteri dursaydı hook kendi
// düzenlenmesini engellerdi.
import fs from "node:fs";

const YASAK = {
  [String.fromCodePoint(0x2014)]: "em-dash (U+2014)",
  [String.fromCodePoint(0x2015)]: "yatay çubuk (U+2015)",
};
const MUAF = [/\.(png|jpg|jpeg|gif|webp|mp4|pdf|ico|woff2?)$/i, /package-lock\.json$/];

let girdi = "";
try { girdi = fs.readFileSync(0, "utf8"); } catch { process.exit(0); }
let olay;
try { olay = JSON.parse(girdi); } catch { process.exit(0); }

const ti = olay.tool_input ?? {};
const dosya = ti.file_path ?? "";
if (MUAF.some((r) => r.test(dosya))) process.exit(0);

const metinler = [];
if (typeof ti.content === "string") metinler.push(ti.content);
if (typeof ti.new_string === "string") metinler.push(ti.new_string);
if (Array.isArray(ti.edits)) for (const e of ti.edits) if (typeof e?.new_string === "string") metinler.push(e.new_string);

const bulgular = [];
for (const m of metinler) for (const [k, ad] of Object.entries(YASAK)) if (m.includes(k)) bulgular.push(ad);

if (bulgular.length) {
  process.stderr.write(
    `Yazma durduruldu: ${dosya || "dosya"} içinde ${[...new Set(bulgular)].join(", ")}. ` +
    `Marka kuralı: uzun tire yok; nokta, virgül, noktalı virgül, iki nokta veya parantez kullan. ` +
    `Sayı aralığında kısa tire (U+2013) serbesttir.\n`
  );
  process.exit(2);
}
process.exit(0);

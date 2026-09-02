#!/usr/bin/env node
// Tüm vakaları koşar. Gerekli: `claude` CLI ve ANTHROPIC_API_KEY.
// Ortam: ESIK (0-1, varsayılan 0.8), MODEL (isteğe bağlı).
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const dizin = path.join("evals", "vakalar");
const cikti = path.join("evals", "sonuc");
fs.mkdirSync(cikti, { recursive: true });
const vakalar = fs.readdirSync(dizin).filter((f) => f.endsWith(".json")).sort();
if (!vakalar.length) { console.log("vaka yok"); process.exit(0); }

let gecen = 0;
for (const dosya of vakalar) {
  const vaka = JSON.parse(fs.readFileSync(path.join(dizin, dosya), "utf8"));
  const args = ["-p", vaka.prompt, "--output-format", "json", "--allowedTools", "Read"];
  if (process.env.MODEL) args.push("--model", process.env.MODEL);
  const r = spawnSync("claude", args, { encoding: "utf8", timeout: 180000 });
  const sonucYolu = path.join(cikti, dosya);
  fs.writeFileSync(sonucYolu, r.stdout || JSON.stringify({ result: r.stderr || "" }));
  const c = spawnSync("node", ["evals/check.mjs", path.join(dizin, dosya), sonucYolu], { encoding: "utf8" });
  process.stdout.write(c.stdout);
  if (c.status === 0) gecen++;
}
const oran = gecen / vakalar.length;
const esik = Number(process.env.ESIK ?? 0.8);
console.log(`\nGeçiş: ${gecen}/${vakalar.length} (${(oran * 100).toFixed(0)}%), eşik ${(esik * 100).toFixed(0)}%`);
process.exit(oran >= esik ? 0 : 1);

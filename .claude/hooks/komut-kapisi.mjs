#!/usr/bin/env node
// PreToolUse kancası: Bash.
// Yayın kapısını koruyan komutları durdurur (çıkış kodu 2). Kapı sahiptedir:
// ajan PR açar, merge etmez; main'e doğrudan yazmaz; geçmişi ezmez.
import fs from "node:fs";

let girdi = "";
try { girdi = fs.readFileSync(0, "utf8"); } catch { process.exit(0); }
let olay;
try { olay = JSON.parse(girdi); } catch { process.exit(0); }

const cmd = String(olay.tool_input?.command ?? "");
const KURALLAR = [
  [/\bgh\s+pr\s+merge\b/, "PR merge sahibindir; ajan merge etmez"],
  [/\bgit\s+push\b[^|;&]*\s(--force|-f)\b/, "zorla push yasak; geçmiş ezilmez"],
  [/\bgit\s+push\b[^|;&]*\s(origin\s+)?(main|master)\b/, "main'e doğrudan push yasak; dal aç, PR gönder"],
  [/\bgit\s+push\b[^|;&]*\bHEAD:(main|master)\b/, "main'e doğrudan push yasak; dal aç, PR gönder"],
  [/\bgit\s+reset\s+--hard\b/, "sert reset yasak; geri dönüş noktası etiketle"],
  [/\bgit\s+branch\s+-D\s+(main|master)\b/, "main silinmez"],
  [/\bgh\s+(repo\s+delete|ruleset\s+delete)\b/, "depo ve ruleset silme sahibindir"],
  [/\bgh\s+api\b[^|;&]*--method\s+DELETE\b/, "API ile silme sahibindir"],
];

for (const [desen, sebep] of KURALLAR) {
  if (desen.test(cmd)) {
    process.stderr.write(`Komut durduruldu: ${sebep}. Komut: ${cmd}\n`);
    process.exit(2);
  }
}
process.exit(0);

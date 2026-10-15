#!/usr/bin/env node
// Commit yazarı kapısı. İki olayda çalışır:
//   SessionStart: depo düzeyinde user.name ve user.email sahibin kimliğine sabitlenir.
//   PreToolUse (Bash): git commit öncesi etkin yazar kimliği okunur; yanlışsa komut durur.
// Neden: bulut oturumunun varsayılan kimliği "Claude <noreply@anthropic.com>"
// (15.10.2026, claude.ai/code oturumunda git config --global ile görüldü).
// Tanınmayan yazarda Vercel dağıtımı sessizce BLOCKED kalır (25.09.2026).
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const EPOSTA = "hayrettin.sendil@hotmail.com.tr";
const AD = "Hayrettin SENDIL";

let olay = {};
try { olay = JSON.parse(fs.readFileSync(0, "utf8") || "{}"); } catch { process.exit(0); }

const dizin = process.env.CLAUDE_PROJECT_DIR || olay.cwd || process.cwd();
const git = (...arg) => execFileSync("git", ["-C", dizin, ...arg], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const oku = (...arg) => { try { return git(...arg); } catch { return ""; } };

if (!/hsendil\//.test(oku("remote", "get-url", "origin"))) process.exit(0);

if (olay.hook_event_name === "SessionStart") {
  const onceki = oku("config", "--local", "user.email");
  if (onceki !== EPOSTA) {
    try {
      git("config", "--local", "user.email", EPOSTA);
      git("config", "--local", "user.name", AD);
      process.stdout.write(`Commit yazarı ${AD} <${EPOSTA}> olarak sabitlendi (önceki yerel değer: ${onceki || "yok"}).\n`);
    } catch { /* depo yazılamıyorsa PreToolUse kapısı yine durdurur */ }
  }
  process.exit(0);
}

const komut = String(olay.tool_input?.command ?? "");
if (!/\bgit\b[^|;&]*\bcommit\b/.test(komut)) process.exit(0);
if (komut.includes(`GIT_AUTHOR_EMAIL=${EPOSTA}`)) process.exit(0);

const kimlik = oku("var", "GIT_AUTHOR_IDENT");
if (!kimlik.includes(`<${EPOSTA}>`)) {
  process.stderr.write(
    `Commit durduruldu: etkin yazar "${kimlik.replace(/\s\d+\s[+-]\d{4}$/, "")}". ` +
    `Beklenen ${AD} <${EPOSTA}>. Düzeltme: git config --local user.email ${EPOSTA} && git config --local user.name "${AD}"\n`
  );
  process.exit(2);
}
process.exit(0);

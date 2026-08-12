#!/usr/bin/env node
/**
 * Chain 11 — Kuyruk Bekçisi
 *
 * Neden var: Chain 4a/5a post üretip PR açıyor, yayın PR merge'i ile
 * oluyor. Kimse merge etmezse ya da yayın koşusu düşerse hat SESSİZCE
 * durur. 12.08.2026'da bu üç şekilde birden yaşandı:
 *   - PR #10 on dört gün, PR #13 yedi gün açık kaldı,
 *   - queue/x'teki 28.07 dosyası merge edildi ama hiç yayınlanmadı,
 *   - Chain 5b run #8 postu gönderdi, arşiv push'u çakışmada düştü.
 *
 * Bu betik günde bir koşar ve şunlara bakar:
 *   1) 24 saatten uzun süredir açık duran post onayı PR'ları,
 *   2) queue/* altında takılı kalmış dosyalar (yayın koşusu düşmüş demektir),
 *   3) son 24 saatte başarısız olan yayın koşuları.
 *
 * Bulgu varsa tek bir Issue açar. Temizse hiçbir şey yazmaz, çünkü her
 * gün "her şey yolunda" Issue'su açan bir bekçi okunmaz hale gelir.
 *
 * Kullanım:
 *   GITHUB_TOKEN=... GITHUB_REPOSITORY=hsendil/hs-site-team node scripts/kuyruk-bekcisi.mjs
 *   DRY_RUN=1 ...   # Issue açmadan raporu ekrana bas
 *   FORCE=1 ...     # aynı gün ikinci Issue'yu da aç (idempotansı ez)
 */

import fs from "node:fs";
import path from "node:path";

const API = "https://api.github.com";
const REPO = process.env.GITHUB_REPOSITORY;
const TOKEN = process.env.GITHUB_TOKEN;
const DRY_RUN = process.env.DRY_RUN === "1";
const FORCE = process.env.FORCE === "1";
const PR_YAS_SAAT = Number(process.env.PR_YAS_SAAT ?? 24);

const KUYRUKLAR = ["queue/x", "queue/linkedin", "queue/instagram"];
const YAYIN_AKISLARI = [
  ["chain4-x-publish.yml", "Chain 4b (X yayın)"],
  ["chain5-linkedin-publish.yml", "Chain 5b (LinkedIn yayın)"],
  ["chain9-instagram-publish.yml", "Chain 9 (Instagram yayın)"],
];
const ONAY_PR_DESENI = /^(X|LinkedIn|Instagram) postu onay/i;

async function gh(yol, secenek = {}) {
  if (!TOKEN) throw new Error("GITHUB_TOKEN tanımlı değil");
  const res = await fetch(`${API}${yol}`, {
    ...secenek,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(secenek.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`${secenek.method ?? "GET"} ${yol} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  return res.status === 204 ? null : res.json();
}

const saatFarki = (isoTarih) => (Date.now() - new Date(isoTarih).getTime()) / 36e5;
const gunSayisi = (saat) => Math.floor(saat / 24);

/** 1) Onay bekleyen bayat PR'lar */
async function bayatPrler() {
  const prler = await gh(`/repos/${REPO}/pulls?state=open&per_page=100`);
  return prler
    .filter((pr) => ONAY_PR_DESENI.test(pr.title))
    .map((pr) => ({ ...pr, yas: saatFarki(pr.created_at) }))
    .filter((pr) => pr.yas >= PR_YAS_SAAT)
    .sort((a, b) => b.yas - a.yas);
}

/**
 * 2) Kuyrukta takılı dosyalar
 *
 * Yayın koşusu bir dakikadan kısa sürer. Bekçi günde bir koştuğu için
 * kuyrukta dosya görmek "yayın düştü ya da hiç tetiklenmedi" demektir.
 */
function takiliKuyrukDosyalari() {
  const bulunan = [];
  for (const dizin of KUYRUKLAR) {
    if (!fs.existsSync(dizin)) continue;
    for (const dosya of fs.readdirSync(dizin)) {
      if (!dosya.endsWith(".json")) continue;
      const tamYol = path.join(dizin, dosya);
      let durum = "bilinmiyor";
      try {
        durum = JSON.parse(fs.readFileSync(tamYol, "utf8")).status ?? "bilinmiyor";
      } catch {
        durum = "JSON okunamadı";
      }
      // status: hold bilinçli beklemedir, bulgu sayılmaz
      if (durum === "hold") continue;
      bulunan.push({ yol: tamYol, durum });
    }
  }
  return bulunan;
}

/** 3) Son 24 saatte düşmüş yayın koşuları */
async function dusmusKosular() {
  const bulunan = [];
  for (const [dosya, ad] of YAYIN_AKISLARI) {
    let kosular;
    try {
      kosular = await gh(`/repos/${REPO}/actions/workflows/${dosya}/runs?per_page=10`);
    } catch (err) {
      bulunan.push({ ad, url: null, not: `koşu listesi alınamadı: ${err.message}` });
      continue;
    }
    for (const kosu of kosular.workflow_runs ?? []) {
      if (kosu.status !== "completed") continue;
      if (saatFarki(kosu.created_at) > 24) break;
      if (kosu.conclusion === "failure") {
        bulunan.push({ ad, url: kosu.html_url, not: `run #${kosu.run_number} düştü` });
      }
    }
  }
  return bulunan;
}

async function bugunAcilmisIssueVarMi(baslik) {
  const issuelar = await gh(`/repos/${REPO}/issues?state=open&per_page=50`);
  return issuelar.some((i) => !i.pull_request && i.title === baslik);
}

async function main() {
  if (!REPO) throw new Error("GITHUB_REPOSITORY tanımlı değil");

  const [prler, dosyalar, kosular] = await Promise.all([
    bayatPrler(),
    Promise.resolve(takiliKuyrukDosyalari()),
    dusmusKosular(),
  ]);

  const toplam = prler.length + dosyalar.length + kosular.length;
  if (toplam === 0) {
    console.log("Kuyruk temiz: bekleyen onay yok, takılı dosya yok, düşmüş koşu yok.");
    return;
  }

  const satirlar = ["Sosyal yayın hattında bekleyen iş var.", ""];

  if (prler.length) {
    satirlar.push(`## Onay bekleyen ${prler.length} post PR'ı`, "");
    satirlar.push("| PR | Başlık | Açık kalma |", "| --- | --- | --- |");
    for (const pr of prler) {
      const yas = pr.yas >= 48 ? `${gunSayisi(pr.yas)} gün` : `${Math.floor(pr.yas)} saat`;
      satirlar.push(`| #${pr.number} | ${pr.title} | ${yas} |`);
    }
    satirlar.push("", "Merge edersen yayınlanır, kapatırsan çöpe gider.", "");
  }

  if (dosyalar.length) {
    satirlar.push(`## Kuyrukta takılı ${dosyalar.length} dosya`, "");
    for (const d of dosyalar) {
      satirlar.push(`- \`${d.yol}\` (status: ${d.durum})`);
    }
    satirlar.push(
      "",
      "Bu dosyalar main'de duruyor ama yayınlanmamış. Yayın koşusu düşmüş",
      "ya da hiç tetiklenmemiş olabilir. Postun GİTMİŞ ama arşivin",
      "commit'lenememiş olma ihtimaline karşı, tekrar yayınlamadan önce",
      "hesabın akışını kontrol et.",
      ""
    );
  }

  if (kosular.length) {
    satirlar.push(`## Son 24 saatte düşmüş ${kosular.length} yayın koşusu`, "");
    for (const k of kosular) {
      satirlar.push(`- ${k.ad}: ${k.not}${k.url ? ` → ${k.url}` : ""}`);
    }
    satirlar.push("");
  }

  const govde = satirlar.join("\n");
  const baslik = `Kuyruk bekçisi — ${new Date().toISOString().slice(0, 10)}`;

  if (DRY_RUN) {
    console.log(`[DRY RUN] Issue açılacaktı: ${baslik}\n\n${govde}`);
    return;
  }

  if (!FORCE && (await bugunAcilmisIssueVarMi(baslik))) {
    console.log(`Bugünün bekçi Issue'su zaten açık: ${baslik} (FORCE=1 ile ezilir)`);
    return;
  }

  const issue = await gh(`/repos/${REPO}/issues`, {
    method: "POST",
    body: JSON.stringify({ title: baslik, body: govde }),
  });
  console.log(`Issue açıldı: ${issue.html_url}`);
}

main().catch((err) => {
  console.error(`\n✗ HATA: ${err.message ?? err}`);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Chain 5 — LinkedIn post üretici
 *
 * Blog yazısından veya bir konudan LinkedIn için TEK uzun post üretir.
 * X'ten farklı: thread yok, 1300-2200 karakter, kurumsal ton, imza bloğu.
 *
 * Yayın YAPMAZ — queue/linkedin/ altına yazar. Yayın PR merge ile olur.
 *
 * Kullanım:
 *   MODE=blog SLUG=bu-site-neden-var node scripts/linkedin-generate.mjs
 *   MODE=standalone TOPIC="Kurumsal AI eğitimi" node scripts/linkedin-generate.mjs
 *
 * Gerekli env: ANTHROPIC_API_KEY
 */

import fs from "node:fs";
import path from "node:path";

const SITE = "https://hayrettinsendil.tr";
const QUEUE_DIR = "queue/linkedin";
const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-5-20250929";
const MIN_CHARS = 900;
const TARGET_MAX = 2200;
const HARD_LIMIT = 3000;
const MAX_ATTEMPTS = 3;
const CAMPAIGN_SLUG_MAX = 24;

const SIGNATURE = "Hayrettin Şendil, PMP\nAI / Context Engineering Eğitmeni";

const BRAND_RULES = `
TON VE DİL:
- Türkçe. Birinci tekil şahıs ("yapıyorum", "gördüm", "kuruyorum").
- Muhatap: kurumsal karar verici (BT yöneticisi, dijital dönüşüm lideri).
  X'teki gibi teknik okuyucuya değil; jargonu azalt, iş sonucuna bağla.
- Övgü değil kanıt. "Sayı yoksa cümlede yer almaz" ilkesi.
- Reklam dili YASAK: "en iyi", "devrim", "10x", "çığır açan",
  "dijital geleceğinizi şekillendiren".
- LinkedIn klasiği şişirme girişlerden kaçın: "Geçen hafta bir şey oldu ve
  hayatıma bakışım değişti..." gibi yapay hikaye kurgusu KULLANMA.

BİÇİM:
- TEK post. Thread yok.
- Toplam ${MIN_CHARS}-${TARGET_MAX} karakter aralığında kal.
- Yapı: (1) hook 1-2 cümle, (2) somut gözlem/vaka, (3) 3-5 maddelik ana
  mesaj, (4) okuyucuya bir soru, (5) imza, (6) link.
- Maddeler için tire (-) kullan, bullet karakteri kullanma.
- Em-dash (—) KULLANMA.
- Emoji kullanma.
- Şu karakterleri KULLANMA (LinkedIn biçimlendirmesini bozuyor):
  parantez ( ), köşeli parantez [ ], süslü parantez { }, @ , * , _ , ~ , < , >
  Parantez yerine virgül veya iki nokta kullan.
- Hashtag 3-5 adet, en sonda, niş olsun.

ZORUNLU İMZA (link'ten önce, aynen bu iki satır):
${SIGNATURE}

KESIN YASAKLAR:
- UYDURMA VERİ YASAK. Kaynak metinde geçmeyen sayı, tarih, müşteri adı veya
  sonuç ÜRETME. Kaynakta "örnek" olarak verilen rakamları gerçek ölçüm gibi
  sunma.
- Çalıştığı kurumun adını, unvanını veya "paralel iş" bağlamını ANMA.
- Doğru rakamlar: 20+ yıl deneyim, PMP + 8 Anthropic Academy (toplam 9).
`;

function slugify(str) {
  const map = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i" };
  return str
    .toLocaleLowerCase("tr-TR")
    .replace(/[çğıöşüİ]/g, (c) => map[c] ?? c)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Kampanya adı = slug'ın kısaltılmış hali.
 * GA4 raporunda tek satırda okunsun, X tarafında 280 karakter bütçesini
 * yemesin diye CAMPAIGN_SLUG_MAX ile sınırlı. Kesim sonrası kalan tire kırpılır.
 */
function campaignSlug(str) {
  return slugify(str).slice(0, CAMPAIGN_SLUG_MAX).replace(/-+$/, "");
}

async function fetchBlogPost(slug) {
  const url = `${SITE}/blog/${slug}`;
  const res = await fetch(url, { headers: { "user-agent": "hs-site-team/chain5" } });
  if (!res.ok) throw new Error(`Blog yazısı alınamadı (${res.status}): ${url}`);
  const html = await res.text();
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1]?.trim() ?? slug;
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return { title, url, text: text.slice(0, 12000) };
}

async function callClaude(messages) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY tanımlı değil");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 2000, messages }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  const json = await res.json();
  const raw = json.content?.[0]?.text ?? "";
  // Çıktı düz metin; kod blokları gelirse soy
  const text = raw.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/, "").trim();
  return { text, raw };
}

function audit(text, sourceUrl) {
  const errors = [];
  const banned = [
    "en iyi", "devrim", "10x", "çığır aç", "geleceğinizi şekillendir",
    "oyunun kurallarını değiştir", "muhteşem", "inanılmaz",
  ];

  if (!text) return ["boş çıktı"];
  if (text.length < MIN_CHARS) errors.push(`${text.length} karakter, en az ${MIN_CHARS} olmalı`);
  if (text.length > HARD_LIMIT) errors.push(`${text.length} karakter, LinkedIn sınırı ${HARD_LIMIT}`);
  if (text.length > TARGET_MAX) errors.push(`${text.length} karakter, hedef üst sınır ${TARGET_MAX}, kısalt`);
  if (text.includes("—")) errors.push("em-dash içeriyor");

  const lower = text.toLocaleLowerCase("tr-TR");
  banned.forEach((b) => {
    if (lower.includes(b)) errors.push(`yasaklı ifade "${b}"`);
  });

  if (/viennalife/i.test(text)) errors.push("kurum adı geçiyor (editoryal kural)");

  // LinkedIn biçimlendirmesini bozan karakterler (link içindekiler hariç tutulamaz,
  // bu yüzden prompt'ta zaten yasaklandı; burada metin gövdesinde arıyoruz)
  const bodyWithoutUrl = text.replace(/https?:\/\/\S+/g, "");
  const badChars = bodyWithoutUrl.match(/[(){}\[\]@*_~<>]/g);
  if (badChars) {
    errors.push(`biçimlendirmeyi bozan karakter(ler): ${[...new Set(badChars)].join(" ")}`);
  }

  if (!text.includes("Hayrettin Şendil, PMP")) errors.push("imza bloğu eksik");
  if (sourceUrl && !text.includes(sourceUrl)) errors.push(`kaynak link eksik: ${sourceUrl}`);

  return errors;
}

async function main() {
  const mode = process.env.MODE ?? "blog";
  let source, title, sourceUrl, contextBlock;

  if (mode === "blog") {
    const slug = process.env.SLUG;
    if (!slug) throw new Error("MODE=blog için SLUG gerekli");
    const post = await fetchBlogPost(slug);
    title = post.title;
    sourceUrl = `${post.url}?utm_source=linkedin&utm_medium=social&utm_campaign=blog-${campaignSlug(slug)}`;
    source = `blog:${slug}`;
    contextBlock = `Kaynak yazı başlığı: ${post.title}\n\nKaynak yazı metni:\n${post.text}`;
  } else {
    const topic = process.env.TOPIC;
    if (!topic) throw new Error("MODE=standalone için TOPIC gerekli");
    title = topic;
    sourceUrl = `${SITE}/egitimler?utm_source=linkedin&utm_medium=social&utm_campaign=egitim-${campaignSlug(topic)}`;
    source = "standalone";
    contextBlock = `Konu: ${topic}\n\nKendi deneyiminden hareketle özgün bir post üret. Kaynak metin yok, SOMUT VERİ UYDURMA.`;
  }

  const prompt = `Sen Hayrettin Şendil'in LinkedIn profili için yazan içerik editörüsün.
Hayrettin: kurumsal yapay zeka eğitmeni, 20+ yıl BT operasyon deneyimi, PMP + 8 Anthropic Academy sertifikası.
Hedef kitle: Türkiye'deki kurumsal BT ve dijital dönüşüm liderleri.

${BRAND_RULES}

${contextBlock}

GÖREV: Yukarıdaki içerikten LinkedIn için TEK bir post yaz.
Sonuna şu linki AYNEN ekle: ${sourceUrl}

YALNIZCA post metnini döndür. Açıklama, başlık, tırnak veya kod bloğu ekleme.`;

  console.log(`→ Üretiliyor (mode=${mode}, model=${MODEL})...`);

  const messages = [{ role: "user", content: prompt }];
  let finalText = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await callClaude(messages);
    const errors = audit(result.text, sourceUrl);

    if (!errors.length) {
      finalText = result.text;
      console.log(`✓ Deneme ${attempt}: marka denetimi geçti (${finalText.length} karakter)`);
      break;
    }

    console.log(`⚠ Deneme ${attempt}: ${errors.length} ihlal`);
    errors.forEach((e) => console.log(`   - ${e}`));

    if (attempt === MAX_ATTEMPTS) {
      console.error(`\n✗ ${MAX_ATTEMPTS} denemede kurallara uyan içerik üretilemedi.`);
      console.error("Üretilen içerik kuyruğa YAZILMADI.");
      process.exit(1);
    }

    messages.push({ role: "assistant", content: result.raw });
    messages.push({
      role: "user",
      content:
        `Çıktın şu kuralları ihlal etti:\n${errors.map((e) => `- ${e}`).join("\n")}\n\n` +
        `Bunları düzelt. YALNIZCA düzeltilmiş post metnini döndür.`,
    });
  }

  const date = new Date().toISOString().slice(0, 10);
  const slug = slugify(mode === "blog" ? process.env.SLUG : process.env.TOPIC);
  const file = path.join(QUEUE_DIR, `${date}-${slug}.json`);

  fs.mkdirSync(QUEUE_DIR, { recursive: true });
  fs.writeFileSync(
    file,
    JSON.stringify(
      {
        id: `${date}-${slug}`,
        platform: "linkedin",
        source,
        title,
        sourceUrl,
        status: "pending",
        createdAt: new Date().toISOString(),
        model: MODEL,
        text: finalText,
      },
      null,
      2
    ) + "\n"
  );

  console.log(`\n✓ Kuyruğa yazıldı: ${file}`);
  console.log(`\n--- ÖNİZLEME (${finalText.length} karakter) ---\n${finalText}\n---`);

  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `queue_file=${file}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `char_count=${finalText.length}\n`);
  }
}

main().catch((err) => {
  console.error(`\n✗ HATA: ${err.message ?? err}`);
  process.exit(1);
});

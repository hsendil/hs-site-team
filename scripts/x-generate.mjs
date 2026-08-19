#!/usr/bin/env node
/**
 * Chain 4 — X post üretici
 *
 * Blog yazısından veya bağımsız bir konudan X thread'i üretir ve kuyruğa yazar.
 * Yayın YAPMAZ — yalnız queue/x/ altına dosya bırakır. Yayın, PR merge
 * edildikten sonra x-post.mjs tarafından yapılır (denetimli otonomi).
 *
 * Kullanım:
 *   MODE=blog SLUG=kisisel-siteyi-6-ajanli-takim-nasil-yonetir node scripts/x-generate.mjs
 *   MODE=standalone TOPIC="Context engineering nedir" node scripts/x-generate.mjs
 *
 * Gerekli env: ANTHROPIC_API_KEY
 */

import fs from "node:fs";
import path from "node:path";

const SITE = "https://hayrettinsendil.tr";
const QUEUE_DIR = "queue/x";
const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-5-20250929";
const TWEET_LIMIT = 280;
const MAX_ATTEMPTS = 3;
const CAMPAIGN_SLUG_MAX = 24;

// Marka kuralları — kaynak: skills/hs-site-po/shared/brand.md + sahip editoryal kararları
const BRAND_RULES = `
TON VE DİL:
- Türkçe. Birinci tekil şahıs ("yapıyorum", "kuruyorum", "gördüm").
- Samimi ama profesyonel. Akademik dil ve kurumsal jargon yasak.
- Övgü değil kanıt. "Sayı yoksa cümlede yer almaz" ilkesi: her iddia ya
  ölçülebilir bir veriye dayanır ya da iddia edilmez.
- Reklam dili YASAK: "en iyi", "devrim", "10x", "geçmişi değiştiren",
  "dijital geleceğinizi şekillendiren" gibi ifadeler kullanılmaz.

BİÇİM VE UZUNLUK (en sık ihlal edilen kural — dikkat et):
- Her tweet KESİNLİKLE en fazla ${TWEET_LIMIT} karakter.
- HEDEF: her tweet 240-260 karakter aralığında kalsın. Böylece sınıra
  yaklaşmadan güvenli alan bırakırsın.
- Link içeren tweet için linke 30 karakter rezerv ayır; kalan metin en fazla
  230 karakter olmalı.
- Yazdıktan sonra HER tweet'in karakterlerini tek tek say ve kontrol et.
- Em-dash (—) KULLANMA. Yerine nokta, virgül veya iki nokta kullan.
- Emoji kullanma.
- Thread 3-6 tweet. Tek post yeterliyse 1 tweet.
- Hashtag en fazla 2 adet ve yalnız son tweet'te. Niş olsun
  (örn. #ContextEngineering), genel olmasın (#ai #teknoloji gibi değil).

KESIN YASAKLAR:
- UYDURMA VERİ YASAK. Kaynak metinde geçmeyen sayı, tarih, müşteri adı,
  vaka veya sonuç ÜRETME. Emin değilsen sayı kullanma.
- Çalıştığı kurumun adını, unvanını veya "paralel iş" bağlamını ANMA.
  Bu site bağımsız bir eğitmen markasıdır.
- Sertifika sayısı hakkında konuşacaksan doğrusu: PMP + 8 Anthropic Academy
  sertifikası (toplam 9).
- Deneyim süresi: "20+ yıl". Başka bir rakam yazma.
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
 * X'te link son tweet'in 280 karakter bütçesine dahil ve audit ham karakter
 * sayıyor; bu yüzden kampanya CAMPAIGN_SLUG_MAX ile sınırlı. Kesim sonrası
 * kalan tire kırpılır.
 */
function campaignSlug(str) {
  return slugify(str).slice(0, CAMPAIGN_SLUG_MAX).replace(/-+$/, "");
}

async function fetchBlogPost(slug) {
  const url = `${SITE}/blog/${slug}`;
  const res = await fetch(url, { headers: { "user-agent": "hs-site-team/chain4" } });
  if (!res.ok) throw new Error(`Blog yazısı alınamadı (${res.status}): ${url}`);
  const html = await res.text();

  const title = html.match(/<title>([^<]+)<\/title>/)?.[1]?.trim() ?? slug;
  // Kaba metin çıkarımı: script/style at, etiketleri soy, boşlukları sadeleştir
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { title, url, text: text.slice(0, 12000) };
}

/** Anthropic API çağrısı — mesaj geçmişi taşır (düzeltme döngüsü için) */
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
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error(`Yanıtta JSON dizi bulunamadı:\n${raw.slice(0, 400)}`);
  return { tweets: JSON.parse(match[0]), raw };
}

/** Marka denetimi — ihlal varsa kuyruğa hiç yazılmaz */
function audit(tweets, sourceUrl) {
  const banned = [
    "en iyi", "devrim", "10x", "muhteşem", "inanılmaz", "efsane",
    "geleceğinizi şekillendir", "çığır aç", "oyunun kurallarını değiştir",
  ];
  const errors = [];

  if (!Array.isArray(tweets) || !tweets.length) {
    return ["hiç tweet üretilmedi"];
  }
  if (tweets.length > 8) errors.push(`${tweets.length} tweet çok uzun (max 8)`);

  tweets.forEach((t, i) => {
    const n = i + 1;
    if (typeof t !== "string" || !t.trim()) return errors.push(`tweet ${n}: boş`);
    if (t.length > TWEET_LIMIT) {
      errors.push(
        `tweet ${n}: ${t.length} karakter, limit ${TWEET_LIMIT}. ` +
          `${t.length - TWEET_LIMIT} karakter fazla, kısalt.`
      );
    }
    if (t.includes("—")) errors.push(`tweet ${n}: em-dash içeriyor, kaldır`);
    const lower = t.toLocaleLowerCase("tr-TR");
    banned.forEach((b) => {
      if (lower.includes(b)) errors.push(`tweet ${n}: yasaklı ifade "${b}"`);
    });
    if (/viennalife/i.test(t)) errors.push(`tweet ${n}: kurum adı geçiyor (editoryal kural)`);
  });

  // Link son tweet'te olmalı (trafik yönlendirmesi bu akışın asıl amacı)
  if (sourceUrl && !tweets.some((t) => typeof t === "string" && t.includes(sourceUrl))) {
    errors.push(`son tweet'te kaynak link eksik: ${sourceUrl}`);
  }

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
    sourceUrl = `${post.url}?utm_source=x&utm_medium=social&utm_campaign=blog-${campaignSlug(slug)}`;
    source = `blog:${slug}`;
    contextBlock = `Kaynak yazı başlığı: ${post.title}\n\nKaynak yazı metni:\n${post.text}`;
  } else {
    const topic = process.env.TOPIC;
    if (!topic) throw new Error("MODE=standalone için TOPIC gerekli");
    title = topic;
    sourceUrl = `${SITE}/egitimler?utm_source=x&utm_medium=social&utm_campaign=egitim-${campaignSlug(topic)}`;
    source = "standalone";
    contextBlock = `Konu: ${topic}\n\nBu konuda kendi deneyimimden hareketle özgün bir post üret. Kaynak metin yok, bu yüzden SOMUT VERİ UYDURMA. Prensip ve gözlem düzeyinde kal.`;
  }

  const prompt = `Sen Hayrettin Şendil'in X hesabı (@HayrettinAi) için yazan sosyal medya editörüsün.
Hayrettin: kurumsal yapay zeka eğitmeni, 20+ yıl BT operasyon deneyimi, PMP + 8 Anthropic Academy sertifikası.
Hedef kitle: Türkçe konuşan kurumsal BT liderleri ve teknik profesyoneller.

${BRAND_RULES}

${contextBlock}

GÖREV: Yukarıdaki içerikten X için bir thread üret.
- İlk tweet dikkat çekmeli ve tek başına anlamlı olmalı (hook).
- Ortadaki tweet'ler somut fikir/örnek taşımalı.
- SON tweet'e şu linki AYNEN ekle: ${sourceUrl}
- Link, son tweet'in karakter sayısına dahildir.

YALNIZCA bir JSON dizisi döndür, başka açıklama yazma. Örnek biçim:
["ilk tweet metni", "ikinci tweet metni", "son tweet metni + link"]`;

  console.log(`→ Üretiliyor (mode=${mode}, model=${MODEL})...`);

  const messages = [{ role: "user", content: prompt }];
  let tweets = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = await callClaude(messages);
    const errors = audit(result.tweets, sourceUrl);

    if (!errors.length) {
      tweets = result.tweets;
      console.log(`✓ Deneme ${attempt}: marka denetimi geçti`);
      break;
    }

    console.log(`⚠ Deneme ${attempt}: ${errors.length} ihlal`);
    errors.forEach((e) => console.log(`   - ${e}`));

    if (attempt === MAX_ATTEMPTS) {
      console.error(
        `\n✗ ${MAX_ATTEMPTS} denemede marka kurallarına uyan içerik üretilemedi.`
      );
      console.error("Üretilen içerik kuyruğa YAZILMADI.");
      process.exit(1);
    }

    // İhlalleri modele geri besle ve düzeltme iste
    messages.push({ role: "assistant", content: result.raw });
    messages.push({
      role: "user",
      content:
        `Çıktın şu kuralları ihlal etti:\n${errors.map((e) => `- ${e}`).join("\n")}\n\n` +
        `Bunları düzelt. Karakter sınırını aşan tweet'leri anlamını koruyarak kısalt; ` +
        `gerekirse bir tweet'i ikiye böl. Hedef: her tweet 240-260 karakter.\n\n` +
        `YALNIZCA düzeltilmiş JSON dizisini döndür, açıklama yazma.`,
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
        platform: "x",
        source,
        title,
        sourceUrl,
        status: "pending",
        createdAt: new Date().toISOString(),
        model: MODEL,
        tweets,
      },
      null,
      2
    ) + "\n"
  );

  console.log(`\n✓ Kuyruğa yazıldı: ${file} (${tweets.length} tweet)`);
  tweets.forEach((t, i) => console.log(`\n[${i + 1}] (${t.length} kr)\n${t}`));

  // Workflow PR gövdesinde kullanır
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `queue_file=${file}\n`);
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `tweet_count=${tweets.length}\n`);
  }
}

main().catch((err) => {
  console.error(`\n✗ HATA: ${err.message ?? err}`);
  process.exit(1);
});

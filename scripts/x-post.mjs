#!/usr/bin/env node
/**
 * Chain 4 — X (Twitter) yayın motoru
 *
 * Kuyruktaki onaylanmış post dosyalarını X API v2 ile yayınlar.
 * Bağımlılık yok: OAuth 1.0a imzalama Node crypto ile yapılır.
 *
 * Neden OAuth 1.0a? X'te kullanıcı erişim anahtarları süresizdir; OAuth 2.0
 * refresh döngüsü gerektirir. Tek hesabına post atan bir bot için 1.0a hem
 * daha basit hem bakımsızdır.
 *
 * Kullanım:
 *   node scripts/x-post.mjs                 # queue/x/*.json → yayınla
 *   DRY_RUN=1 node scripts/x-post.mjs       # istek atmadan doğrula
 *
 * Gerekli env:
 *   X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const QUEUE_DIR = "queue/x";
const PUBLISHED_DIR = "published/x";
const API_URL = "https://api.x.com/2/tweets";
const MAX_TWEETS = Number(process.env.MAX_TWEETS ?? 10);
const DRY_RUN = process.env.DRY_RUN === "1";
const TWEET_LIMIT = 280;

// —— OAuth 1.0a ——

/** RFC 3986 yüzde kodlama (encodeURIComponent yeterli değil: !*'() kaçışmaz) */
function pct(str) {
  return encodeURIComponent(str).replace(
    /[!*'()]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase()
  );
}

function authHeader({ url, method, consumerKey, consumerSecret, token, tokenSecret }) {
  const oauth = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: token,
    oauth_version: "1.0",
  };

  // JSON gövdeli isteklerde gövde imzaya DÂHİL DEĞİLDİR — yalnız oauth_*
  // (ve varsa query) parametreleri imzalanır.
  const paramString = Object.keys(oauth)
    .sort()
    .map((k) => `${pct(k)}=${pct(oauth[k])}`)
    .join("&");

  const baseString = [method.toUpperCase(), pct(url), pct(paramString)].join("&");
  const signingKey = `${pct(consumerSecret)}&${pct(tokenSecret)}`;
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");

  const all = { ...oauth, oauth_signature: signature };
  return (
    "OAuth " +
    Object.keys(all)
      .sort()
      .map((k) => `${pct(k)}="${pct(all[k])}"`)
      .join(", ")
  );
}

// —— X API ——

async function postTweet(text, replyToId) {
  const creds = {
    consumerKey: process.env.X_API_KEY,
    consumerSecret: process.env.X_API_SECRET,
    token: process.env.X_ACCESS_TOKEN,
    tokenSecret: process.env.X_ACCESS_SECRET,
  };
  for (const [k, v] of Object.entries(creds)) {
    if (!v) throw new Error(`Eksik kimlik bilgisi: ${k}`);
  }

  const body = { text };
  if (replyToId) body.reply = { in_reply_to_tweet_id: replyToId };

  if (DRY_RUN) {
    console.log(`   [DRY RUN] ${text.length} karakter${replyToId ? ` (yanıt → ${replyToId})` : ""}`);
    return { id: `dryrun_${crypto.randomBytes(4).toString("hex")}` };
  }

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: authHeader({ url: API_URL, method: "POST", ...creds }),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await res.text();
  if (!res.ok) {
    throw new Error(`X API ${res.status}: ${payload.slice(0, 500)}`);
  }
  const json = JSON.parse(payload);
  if (!json?.data?.id) throw new Error(`Beklenmeyen yanıt: ${payload.slice(0, 300)}`);
  return json.data;
}

// —— Kuyruk işleme ——

function validate(item, file) {
  const errors = [];
  if (!Array.isArray(item.tweets) || item.tweets.length === 0) {
    errors.push("tweets boş veya dizi değil");
  }
  (item.tweets ?? []).forEach((t, i) => {
    if (typeof t !== "string" || !t.trim()) errors.push(`tweet ${i + 1} boş`);
    // X, URL'leri 23 karaktere kısaltır; muhafazakar sayım için ham uzunluğa bakıyoruz
    else if (t.length > TWEET_LIMIT) errors.push(`tweet ${i + 1} ${t.length} karakter (limit ${TWEET_LIMIT})`);
    else if (t.includes("—")) errors.push(`tweet ${i + 1} em-dash içeriyor (marka kuralı)`);
  });
  if (errors.length) {
    throw new Error(`${file} geçersiz:\n   - ${errors.join("\n   - ")}`);
  }
}

async function main() {
  if (!fs.existsSync(QUEUE_DIR)) {
    console.log("Kuyruk klasörü yok, yapılacak iş yok.");
    return;
  }
  const files = fs
    .readdirSync(QUEUE_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();

  if (files.length === 0) {
    console.log("Kuyruk boş, yapılacak iş yok.");
    return;
  }

  fs.mkdirSync(PUBLISHED_DIR, { recursive: true });
  let sent = 0;

  for (const file of files) {
    const full = path.join(QUEUE_DIR, file);
    const item = JSON.parse(fs.readFileSync(full, "utf8"));

    if (item.status === "hold") {
      console.log(`⏸  ${file} — status: hold, atlandı`);
      continue;
    }
    validate(item, file);

    // Idempotans: kısmen gönderilmişse kaldığı yerden devam eder
    const postedIds = item.postedIds ?? [];
    const startIndex = postedIds.length;
    if (startIndex >= item.tweets.length) {
      console.log(`✓  ${file} zaten tamamen yayınlanmış, taşınıyor`);
    } else {
      console.log(`→  ${file} (${item.tweets.length} tweet, ${startIndex}. sıradan devam)`);
      let replyTo = postedIds[postedIds.length - 1] ?? null;

      for (let i = startIndex; i < item.tweets.length; i++) {
        if (sent >= MAX_TWEETS) {
          console.log(`⚠  MAX_TWEETS (${MAX_TWEETS}) sınırına ulaşıldı, kalanı sonraki çalıştırmaya bırakıldı`);
          item.postedIds = postedIds;
          fs.writeFileSync(full, JSON.stringify(item, null, 2) + "\n");
          return;
        }
        try {
          const data = await postTweet(item.tweets[i], replyTo);
          postedIds.push(data.id);
          replyTo = data.id;
          sent++;
          console.log(`   ✓ ${i + 1}/${item.tweets.length} → ${data.id}`);
        } catch (err) {
          // Kısmi başarıyı diske yaz — yeniden çalıştırmada tekrar atılmasın
          item.postedIds = postedIds;
          item.lastError = String(err.message ?? err);
          fs.writeFileSync(full, JSON.stringify(item, null, 2) + "\n");
          throw err;
        }
        // Nazik hız: zincir tweet'leri arasında kısa bekleme
        if (i < item.tweets.length - 1 && !DRY_RUN) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      item.postedIds = postedIds;
    }

    item.status = DRY_RUN ? "dryrun" : "published";
    item.publishedAt = new Date().toISOString();
    item.url = postedIds[0]
      ? `https://x.com/HayrettinAi/status/${postedIds[0]}`
      : null;
    delete item.lastError;

    if (DRY_RUN) {
      console.log(`   [DRY RUN] ${file} taşınmadı`);
      continue;
    }
    fs.writeFileSync(
      path.join(PUBLISHED_DIR, file),
      JSON.stringify(item, null, 2) + "\n"
    );
    fs.unlinkSync(full);
    console.log(`   → yayınlandı: ${item.url}`);
  }

  console.log(`\nBitti. ${sent} tweet gönderildi.`);
}

main().catch((err) => {
  console.error(`\n✗ HATA: ${err.message ?? err}`);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Chain 9 — Instagram yayın motoru
 *
 * queue/instagram/ altındaki onaylanmış postları Instagram'a gönderir.
 * Bağımlılık yok. LinkedIn'den farklı olarak yayın İKİ ADIMLIDIR:
 *   1) media container oluştur  (POST /<IG_ID>/media)
 *   2) container hazır olunca yayınla (POST /<IG_ID>/media_publish)
 *
 * Kullanım:
 *   node scripts/instagram-post.mjs
 *   DRY_RUN=1 node scripts/instagram-post.mjs
 *
 * Gerekli env: INSTAGRAM_ACCESS_TOKEN
 *
 * Sürüm notu: Meta Graph sürümleri (vXX.0) yaklaşık 2 yıl desteklenir,
 * sonra emekli edilir. Sürüm hatası görülürse INSTAGRAM_API_VERSION ile
 * ez, kalıcı düzeltme için buradaki varsayılanı güncelle:
 * https://developers.facebook.com/docs/graph-api/changelog
 *
 * Kısıtlar (Meta belgesinden, 08.08.2026):
 *   - Görsel YALNIZ JPEG. PNG reddedilir.
 *   - Görsel herkese açık bir URL'de olmalı; Meta cURL ile çeker.
 *   - Hesap Instagram Professional (Business) olmalı.
 *   - 24 saatte en fazla 100 yayın.
 */

import fs from "node:fs";
import path from "node:path";

const QUEUE_DIR = "queue/instagram";
const PUBLISHED_DIR = "published/instagram";
const API_VERSION = process.env.INSTAGRAM_API_VERSION ?? "v25.0";
const HOST = "https://graph.instagram.com";
const DRY_RUN = process.env.DRY_RUN === "1";

const CAPTION_LIMIT = 2200;
const HASHTAG_LIMIT = 30;
const ALT_TEXT_LIMIT = 1000;

// Container hazır olana kadar bekleme: dakikada bir, en fazla 5 kez.
// Meta'nın önerdiği ritim bu; daha sık sormak kotayı boşuna yakar.
const POLL_INTERVAL_MS = 60_000;
const POLL_MAX_ATTEMPTS = 5;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Token sahibinin Instagram hesabını keşfet — sabit ID saklamak yerine her koşuda sor */
async function resolveAccount(token) {
  const url = `${HOST}/${API_VERSION}/me?fields=id,username&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      "Instagram 401/403: token geçersiz veya süresi dolmuş. " +
        "Meta uygulamasından yeni uzun ömürlü token üret ve " +
        "INSTAGRAM_ACCESS_TOKEN secret'ını güncelle."
    );
  }
  if (!res.ok) {
    throw new Error(`me ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const json = await res.json();
  if (!json.id) {
    throw new Error(`me yanıtında 'id' yok: ${JSON.stringify(json).slice(0, 200)}`);
  }
  return { id: json.id, username: json.username ?? "(kullanıcı adı yok)" };
}

/** Adım 1: medya kabı oluştur */
async function createContainer(token, igId, item) {
  const body = new URLSearchParams({
    image_url: item.imageUrl,
    caption: item.caption,
    access_token: token,
  });
  if (item.altText) body.set("alt_text", item.altText);

  const res = await fetch(`${HOST}/${API_VERSION}/${igId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 500);
    // En sık görülen hata: görsel URL'ine erişilemiyor ya da JPEG değil
    throw new Error(`container oluşturulamadı (${res.status}): ${detail}`);
  }

  const json = await res.json();
  if (!json.id) throw new Error(`container yanıtında 'id' yok: ${JSON.stringify(json).slice(0, 200)}`);
  return json.id;
}

/** Adım 2: kap hazır mı diye bekle. FINISHED gelmeden yayınlanamaz. */
async function waitForContainer(token, containerId) {
  for (let attempt = 1; attempt <= POLL_MAX_ATTEMPTS; attempt++) {
    const url = `${HOST}/${API_VERSION}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`durum sorgusu ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }

    const { status_code: code, status } = await res.json();

    if (code === "FINISHED") return;
    if (code === "ERROR") throw new Error(`container işlenemedi: ${status ?? "ayrıntı yok"}`);
    if (code === "EXPIRED") throw new Error("container 24 saat içinde yayınlanmadı ve düştü");

    console.log(`   ... ${code} (${attempt}/${POLL_MAX_ATTEMPTS})`);
    if (attempt < POLL_MAX_ATTEMPTS) await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(
    `container ${POLL_MAX_ATTEMPTS} denemede hazır olmadı. ` +
      "Kuyruk dosyası duruyor, bir sonraki koşuda yeniden denenir."
  );
}

/** Adım 3: yayınla */
async function publishContainer(token, igId, containerId) {
  const body = new URLSearchParams({ creation_id: containerId, access_token: token });

  const res = await fetch(`${HOST}/${API_VERSION}/${igId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`yayınlanamadı (${res.status}): ${(await res.text()).slice(0, 500)}`);
  }

  const json = await res.json();
  if (!json.id) throw new Error(`yayın yanıtında 'id' yok: ${JSON.stringify(json).slice(0, 200)}`);
  return json.id;
}

function validate(item, file) {
  const errors = [];

  if (typeof item.caption !== "string" || !item.caption.trim()) {
    errors.push("caption boş");
  } else {
    if (item.caption.length > CAPTION_LIMIT) {
      errors.push(`caption ${item.caption.length} karakter (limit ${CAPTION_LIMIT})`);
    }
    // Marka kuralı: em-dash tüm çıktılarda yasak
    if (item.caption.includes("—")) errors.push("caption em-dash içeriyor (marka kuralı)");
    const hashtags = item.caption.match(/#\w+/g) ?? [];
    if (hashtags.length > HASHTAG_LIMIT) {
      errors.push(`${hashtags.length} hashtag (limit ${HASHTAG_LIMIT})`);
    }
  }

  if (typeof item.imageUrl !== "string" || !item.imageUrl.trim()) {
    errors.push("imageUrl boş");
  } else {
    if (!item.imageUrl.startsWith("https://")) {
      errors.push("imageUrl https ile başlamalı (Meta görseli dışarıdan çeker)");
    }
    // Meta yalnız JPEG kabul ediyor; PNG sessizce değil, hata ile döner
    if (!/\.jpe?g(\?|$)/i.test(item.imageUrl)) {
      errors.push("imageUrl .jpg veya .jpeg olmalı (Instagram API PNG kabul etmiyor)");
    }
  }

  if (item.altText && item.altText.length > ALT_TEXT_LIMIT) {
    errors.push(`altText ${item.altText.length} karakter (limit ${ALT_TEXT_LIMIT})`);
  }

  if (errors.length) {
    throw new Error(`${file} geçersiz:\n   - ${errors.join("\n   - ")}`);
  }
}

async function main() {
  // Token doğrulaması kuyruk kontrolünden ÖNCE yapılır.
  // Gerekçe: ilk koşuda kuyruk boştu, script token'a hiç bakmadan çıktı ve
  // yeşil döndü. Yeşil koşu hiçbir şey kanıtlamıyordu. Zincirin ayakta olduğu
  // her koşuda kanıtlanmalı, kuyruk dolu olsun ya da olmasın.
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) throw new Error("INSTAGRAM_ACCESS_TOKEN tanımlı değil");

  const account = await resolveAccount(token);
  console.log(`✓ Token geçerli — hesap: @${account.username} (id ${account.id})`);

  if (!fs.existsSync(QUEUE_DIR)) {
    console.log("Kuyruk klasörü yok, yapılacak iş yok.");
    return;
  }
  const files = fs.readdirSync(QUEUE_DIR).filter((f) => f.endsWith(".json")).sort();
  if (!files.length) {
    console.log("Kuyruk boş, yapılacak iş yok.");
    return;
  }

  fs.mkdirSync(PUBLISHED_DIR, { recursive: true });

  for (const file of files) {
    const full = path.join(QUEUE_DIR, file);
    const item = JSON.parse(fs.readFileSync(full, "utf8"));

    if (item.status === "hold") {
      console.log(`⏸  ${file} — status: hold, atlandı`);
      continue;
    }
    validate(item, file);

    if (item.postedId) {
      // Idempotans: önceki koşuda yayınlanmış, yalnız arşive taşı
      console.log(`✓  ${file} zaten yayınlanmış (${item.postedId}), taşınıyor`);
    } else if (DRY_RUN) {
      console.log(`→  ${file} (${item.caption.length} karakter)`);
      console.log(`   [DRY RUN] görsel: ${item.imageUrl}`);
      console.log("   [DRY RUN] container oluşturulmadı, yayın yapılmadı");
      continue;
    } else {
      console.log(`→  ${file} (${item.caption.length} karakter)`);

      const containerId = await createContainer(token, account.id, item);
      console.log(`   container: ${containerId}`);

      await waitForContainer(token, containerId);

      item.postedId = await publishContainer(token, account.id, containerId);
      console.log(`   ✓ ${item.postedId}`);
    }

    item.status = "published";
    item.publishedAt = new Date().toISOString();
    item.url = `https://www.instagram.com/p/${item.postedId}/`;

    fs.writeFileSync(path.join(PUBLISHED_DIR, file), JSON.stringify(item, null, 2) + "\n");
    fs.unlinkSync(full);
    console.log(`   → yayınlandı: ${item.url}`);
  }

  console.log("\nBitti.");
}

main().catch((err) => {
  console.error(`\n✗ HATA: ${err.message ?? err}`);
  process.exit(1);
});

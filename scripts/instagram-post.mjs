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
 *   - Görsel ve video herkese açık bir URL'de olmalı; Meta cURL ile çeker.
 *   - Hesap Instagram Professional (Business) olmalı.
 *   - 24 saatte en fazla 100 yayın.
 *
 * Video/Reels (11.08.2026 eklendi):
 *   - Kuyruk kaydında imageUrl YERİNE videoUrl verilir; media_type=REELS
 *     ile yayınlanır (feed'de de görünür, share_to_feed varsayılan açık).
 *   - MP4 önerilir. Video işleme görselden uzun sürer; bekleme videoda
 *     daha uzun tutulur. coverUrl (JPEG) opsiyonel kapak karesidir.
 *
 * Karusel (19.08.2026 eklendi):
 *   - Kuyruk kaydında `images` dizisi verilir (2-10 görsel). Yayın ÜÇ adımlı:
 *     her görsel için is_carousel_item=true bir alt container, sonra
 *     media_type=CAROUSEL bir ana container (children + caption), sonra yayın.
 *   - Caption yalnız ana container'a yazılır; alt container'lara caption
 *     verilmez, Meta yok sayar ve karışıklık üretir.
 *   - Meta tüm kartları İLK KARTIN oranına göre kırpar. Bu yüzden set
 *     içindeki tüm görseller aynı ölçüde üretilmelidir (bizde 1080x1350).
 *   - Karusel tek yayın sayılır (günlük kotada 1).
 *   Kaynak: developers.facebook.com/docs/instagram-platform/content-publishing
 *
 * Kalıcı adres (20.08.2026 düzeltmesi):
 *   - Yayın adresi ARTIK medya kimliğinden kurulmuyor. Kimlikle kurulan
 *     https://www.instagram.com/p/<media-id>/ adresi 404 verir; Instagram
 *     kalıcı adresi kısa koddan üretiyor ve yalnız `permalink` alanında
 *     döndürüyor. Yayından sonra bu alan ayrıca sorulur.
 *   - Kök neden kaydı: üç arşiv kaydı bozuk adres taşıdı ve hiçbiri
 *     açılmadı. Kayıt "published" diyordu, adres 404 veriyordu. Yayın
 *     kaydının doğru görünmesi, adresin çalıştığını kanıtlamaz.
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
const CAROUSEL_MIN = 2;
const CAROUSEL_MAX = 10;

// Container hazır olana kadar bekleme: dakikada bir.
// Görselde 5 deneme yeter; video işleme uzun sürer, 15 denemeye çıkar.
// Workflow timeout 20 dk; 15 x 1 dk bu sınırın içinde kalır.
const POLL_INTERVAL_MS = 60_000;
const POLL_MAX_ATTEMPTS_IMAGE = 5;
const POLL_MAX_ATTEMPTS_VIDEO = 15;

// Kalıcı adres yayından hemen sonra bazen boş dönüyor; kısa aralıkla denenir.
const PERMALINK_ATTEMPTS = 3;
const PERMALINK_RETRY_MS = 5_000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Karusel görsellerini tek biçime indirger.
 * İki yazım da kabul edilir, çünkü elle düzenlenen kuyruk dosyasında
 * düz URL listesi daha okunaklı, alt metin gerektiğinde nesne şart:
 *   "images": ["https://.../01.jpg", "https://.../02.jpg"]
 *   "images": [{ "url": "https://.../01.jpg", "altText": "..." }]
 */
function normalizeImages(item) {
  if (!Array.isArray(item.images)) return null;
  return item.images.map((entry) =>
    typeof entry === "string" ? { url: entry } : { url: entry?.url, altText: entry?.altText }
  );
}

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

/**
 * Kalıcı adresi Meta'dan sorar.
 *
 * Medya kimliği ile adres KURULMAZ. Instagram kalıcı adresi kısa koddan
 * üretiyor; kimlikten kurulan adres 404 verir. Tek doğru kaynak permalink
 * alanıdır.
 *
 * Alınamazsa null döner ve çağıran tarafta url boş bırakılır. Yanlış adres,
 * adres yokluğundan daha zararlı: kayıt doğru görünür, bağlantı ölüdür.
 */
async function fetchPermalink(token, mediaId) {
  for (let attempt = 1; attempt <= PERMALINK_ATTEMPTS; attempt++) {
    const url = `${HOST}/${API_VERSION}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url);

    if (res.ok) {
      const json = await res.json();
      if (json.permalink) return json.permalink;
    } else if (attempt === PERMALINK_ATTEMPTS) {
      console.warn(`   ! permalink sorgusu ${res.status}: ${(await res.text()).slice(0, 200)}`);
    }

    if (attempt < PERMALINK_ATTEMPTS) await sleep(PERMALINK_RETRY_MS);
  }
  return null;
}

/**
 * Arşivdeki bozuk adresleri onarır.
 *
 * Kimlikten kurulmuş eski kayıtları (url içinde postedId geçiyorsa) gerçek
 * permalink ile değiştirir. Her koşuda çalışır; geçmiş kayıtlar kendiliğinden
 * düzelir, elle müdahale gerekmez. Zaten doğru olan kayda dokunmaz.
 */
async function repairPermalinks(token) {
  if (!fs.existsSync(PUBLISHED_DIR)) return;

  const files = fs.readdirSync(PUBLISHED_DIR).filter((f) => f.endsWith(".json")).sort();
  let repaired = 0;

  for (const file of files) {
    const full = path.join(PUBLISHED_DIR, file);
    const item = JSON.parse(fs.readFileSync(full, "utf8"));
    if (!item.postedId) continue;

    // Onarım yalnız kimlikten kurulmuş ya da hiç olmayan adres için.
    const kimliktenKurulmus = typeof item.url === "string" && item.url.includes(`/${item.postedId}/`);
    if (item.url && !kimliktenKurulmus) continue;

    const permalink = await fetchPermalink(token, item.postedId);
    if (!permalink) {
      console.warn(`   ! ${file} onarılamadı, adres alınamadı`);
      continue;
    }
    if (permalink === item.url) continue;

    console.log(`   onarıldı: ${file}`);
    console.log(`     eski: ${item.url ?? "(yok)"}`);
    console.log(`     yeni: ${permalink}`);
    item.url = permalink;
    fs.writeFileSync(full, JSON.stringify(item, null, 2) + "\n");
    repaired++;
  }

  if (repaired) console.log(`✓ ${repaired} arşiv kaydının adresi onarıldı`);
}

/** /media çağrısının ortak sarmalayıcısı; hata mesajını olduğu gibi yukarı taşır */
async function postMedia(token, igId, body, label) {
  const res = await fetch(`${HOST}/${API_VERSION}/${igId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const detail = (await res.text()).slice(0, 500);
    // En sık görülen hata: medya URL'ine erişilemiyor ya da format reddedildi
    throw new Error(`${label} oluşturulamadı (${res.status}): ${detail}`);
  }

  const json = await res.json();
  if (!json.id) throw new Error(`${label} yanıtında 'id' yok: ${JSON.stringify(json).slice(0, 200)}`);
  return json.id;
}

/** Adım 1: medya kabı oluştur (görsel veya Reels) */
async function createContainer(token, igId, item) {
  const body = new URLSearchParams({ caption: item.caption, access_token: token });

  if (item.videoUrl) {
    body.set("media_type", "REELS");
    body.set("video_url", item.videoUrl);
    if (item.coverUrl) body.set("cover_url", item.coverUrl);
  } else {
    body.set("image_url", item.imageUrl);
    if (item.altText) body.set("alt_text", item.altText);
  }

  return postMedia(token, igId, body, "container");
}

/**
 * Karusel adım 1: her kart için alt container.
 * Sıra korunur; Instagram kartları children dizisindeki sırayla gösterir,
 * bu yüzden dosya adlarındaki sıralama kuyruk kaydında da korunmalıdır.
 */
async function createCarouselChildren(token, igId, images) {
  const ids = [];
  for (const [index, image] of images.entries()) {
    const body = new URLSearchParams({
      image_url: image.url,
      is_carousel_item: "true",
      access_token: token,
    });
    if (image.altText) body.set("alt_text", image.altText);

    const id = await postMedia(token, igId, body, `kart ${index + 1} container'ı`);
    console.log(`   kart ${index + 1}/${images.length}: ${id}`);
    ids.push(id);
  }
  return ids;
}

/** Karusel adım 2: kartları tek gönderide toplayan ana container. Caption burada verilir. */
async function createCarouselContainer(token, igId, item, childIds) {
  const body = new URLSearchParams({
    media_type: "CAROUSEL",
    children: childIds.join(","),
    caption: item.caption,
    access_token: token,
  });
  return postMedia(token, igId, body, "karusel container'ı");
}

/** Adım 2: kap hazır mı diye bekle. FINISHED gelmeden yayınlanamaz. */
async function waitForContainer(token, containerId, maxAttempts) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const url = `${HOST}/${API_VERSION}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`durum sorgusu ${res.status}: ${(await res.text()).slice(0, 300)}`);
    }

    const { status_code: code, status } = await res.json();

    if (code === "FINISHED") return;
    if (code === "ERROR") throw new Error(`container işlenemedi: ${status ?? "ayrıntı yok"}`);
    if (code === "EXPIRED") throw new Error("container 24 saat içinde yayınlanmadı ve düştü");

    console.log(`   ... ${code} (${attempt}/${maxAttempts})`);
    if (attempt < maxAttempts) await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(
    `container ${maxAttempts} denemede hazır olmadı. ` +
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

  const hasImage = typeof item.imageUrl === "string" && item.imageUrl.trim();
  const hasVideo = typeof item.videoUrl === "string" && item.videoUrl.trim();
  const hasCarousel = Array.isArray(item.images) && item.images.length > 0;

  const mediaKinds = [hasImage, hasVideo, hasCarousel].filter(Boolean).length;

  if (mediaKinds === 0) {
    errors.push("imageUrl, videoUrl veya images zorunlu");
  } else if (mediaKinds > 1) {
    errors.push("imageUrl, videoUrl ve images birlikte olamaz; tek medya türü seç");
  } else if (hasCarousel) {
    const images = normalizeImages(item);
    if (images.length < CAROUSEL_MIN || images.length > CAROUSEL_MAX) {
      errors.push(`images ${images.length} adet (Instagram sınırı ${CAROUSEL_MIN}-${CAROUSEL_MAX})`);
    }
    images.forEach((image, i) => {
      const label = `images[${i}]`;
      if (typeof image.url !== "string" || !image.url.trim()) {
        errors.push(`${label} url boş`);
        return;
      }
      if (!image.url.startsWith("https://")) {
        errors.push(`${label} https ile başlamalı (Meta görseli dışarıdan çeker)`);
      }
      // Meta yalnız JPEG kabul ediyor; PNG sessizce değil, hata ile döner
      if (!/\.jpe?g(\?|$)/i.test(image.url)) {
        errors.push(`${label} .jpg veya .jpeg olmalı (Instagram API PNG kabul etmiyor)`);
      }
      if (image.altText && image.altText.length > ALT_TEXT_LIMIT) {
        errors.push(`${label} altText ${image.altText.length} karakter (limit ${ALT_TEXT_LIMIT})`);
      }
    });
    if (item.altText) {
      errors.push("karusel kaydında üst düzey altText geçersiz; alt metin her görselin kendi içinde verilir");
    }
  } else if (hasVideo) {
    if (!item.videoUrl.startsWith("https://")) {
      errors.push("videoUrl https ile başlamalı (Meta videoyu dışarıdan çeker)");
    }
    if (!/\.(mp4|mov)(\?|$)/i.test(item.videoUrl)) {
      errors.push("videoUrl .mp4 veya .mov olmalı");
    }
    if (item.coverUrl && !/\.jpe?g(\?|$)/i.test(item.coverUrl)) {
      errors.push("coverUrl .jpg veya .jpeg olmalı");
    }
    if (item.altText) {
      errors.push("altText yalnız görselde geçerli; video için caption yeterli");
    }
  } else {
    if (!item.imageUrl.startsWith("https://")) {
      errors.push("imageUrl https ile başlamalı (Meta görseli dışarıdan çeker)");
    }
    // Meta yalnız JPEG kabul ediyor; PNG sessizce değil, hata ile döner
    if (!/\.jpe?g(\?|$)/i.test(item.imageUrl)) {
      errors.push("imageUrl .jpg veya .jpeg olmalı (Instagram API PNG kabul etmiyor)");
    }
    if (item.altText && item.altText.length > ALT_TEXT_LIMIT) {
      errors.push(`altText ${item.altText.length} karakter (limit ${ALT_TEXT_LIMIT})`);
    }
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

  // Arşiv onarımı kuyruktan önce: bozuk adres taşıyan kayıt varsa düzelt.
  await repairPermalinks(token);

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

    const isVideo = Boolean(item.videoUrl);
    const isCarousel = Array.isArray(item.images) && item.images.length > 0;
    const images = isCarousel ? normalizeImages(item) : null;

    if (item.postedId) {
      // Idempotans: önceki koşuda yayınlanmış, yalnız arşive taşı
      console.log(`✓  ${file} zaten yayınlanmış (${item.postedId}), taşınıyor`);
    } else if (DRY_RUN) {
      console.log(`→  ${file} (${item.caption.length} karakter)`);
      if (isCarousel) {
        console.log(`   [DRY RUN] karusel, ${images.length} kart:`);
        images.forEach((image, i) => console.log(`     ${i + 1}. ${image.url}`));
      } else {
        console.log(`   [DRY RUN] medya: ${isVideo ? item.videoUrl : item.imageUrl}${isVideo ? " (REELS)" : ""}`);
      }
      console.log("   [DRY RUN] container oluşturulmadı, yayın yapılmadı");
      continue;
    } else {
      const kind = isCarousel ? `, KARUSEL ${images.length} kart` : isVideo ? ", REELS" : "";
      console.log(`→  ${file} (${item.caption.length} karakter${kind})`);

      let containerId;

      if (isCarousel) {
        // Alt container'lar önce hazır olmalı; ana container children'ı
        // doğrulayamazsa hata mesajı hangi kartın sorunlu olduğunu söylemez,
        // o yüzden her kart tek tek beklenir.
        const childIds = await createCarouselChildren(token, account.id, images);
        for (const [index, childId] of childIds.entries()) {
          await waitForContainer(token, childId, POLL_MAX_ATTEMPTS_IMAGE);
          console.log(`   kart ${index + 1} hazır`);
        }
        containerId = await createCarouselContainer(token, account.id, item, childIds);
        console.log(`   karusel container: ${containerId}`);
        await waitForContainer(token, containerId, POLL_MAX_ATTEMPTS_IMAGE);
      } else {
        containerId = await createContainer(token, account.id, item);
        console.log(`   container: ${containerId}`);
        await waitForContainer(
          token,
          containerId,
          isVideo ? POLL_MAX_ATTEMPTS_VIDEO : POLL_MAX_ATTEMPTS_IMAGE
        );
      }

      item.postedId = await publishContainer(token, account.id, containerId);
      console.log(`   ✓ ${item.postedId}`);
    }

    item.status = "published";
    item.publishedAt = new Date().toISOString();

    // Kalıcı adres Meta'dan sorulur. Kimlikten adres KURULMAZ; o adres 404 verir.
    item.url = await fetchPermalink(token, item.postedId);
    if (!item.url) {
      console.warn(
        "   ! kalıcı adres alınamadı, url boş bırakıldı. " +
          "Bir sonraki koşuda onarım adımı yeniden dener."
      );
    }

    fs.writeFileSync(path.join(PUBLISHED_DIR, file), JSON.stringify(item, null, 2) + "\n");
    fs.unlinkSync(full);
    console.log(`   → yayınlandı: ${item.url ?? "(adres alınamadı)"}`);
  }

  console.log("\nBitti.");
}

main().catch((err) => {
  console.error(`\n✗ HATA: ${err.message ?? err}`);
  process.exit(1);
});

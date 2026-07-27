#!/usr/bin/env node
/**
 * Chain 5 — LinkedIn yayın motoru
 *
 * queue/linkedin/ altındaki onaylanmış postları LinkedIn'e gönderir.
 * Bağımlılık yok. X'ten farklı olarak OAuth 2.0 Bearer token kullanılır
 * (LinkedIn'de token 60 günde bir yenilenmeli — chain5-token-check izliyor).
 *
 * Kullanım:
 *   node scripts/linkedin-post.mjs
 *   DRY_RUN=1 node scripts/linkedin-post.mjs
 *
 * Gerekli env: LINKEDIN_ACCESS_TOKEN
 *
 * LinkedIn-Version notu: LinkedIn REST sürümleri (YYYYMM) yayından sonra
 * en az 1 yıl desteklenir, sonra sunset edilir. Sürüm hatası
 * (426 NONEXISTENT_VERSION) görülürse buradaki varsayılanı güncel aya çek:
 * https://learn.microsoft.com/en-us/linkedin/marketing/versioning
 */

import fs from "node:fs";
import path from "node:path";

const QUEUE_DIR = "queue/linkedin";
const PUBLISHED_DIR = "published/linkedin";
const API_VERSION = process.env.LINKEDIN_API_VERSION ?? "202607";
const DRY_RUN = process.env.DRY_RUN === "1";
const CHAR_LIMIT = 3000;

function headers(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": API_VERSION,
  };
}

/**
 * LinkedIn "Little Text" kaçışı: commentary alanında bu karakterler ters
 * bölüyle kaçışsız gönderilirse istek 422 ile reddedilir.
 * '#' bilinçli olarak HARİÇ: hashtag'lerin canlı kalmasını istiyoruz.
 */
function escapeLittleText(text) {
  return text.replace(/([\\|{}@\[\]()<>*_~])/g, "\\$1");
}

/** Yazar URN'ü token'dan keşfet — sabit URN saklamak yerine her seferinde sor */
async function resolveAuthorUrn(token) {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    throw new Error(
      "LinkedIn 401: token geçersiz veya süresi dolmuş. " +
        "Developer portal → Auth → token üret ve LINKEDIN_ACCESS_TOKEN secret'ını güncelle."
    );
  }
  if (!res.ok) {
    throw new Error(`userinfo ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const json = await res.json();
  if (!json.sub) throw new Error(`userinfo yanıtında 'sub' yok: ${JSON.stringify(json).slice(0, 200)}`);
  return { urn: `urn:li:person:${json.sub}`, name: json.name ?? "(isim yok)" };
}

async function publishPost(token, authorUrn, text) {
  if (DRY_RUN) {
    console.log(`   [DRY RUN] ${text.length} karakter gönderilecekti`);
    return { id: `dryrun_${Date.now()}` };
  }

  const body = {
    author: authorUrn,
    commentary: escapeLittleText(text),
    visibility: "PUBLIC",
    distribution: {
      feedDistribution: "MAIN_FEED",
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: "PUBLISHED",
    isReshareDisabledByAuthor: false,
  };

  const res = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: headers(token),
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    throw new Error("LinkedIn 401: token süresi dolmuş, yenile.");
  }
  if (!res.ok) {
    throw new Error(`LinkedIn ${res.status}: ${(await res.text()).slice(0, 500)}`);
  }

  // Post ID yanıt gövdesinde değil, x-restli-id başlığında döner
  const id = res.headers.get("x-restli-id") ?? res.headers.get("X-RestLi-Id");
  if (!id) throw new Error("Yanıtta post ID (x-restli-id) bulunamadı");
  return { id };
}

function validate(item, file) {
  const errors = [];
  if (typeof item.text !== "string" || !item.text.trim()) {
    errors.push("text boş");
  } else {
    if (item.text.length > CHAR_LIMIT) {
      errors.push(`${item.text.length} karakter (limit ${CHAR_LIMIT})`);
    }
    if (item.text.includes("—")) errors.push("em-dash içeriyor (marka kuralı)");
  }
  if (errors.length) {
    throw new Error(`${file} geçersiz:\n   - ${errors.join("\n   - ")}`);
  }
}

async function main() {
  if (!fs.existsSync(QUEUE_DIR)) {
    console.log("Kuyruk klasörü yok, yapılacak iş yok.");
    return;
  }
  const files = fs.readdirSync(QUEUE_DIR).filter((f) => f.endsWith(".json")).sort();
  if (!files.length) {
    console.log("Kuyruk boş, yapılacak iş yok.");
    return;
  }

  const token = process.env.LINKEDIN_ACCESS_TOKEN;
  if (!token) throw new Error("LINKEDIN_ACCESS_TOKEN tanımlı değil");

  const author = await resolveAuthorUrn(token);
  console.log(`✓ Token geçerli — yazar: ${author.name}`);

  fs.mkdirSync(PUBLISHED_DIR, { recursive: true });

  for (const file of files) {
    const full = path.join(QUEUE_DIR, file);
    const item = JSON.parse(fs.readFileSync(full, "utf8"));

    if (item.status === "hold") {
      console.log(`⏸  ${file} — status: hold, atlandı`);
      continue;
    }
    validate(item, file);

    // Idempotans: daha önce gönderilmişse tekrar gönderme
    if (item.postedId) {
      console.log(`✓  ${file} zaten yayınlanmış (${item.postedId}), taşınıyor`);
    } else {
      console.log(`→  ${file} (${item.text.length} karakter)`);
      const data = await publishPost(token, author.urn, item.text);
      item.postedId = data.id;
      console.log(`   ✓ ${data.id}`);
    }

    item.status = DRY_RUN ? "dryrun" : "published";
    item.publishedAt = new Date().toISOString();
    item.url = item.postedId?.startsWith("dryrun")
      ? null
      : `https://www.linkedin.com/feed/update/${item.postedId}/`;

    if (DRY_RUN) {
      console.log(`   [DRY RUN] ${file} taşınmadı`);
      continue;
    }
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

// Chain 6: lead süpürücüsü.
// Supabase lead_requests tablosunda notified_at IS NULL kayıtları bulur,
// her biri için Notion Lead Arşivi sayfasına kart açar, kaydı damgalar.
// Bağımlılık yok; Node 20 yerleşik fetch.
//
// Env:
//   SUPABASE_SERVICE_ROLE_KEY  zorunlu (damga için; RLS'i aşar)
//   NOTION_API_KEY             zorunlu (Chain 2 ile aynı secret)
//   NOTION_LEADS_PAGE          opsiyonel (varsayılan: Lead Arşivi sayfa ID)
//   DRY_RUN=1                  opsiyonel (yazma yapmadan raporla)

const SUPABASE_URL = "https://rjpbfvpcaexjexmuguxm.supabase.co";
const LEADS_PAGE = process.env.NOTION_LEADS_PAGE || "3aa66a37ed10810492edfa81bc6ddca5";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const NOTION_KEY = process.env.NOTION_API_KEY;
const DRY_RUN = process.env.DRY_RUN === "1";

if (!SERVICE_KEY) {
  console.error("SUPABASE_SERVICE_ROLE_KEY eksik");
  process.exit(1);
}
if (!NOTION_KEY && !DRY_RUN) {
  console.error("NOTION_API_KEY eksik");
  process.exit(1);
}

const sbHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
};

async function fetchPending() {
  const url =
    `${SUPABASE_URL}/rest/v1/lead_requests` +
    `?notified_at=is.null&select=id,name,company,need,preferred_date,created_at&order=created_at.asc`;
  const res = await fetch(url, { headers: sbHeaders });
  if (!res.ok) throw new Error(`Supabase okuma hatasi: ${res.status} ${await res.text()}`);
  return res.json();
}

function tr(dtIso) {
  return new Date(dtIso).toLocaleString("tr-TR", {
    timeZone: "Europe/Istanbul",
    dateStyle: "short",
    timeStyle: "short",
  });
}

async function createNotionCard(lead) {
  const title = `${lead.name} · ${tr(lead.created_at)}`;
  const para = (text) => ({
    object: "block",
    type: "paragraph",
    paragraph: { rich_text: [{ type: "text", text: { content: text.slice(0, 1900) } }] },
  });
  const body = {
    parent: { page_id: LEADS_PAGE },
    icon: { type: "emoji", emoji: "📩" },
    properties: {
      title: { title: [{ type: "text", text: { content: title } }] },
    },
    children: [
      para(`Ad Soyad: ${lead.name}`),
      para(`Kurum: ${lead.company || "(belirtilmedi)"}`),
      para(`Tercih edilen donem: ${lead.preferred_date || "(belirtilmedi)"}`),
      para("Ihtiyac:"),
      para(lead.need || "(bos)"),
      para(`Kayit zamani: ${tr(lead.created_at)} (TR) · Kaynak: hayrettinsendil.tr formu · Yanit sozu: 2 is gunu`),
    ],
  };
  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Notion karti acilamadi: ${res.status} ${await res.text()}`);
  const page = await res.json();
  return page.url;
}

async function stamp(id) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/lead_requests?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { ...sbHeaders, Prefer: "return=minimal" },
      body: JSON.stringify({ notified_at: new Date().toISOString() }),
    }
  );
  if (!res.ok) throw new Error(`Damga hatasi (${id}): ${res.status} ${await res.text()}`);
}

const pending = await fetchPending();
console.log(`Bekleyen lead: ${pending.length}`);

let ok = 0;
let fail = 0;
for (const lead of pending) {
  if (DRY_RUN) {
    console.log(`[DRY] Kart acilacakti: ${lead.name} (${lead.id})`);
    continue;
  }
  try {
    const url = await createNotionCard(lead);
    await stamp(lead.id);
    ok += 1;
    console.log(`Kart acildi ve damgalandi: ${lead.name} -> ${url}`);
  } catch (err) {
    fail += 1;
    console.error(`Islenemedi (sonraki kosuda yeniden denenecek): ${lead.id}`, err.message);
  }
}

console.log(`Sonuc: ${ok} islendi, ${fail} hata, ${DRY_RUN ? pending.length : 0} dry-run`);
if (fail > 0) process.exit(1);

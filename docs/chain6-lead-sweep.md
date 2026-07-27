# Chain 6: Lead Süpürücüsü

Sitedeki iletişim formundan gelen görüşme taleplerini görünür kılar. Saatlik GitHub Actions cron'u, Supabase `lead_requests` tablosunda işlenmemiş kayıtları bulur, her biri için Notion Lead Arşivi sayfasına kart açar ve kaydı `notified_at` ile damgalar.

## Neden var

27.07.2026 form testinin bulgusu: form çalışıyordu ama lead'ler tabloya sessizce düşüyordu. Sahip tabloya bakmadıkça talepten haberi olmuyordu; "2 iş günü içinde dönüş" sözünün işleyen bir altyapısı yoktu.

İki katmanlı çözüm:

| Katman | Nerede | Ne yapar | Gecikme |
|---|---|---|---|
| Anında e-posta | Site repo `/api/lead` (Resend) | Insert sonrası sahibe mail | Saniyeler |
| Chain 6 (bu) | GitHub Actions cron | Notion kartı + damga | En geç 1 saat |

Zincir aynı zamanda güvenlik ağı: Resend kurulmamış, key süresi dolmuş veya mail kaybolmuş olsa bile her lead en geç bir saat içinde Notion'da görünür.

## Gerekli secrets (GitHub → Settings → Secrets and variables → Actions)

| Secret | Değer | Durum |
|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API → service_role | YENİ, sahip ekler |
| `NOTION_API_KEY` | Chain 2 ile aynı | Zaten var |
| `NOTION_LEADS_PAGE` | Opsiyonel; varsayılan script içinde (Lead Arşivi sayfa ID) | Gerekmez |

Service role anahtarı RLS'i aşar; yalnız GitHub Secrets'ta yaşar, repoya ve loglara yazılmaz. Anon anahtar damga atamaz çünkü RLS anon tarafında yalnız INSERT'e izin verir.

## Test sırası

1. Secret'ı ekle.
2. Actions → "Chain 6: Lead sweep" → Run workflow → `dry_run = 1`. Beklenen: "Bekleyen lead: N" satırı, yazma yok.
3. Aynı workflow'u `dry_run = 0` ile çalıştır. Beklenen: bekleyen kayıtlar için Notion kartı + damga.
4. Notion → Lead Arşivi sayfasında kartı gör.

## İşleyiş garantileri

- Idempotent: damga yalnız kart başarıyla açıldıktan sonra atılır; hata alan kayıt sonraki koşuda yeniden denenir.
- Kart içeriği kullanıcı girdisidir; başlık ve paragraflar 1900 karakterde kırpılır.
- Maliyet: Actions ücretsiz kota içinde (aylık ~720 koşu x saniyeler); Notion ve Supabase çağrıları ücretsiz katmanda.

## İlgili

- Site tarafı anında e-posta: site repo `src/app/api/lead/route.ts` (Resend)
- Migration: `add_notified_at_to_lead_requests` (27.07.2026)
- Lead Arşivi: Notion, Site Operations altı

# Chain 9 — Instagram Kurulum ve İşletim

Son güncelleme: 08.08.2026

Instagram yayın zinciri. Chain 4 (X) ve Chain 5 (LinkedIn) ile aynı modeli izler:
üretim otomatik, yayın PR merge onayıyla.

---

## Neden bu yol seçildi

Instagram'a API ile yayın yapmanın iki yolu var. Seçilen yol **Instagram API with Instagram Login**.

| Konu | Instagram Login (seçilen) | Facebook Login |
|---|---|---|
| Facebook Sayfası | Gerekmiyor | Zorunlu |
| Host | `graph.instagram.com` | `graph.facebook.com` |
| İzinler | `instagram_business_basic`, `instagram_business_content_publish` | `instagram_basic`, `instagram_content_publish`, `pages_read_engagement` |

**Meta App Review gerekmiyor.** İnceleme, başkalarına ait hesaplara erişen uygulamalar için
zorunlu. Uygulama Development modunda kalıp yalnız sahibinin kendi hesabına post attığı sürece
bu süreç hiç işlemiyor.

---

## Ön koşullar

- Instagram hesabı **Professional (Business)** olmalı. Kişisel hesap API'ye kapalı.
- Meta Developer kaydı (Facebook hesabı üzerinden).
- Görseller herkese açık bir URL'de ve **JPEG** olmalı.

Görsel barındırma için ek altyapı kurulmadı: site repo'sundaki `public/images/`
zaten herkese açık. Kare görseller `public/images/instagram/` altına konur,
kuyruk dosyasında tam adresi verilir.

---

## Kurulum

### 1. Meta uygulaması

1. `developers.facebook.com/apps` → **Create App**
2. Use case: **Other** → App type: **Business**
3. Uygulama adı: `hs-site-instagram` (Meta uygulama adında "Instagram" kelimesine izin
   vermeyebilir; reddedilirse `hs-site-social` kullan)
4. Ürünlerden **Instagram** → **Set up**
5. **Instagram API with Instagram Login** seçeneğini kur

### 2. İzinler

App dashboard → Instagram → API setup with Instagram login:

- `instagram_business_basic`
- `instagram_business_content_publish`

Uygulama **Development modunda kalsın.** Live moda alma; App Review tetiklenir.

### 3. Hesabı bağla ve token üret

Aynı ekranda **Generate access token** → Instagram hesabıyla giriş → izinleri onayla.

Üretilen token uzun ömürlüdür ama **süresizdir denemez**. Süre bilgisi panelde görünür,
kurulum sırasında not edilmeli.

### 4. GitHub secret

`hs-site-team` reposu → Settings → Secrets and variables → Actions:

| Secret | Değer |
|---|---|
| `INSTAGRAM_ACCESS_TOKEN` | Üretilen uzun ömürlü token |

> Token'ı hiçbir dosyaya, commit'e veya issue'ya yazma. Yalnız secret olarak saklanır.

### 5. Doğrulama

Actions → **Chain 9 — Instagram Yayın** → Run workflow → `dry_run: true`.

Kuyruk boşken bile token doğrulaması çalışır; log'da `✓ Token geçerli — hesap: @hayrettinai`
satırını görmen gerekir. Bu satır gelmiyorsa token yanlış ya da hesap Business değil.

---

## Kuyruk dosyası şeması

`queue/instagram/YYYY-MM-DD-<slug>.json`

```json
{
  "id": "2026-08-09-kapasitenin-yeni-birimi",
  "platform": "instagram",
  "source": "blog:kapasitenin-yeni-birimi",
  "imageUrl": "https://hayrettinsendil.tr/images/instagram/kapasitenin-yeni-birimi.jpg",
  "caption": "Kapasite planlamasının yeni birimi ne?\n\n...",
  "altText": "Mor tonlarda soyut bir ölçek deseni",
  "status": "approved"
}
```

| Alan | Kural |
|---|---|
| `caption` | En fazla 2200 karakter, em-dash yasak, en fazla 30 hashtag |
| `imageUrl` | `https://` ile başlar, `.jpg` veya `.jpeg` biter, kare (1080x1080 önerilir) |
| `altText` | İsteğe bağlı ama doldurulmalı; erişilebilirlik ve arama için |
| `status` | `hold` ise motor atlar |

Doğrulamalar `scripts/instagram-post.mjs` içindeki `validate()` fonksiyonunda; kural
eklenecekse orada tek noktadan yapılır.

---

## Yayın akışı

1. Kuyruk dosyası bir branch'te oluşturulur, PR açılır
2. Metin sohbette onaya sunulur (**onay kapısı kaldırılmaz**, SOC.md)
3. PR merge edilir → `queue/instagram/**` main'e düşer → workflow tetiklenir
4. Motor: container oluşturur, hazır olmasını bekler, yayınlar
5. Dosya `published/instagram/` altına taşınır, bot commit'i atılır

---

## Bilinen kısıtlar

| Kısıt | Sonuç |
|---|---|
| Caption'da link tıklanamaz | Instagram kuralı. Yönlendirme bio linki üzerinden yapılır |
| Yalnız JPEG | PNG gönderilirse container adımında hata döner |
| 24 saatte 100 yayın | Mevcut kadans için sorun değil |
| Container 24 saatte düşer | Yayınlanmayan kap `EXPIRED` olur, kuyruk dosyası kalır, sonraki koşuda yeniden denenir |

---

## Bakım

**Token yenileme.** Instagram token'ı süreli. Süresi dolduğunda motor 401 ile durur ve
log'da ne yapılacağını yazar. Chain 5'teki `chain5-token-check` deseninin aynısı Instagram
için de kurulmalı; şu an **yok**, token süresi elle takip ediliyor.

**Graph sürümü.** Varsayılan `v25.0`, `INSTAGRAM_API_VERSION` ile ezilebilir. Meta sürümleri
yaklaşık iki yıl yaşar. LinkedIn tarafında sunset edilmiş sürüm yüzünden bir yayın düşmüştü;
aynı tuzak burada da geçerli, sürüm hatası görülürse varsayılan güncellenir.

---

## Kaynaklar

- [Content Publishing · Meta for Developers](https://developers.facebook.com/docs/instagram-platform/content-publishing)
- [Instagram API with Instagram Login](https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/)
- [Graph API Changelog](https://developers.facebook.com/docs/graph-api/changelog)

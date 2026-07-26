# Chain 4 — X Otomasyonu Kurulum Rehberi

> Durum: kod hazır, **anahtarlar bekleniyor**. Aşağıdaki 3 adım tamamlanınca
> pipeline çalışır hale gelir. Toplam süre: ~15 dakika.

## Nasıl çalışıyor

```
[Chain 4a] Post üretimi           [Sahip]            [Chain 4b] Yayın
 cron veya manuel tetik    →   PR açılır   →   merge  →  X'e post atılır
 Claude API + marka denetimi    (önizleme)     (onay)     arşive taşınır
```

**Onay kapısı = PR merge.** Ayrı bir "gönder" adımı yok. PR'ı kapatırsan
içerik çöpe gider, hiçbir şey yayınlanmaz.

---

## Adım 1 — X Developer hesabı ve uygulama

1. [developer.x.com](https://developer.x.com) → hesabınla giriş yap (**@HayrettinAi**
   hesabıyla giriş yaptığından emin ol; anahtarlar hangi hesap girişliyse ona bağlanır)
2. **Free** planı seç (aylık 500 post yazma hakkı; haftada 2-3 thread için fazlasıyla yeterli)
3. Yeni **Project + App** oluştur (örn. ad: `hs-site-x-bot`)
4. App → **Settings** → *User authentication settings* → **Set up**
   - App permissions: **Read and write** (kritik; varsayılan Read-only post atmaz)
   - Type of App: **Web App, Automated App or Bot**
   - Callback URI: `https://hayrettinsendil.tr` (kullanılmıyor ama zorunlu alan)
   - Website URL: `https://hayrettinsendil.tr`
   - Kaydet

## Adım 2 — 4 anahtarı al

App → **Keys and tokens** sekmesi:

| Anahtar | Nerede | Not |
|---|---|---|
| API Key | Consumer Keys → API Key | |
| API Key Secret | Consumer Keys → API Key Secret | Yalnız bir kez gösterilir |
| Access Token | Authentication Tokens → Access Token and Secret → Generate | **Önemli:** izinleri Read+Write yaptıktan SONRA üret |
| Access Token Secret | aynı yerde | |

> ⚠️ Access Token'ı izin değişikliğinden ÖNCE üretirsen eski (read-only)
> izinleri taşır ve post atarken 403 alırsın. Öyleyse **Regenerate** ile yenile.

## Adım 3 — GitHub secrets

`hsendil/hs-site-team` → Settings → Secrets and variables → Actions → **New repository secret**

| Secret adı | Değer |
|---|---|
| `X_API_KEY` | API Key |
| `X_API_SECRET` | API Key Secret |
| `X_ACCESS_TOKEN` | Access Token |
| `X_ACCESS_SECRET` | Access Token Secret |
| `ANTHROPIC_API_KEY` | Zaten var (Chain 2 kullanıyor) |

---

## İlk test (önerilen sıra)

1. **Kuru çalışma — yayın motoru:** Actions → *Chain 4b* → Run workflow →
   `dry_run: true`. Kimlik bilgileri okunuyor mu, imzalama çalışıyor mu görürüsün.
   (Kuyruk boşsa "yapılacak iş yok" der; bu da başarılı sayılır.)
2. **İçerik üretimi:** Actions → *Chain 4a* → Run workflow →
   `mode: blog`, `slug: bu-site-neden-var`, `dry_run: true` → log'da üretilen
   thread'i oku. Ton doğru mu?
3. **Gerçek akış:** aynısını `dry_run: false` ile çalıştır → PR açılır →
   metni oku, gerekirse JSON'u düzenle → **merge et** → Chain 4b tetiklenir →
   x.com/HayrettinAi'da postu gör.

## Günlük kullanım

| İhtiyaç | Ne yaparsan |
|---|---|
| Yeni blog yazısını duyur | Chain 4a → `mode: blog` + slug |
| Bağımsız post | Chain 4a → `mode: standalone` + konu |
| Haftalık otomatik | Pazartesi 09:00'da cron üretir, PR bekler |
| Postu erteleme | PR içindeki JSON'da `"status": "hold"` yap, merge et — yayınlanmaz |
| Postu iptal | PR'ı kapat |

## Sınırlar ve riskler

| Konu | Durum |
|---|---|
| Kota | Free plan: 500 post/ay. Haftada 3 thread × 4 tweet = ~50/ay. Rahat. |
| Token ömrü | OAuth 1.0a anahtarları **süresizdir**. Yenileme bakımı yok. |
| Çift post | `concurrency` + `postedIds` idempotansı ile engellendi. |
| Yanlış içerik | Marka denetimi otomatik (280 kr, em-dash, yasaklı ifade, kurum adı) + PR insan onayı. |
| Görsel | Bu fazda yok. X'te metin-only post geçerli. Instagram için görsel zorunlu (sonraki faz). |

## Sorun giderme

| Belirti | Sebep / çözüm |
|---|---|
| `X API 403` | App izni Read-only kalmış veya token izin değişiminden önce üretilmiş → Access Token'ı **Regenerate** et |
| `X API 401` | Anahtarlardan biri yanlış/boşluklu kopyalanmış → secret'ları yeniden gir |
| `X API 429` | Kota doldu → aylık limit veya kısa süreli rate limit; bekle |
| `duplicate content` | Aynı metin daha önce atılmış → X aynı tweet'i reddeder, metni değiştir |
| Marka denetimi reddetti | Log'daki ihlal listesine bak; genelde 280 karakter aşımı veya em-dash |

---

## Sonraki fazlar

- **LinkedIn:** `w_member_social` izniyle mümkün ama token 60 günde bir
  yenilenmeli. X akışı 2-3 hafta sorunsuz çalıştıktan sonra kurulması önerilir.
- **Instagram:** Business/Creator hesabı + bağlı Facebook Sayfası + Meta App
  Review şart. Ayrıca her post için görsel gerekir (GROK akışı ile üretilecek).
  Önce hesap tipi kontrol edilmeli.

*v1.0 — 26 Temmuz 2026*

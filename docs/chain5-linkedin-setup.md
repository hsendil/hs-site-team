# Chain 5 — LinkedIn Otomasyonu Kurulum Rehberi

> Durum: kod hazır, **anahtarlar bekleniyor**. ~20 dakikalık kurulum.
> Maliyet: **ücretsiz** (X'in aksine kredi gerekmiyor).

## Nasıl çalışıyor

```
[Chain 5a] Üretim        [Sahip]           [Chain 5b] Yayın
 manuel/Perşembe cron → PR açılır → merge → LinkedIn'e post → arşiv
                                    ↓
                      [Chain 5c] haftalık token kontrolü → süre bitmeden Issue
```

X ile aynı onay modeli: **PR merge = yayın**.

### X'ten farklar

| | X | LinkedIn |
|---|---|---|
| Format | 3-6 tweet zinciri | Tek uzun post |
| Uzunluk | 280 kr/tweet | 900-2200 karakter hedef |
| Ton | Teknik okuyucu | Kurumsal karar verici |
| İmza | Yok | Zorunlu imza bloğu |
| Maliyet | Post başına ücret | Ücretsiz |
| Token | Süresiz | **60 günde yenileme** |
| Cron | Pazartesi | Perşembe |

---

## Adım 1 — LinkedIn uygulaması oluştur

1. https://www.linkedin.com/developers/apps → **Create app**
2. Alanlar:
   - App name: `hs-site-linkedin-bot`
   - **LinkedIn Page:** mevcut şirket sayfanı seç ← *zorunlu alan; kişisel
     profile post atacak olsan bile LinkedIn bir sayfa bağlanmasını istiyor*
   - App logo: herhangi bir görsel
   - Yasal şartları kabul et → Create app
3. **Settings** sekmesi → *Verify* → oluşan doğrulama linkini aç ve sayfa
   yöneticisi olarak onayla. Doğrulanmadan ürün talebi yapılamaz.

## Adım 2 — "Share on LinkedIn" ürününü ekle

**Products** sekmesi → **Share on LinkedIn** → *Request access*.
Self-servis onaylıdır, genelde anında aktifleşir.

İstersen **Sign In with LinkedIn using OpenID Connect** ürününü de ekle;
`/v2/userinfo` çağrısı için gerekli olan `profile` ve `openid` scope'larını açar.

> Betik yazar URN'ünü `/v2/userinfo` ile bulur. Bu ürün yoksa 403 alırsın.

## Adım 3 — İlk token'ı üret

OAuth redirect sunucusu kurmaya gerek yok, portalda hazır araç var:

1. **Auth** sekmesi → **OAuth 2.0 tools** → *Create token*
2. Scope'ları seç: `w_member_social`, `profile`, `openid`
3. Kendi hesabınla onay ver → token ekranda çıkar (60 gün geçerli)

Aynı sekmede **Client ID** ve **Client Secret** de var; token süre takibi
için ikisi de gerekiyor.

## Adım 4 — GitHub secrets

`hsendil/hs-site-team` → Settings → Secrets and variables → Actions

| Secret | Değer |
|---|---|
| `LINKEDIN_ACCESS_TOKEN` | Adım 3'te üretilen token |
| `LINKEDIN_CLIENT_ID` | Auth sekmesi |
| `LINKEDIN_CLIENT_SECRET` | Auth sekmesi |

---

## Test sırası

1. **Token geçerli mi:** Actions → *Chain 5c* → Run workflow.
   `status=ok` bekliyoruz. Issue açılırsa token/secret sorunlu demektir.
2. **Yayın motoru:** Actions → *Chain 5b* → `dry_run: true`.
   "Token geçerli — yazar: <adın>" satırını görmelisin.
3. **İçerik:** Actions → *Chain 5a* → `mode: blog`, `slug: bu-site-neden-var`,
   `dry_run: true` → log'daki önizlemeyi oku, tonu değerlendir.
4. **Gerçek akış:** aynısını `dry_run: false` ile → PR → oku → merge → yayın.

## 60 günlük yenileme rutini

Chain 5c her Pazartesi kontrol eder. Kalan süre 10 günün altına düşerse veya
token ölürse repo'da otomatik Issue açılır. Yenileme: Adım 3'ü tekrarla,
secret'ı güncelle, issue'yu kapat. Süre ~2 dakika.

## Sorun giderme

| Belirti | Sebep / çözüm |
|---|---|
| `401` | Token süresi doldu → Adım 3 ile yenile |
| `403` on userinfo | `profile`/`openid` scope'u yok → Sign In with LinkedIn ürününü ekle, token'ı yeniden üret |
| `403` on posts | `w_member_social` scope'u yok → Share on LinkedIn ürününü ekle |
| `422 UNPERMITTED_FIELD` | commentary'de kaçışsız özel karakter → betik zaten kaçış yapıyor; metinde alışılmadık karakter varsa temizle |
| `Verify` adımı geçilemiyor | Seçilen LinkedIn Sayfasının yöneticisi olmalısın |
| Üretim reddedildi | Log'daki ihlal listesine bak; genelde uzunluk veya yasaklı karakter |

---

*v1.0 — 26 Temmuz 2026*

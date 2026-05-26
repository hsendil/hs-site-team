# Brand Standard — hayrettinsendil.tr

> Tek otorite. Renk, tipografi, ton ve editöryal stil burada tanımlıdır. Tüm ajanlar bu dosyayı kaynak alır.

## Renk Paleti

| Token | Hex | Kullanım |
|---|---|---|
| `--ink` | `#1E1B4B` | Ana koyu zemin, başlık metin |
| `--ink-2` | `#2D1B69` | Gradient ikinci durak, koyu vurgu |
| `--accent-light` | `#A78BFA` | Açık vurgu, ikincil çağrı, eyebrow text, TOC active link |
| `--accent` | `#7C3AED` | Ana vurgu, CTA, link, highlight |
| `--surface` | `#F5F3FF` | Açık tema zemin (section bg) |
| `--footer` | `#0F0D2A` | Footer + en koyu zemin |

### Kullanım kuralları
- Ana gradient: `linear-gradient(135deg, #1E1B4B 0%, #2D1B69 50%, #1E1B4B 100%)`
- CTA butonu: `bg: #7C3AED`, hover'da opacity 0.9
- Link: `#7C3AED` (light), `#A78BFA` (dark), hover underline
- Eyebrow text: `#A78BFA`, uppercase, letter-spacing 4px (0.25em)

### Prose tipografi tokenları (Tailwind v4 özel ayar)
Blog yazıları için `@tailwindcss/typography` plugin'i fallback değerleri set etmez. Manuel set:
```css
.prose {
  --tw-prose-body: #1f2937;
  --tw-prose-bold: #111827;
  --tw-prose-links: #7C3AED;
  --tw-prose-code: #1e1b4b;
}
.prose-invert {
  --tw-prose-body: #e5e7eb;
  --tw-prose-bold: #ffffff;
  --tw-prose-links: #A78BFA;
  --tw-prose-headings: #ffffff;
  --tw-prose-code: #f5f3ff;
}
```
Referans: ADR-009 (SSR inline JSON-LD) + 2026-05-26 prose contrast + inline code fix.

## Tipografi

- **Font:** Outfit (next/font/google, weight 400/500/600/700/800, display swap)
- **Hierarchy:**
  - H1: 5xl, font-extrabold, tracking-tight
  - H2: 3xl-4xl, font-bold
  - Body: base, font-normal, leading-relaxed
  - Eyebrow: sm, font-semibold, uppercase, tracking-[0.25em]
- **Hint:** Türkçe karakterleri test et — Outfit latin subset Türkçe destekler; latin-ext gerekirse ekle.

---

## EDITÖRYAL STİL KURALLARI (2026-05-26 sahip review)

> Bu bölüm tüm yazılı çıktılarda zorunlu: blog, hakkımda, ana sayfa, sosyal medya draft'ları, e-posta. **CON, SOC, BRD ajanların okuması şart.**

### Genel ton
- **Birinci tekil şahıs** — yazıyorum, kuruyorum, öğretiyorum
- Akademik dil yasak
- Kurumsal jargon minimal
- Sayı, tarih, sertifika ID açıkça belirtilir
- Övgü değil kanıt ("PMP + 8 Anthropic sertifikası")
- Doğrudan eylem fiili ("yapıyorum", "kuruyorum")
- Okuyucuya **"sen"** (samimi), "siz" değil

### Kural 1 — Em-dash (—) azlığı
Çok em-dash makine çevirisi hissi verir. Sayfada **toplam 2-3 em-dash** ideal, asla 10+ değil.

**Em-dash yerine kullan:**
- Nokta: "Site var. Şimdi takım yönetiyor."
- Virgül: "Kod yazmadım, takım yazdı."
- Noktalı virgül: "Kod yazmadım; takım yazdı."
- Parantez: "X bölümü (Y için)"
- Eğik çizgi: "FE / Frontend"
- İki nokta: "FE: Frontend"

Em-dash sadece **dramatik vurgu** gerektiğinde kalsın.

### Kural 2 — Üçüncü tekil şahıs sızıntısı YASAK

Birinci tekil yazılıyor, sahip kendinden "Hayrettin Şendil yazdı" gibi 3. tekil bahsetmiyor.

**Yanlış:**
- "Hayrettin Şendil yazdı"
- "Bu yazıyı Hayrettin Şendil hazırladı"
- "Hayrettin Şendil 21 yıl tecrübesini paylaşıyor"

**Doğru:**
- İmza kartı: foto + "**Hayrettin Şendil**" + tarih + 2 link (yazı tarzı yok, sadece kart)
- Yazı içinde: "21 yıllık deneyimimde..."

### Kural 3 — AuthorBio Template (kalıcı)

Blog detay sayfası yazı sonu imza bloku **bu şablonu** kullanır:

```
[BW portre 56×56 yuvarlak]  Hayrettin Şendil
                             26 Mayıs 2026 · 4 dk okuma
                             [LinkedIn]  [X]
```

**Spec:**
- Foto: `public/images/about-bw.png` (Hakkımda'daki BW portre)
- İsim: bold, normal büyüklük (text-base)
- Tarih + okuma süresi: sm gri
- 2 sosyal link: minimal text-link
- Border yok, sadece üstte hairline divider
- "yazdı" / "tarafından" YASAK
- Bio cümlesi YOK
- Sertifika/yetenek/yıl YASAK

### Kural 4 — İmla ve Açıklama Netliği

**Yapma:**
- Uzun cümle (40+ kelime) — böl
- 2 cümleyi tek cümleye sıkıştırma
- Sürekli parantez içi not ("yani", "demek ki", "başka bir deyişle")
- 4-5 parçalı iki nokta dizilimi

**Yap:**
- Kısa cümleler. Net özne, net fiil.
- Türkçe imla: ek ayırma (`'de`, `'da`), kesme işaretleri doğru, noktalı virgül uygun yerde
- Doğal Türkçe açıklama, Anglo-Sakson parantez çevirisi değil

### Kural 5 — Madde listeleri kontrollü

Madde-itis hastalığından kaç. Liste sadece:
- 3+ paralel öğe
- Adımlar (kronolojik)
- Karşılaştırma (tablo daha iyi)

Yoksa doğal cümle akışı: "Üç şey değişti: kontrast, link rengi, yazar kartı."

### Kural 6 — "biz" yasak

Tek geliştirici, tek yazar. "Biz" denmez. Yazılarda **"ben"** veya **6 ajanlı takım** referansı.

---

### Örnek (iyi)
> "Claude'u kurumunuzun günlük iş akışına 5 günde entegre ediyorum. Slayt değil, çalışan sistem."

### Örnek (kaçınılacak)
> "En iyi yapay zeka dönüşüm çözümlerimizle dijital geleceğinizi şekillendiriyoruz."

---

## Logo / Görsel Varlık

- Kişisel marka — kurumsal logo yok
- Hero görsel: `public/images/about-bw.png` (şimdi AuthorBio için de)
- About portresi: `public/images/hero.png`
- Tüm görseller `<Image>` ile sunulur (lazy, optimize)

## Terim Kuralları (canonical)

EDT denetiminin (2026-05-26) tespit ettiği site geneli terim ikiliği — sahip kararıyla bu noktada netleştirildi.

- **"AI" baskın** — teknik tonda, kısa, jargon parens'siz. Tüm prose, UI string, blog body'sinde varsayılan.
- **İlk geçişte (yalnızca about ABOUT_DESCRIPTION gibi tanımlayıcı meta pozisyonlarda) "yapay zeka (AI)"** tek seferlik tanım. Sonraki tüm geçişler "AI".
- **"Yapay Zeka" yalnız özel ad pozisyonu** (örn. unvan: "Yapay Zeka Genel Müdürü") — yoksa "AI".
- **PMP referansı:** **"PMP + 8 Anthropic"** (OG image standardı). "PMP ve 8 Anthropic" yasak.
- **Domain:** lowercase **"hayrettinsendil.tr"**. Cümle başında "Hayrettinsendil.tr" yerine cümleyi yeniden yapılandır: "Bu siteyi (hayrettinsendil.tr)..." gibi.
- **Compound korunur:** `multi-agent`, `sub-agent`, `tek-ajan`, `JSON-LD`, `ADR-009`, `draft-only`, `chat-driven` — hyphenli compound terimler değiştirilmez.

## Sosyal Medya Handle ve İletişim

- **LinkedIn:** `eniac` → linkedin.com/in/eniac
- **X:** `@HayrettinAi` → x.com/HayrettinAi
- **Instagram:** `hayrettinai` → instagram.com/hayrettinai
- **GitHub:** `hsendil` → github.com/hsendil
- **E-posta (resmi/iş):** `support@hayrettinsendil.tr` — workshop, danışmanlık, ekip eğitimi
- **E-posta (kişisel):** `hayrettin.sendil@hotmail.com.tr` — yalnızca kişisel/gizli yazışma, public yerlerde KULLANMA

*Son güncelleme: 2026-05-26 — editöryal stil kuralları + Terim Kuralları (AI canonical, EDT audit sonrası) eklendi*

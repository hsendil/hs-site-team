# Brand Standard — hayrettinsendil.tr

> Tek otorite. Renk, tipografi ve ton burada tanımlıdır. Tüm ajanlar bu dosyayı kaynak alır.

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
- Link: `#7C3AED` (light), `#A78BFA` (dark mode), hover underline
- Eyebrow text: `#A78BFA`, uppercase, letter-spacing 4px (0.25em)

### Prose tipografi tokenları (Tailwind v4 özel ayar)
Blog yazıları için `@tailwindcss/typography` plugin'i fallback değerleri set etmez. Manuel set:
```css
.prose {
  --tw-prose-body: #1f2937;
  --tw-prose-bold: #111827;
  --tw-prose-links: #7C3AED;
}
.prose-invert {
  --tw-prose-body: #e5e7eb;
  --tw-prose-bold: #ffffff;
  --tw-prose-links: #A78BFA;
  --tw-prose-headings: #ffffff;
}
```
Referans: ADR-009 (SSR inline JSON-LD) + 2026-05-26 prose contrast fix.

## Tipografi

- **Font:** Outfit (next/font/google, weight 400/500/600/700/800, display swap)
- **Hierarchy:**
  - H1: 5xl, font-extrabold, tracking-tight
  - H2: 3xl-4xl, font-bold
  - Body: base, font-normal, leading-relaxed
  - Eyebrow: sm, font-semibold, uppercase, tracking-[0.25em]
- **Hint:** Türkçe karakterleri test et — Outfit latin subset Türkçe destekler; latin-ext gerekirse ekle.

## Ton

- **Birinci tekil şahıs**, samimi ama profesyonel.
- Akademik dil yasak.
- Kurumsal jargon minimal.
- Sayı, tarih, sertifika ID açıkça belirtilir.
- Övgü değil kanıt — "PMP + 8 Anthropic sertifikası" gibi.
- Doğrudan eylem fiili — "yapıyorum", "kuruyorum", "öğretiyorum".

### Örnek (iyi)
> "Claude'u kurumunuzun günlük iş akışına 5 günde entegre ediyorum. Slayt değil, çalışan sistem."

### Örnek (kaçınılacak)
> "En iyi yapay zeka dönüşüm çözümlerimizle dijital geleceğinizi şekillendiriyoruz."

## AuthorBio Kuralı (2026-05-26 güncelleme)

Blog detay sayfası sonunda yer alan yazar kartı **sade** olmalı. "Satish kartı" hissi vermez:
- Küçük avatar (40x40)
- Tek satır: "Hayrettin Şendil yazdı"
- Opsiyonel 1 cümle bio
- 2 sosyal link (LinkedIn + X) — minimal
- Sertifika listesi, eyebrow, uzun bio, GitHub link — YASAK
- Border yok, sadece divider

## Logo / Görsel Varlık

- Kişisel marka — kurumsal logo yok
- Hero görsel: `public/images/about-bw.png`
- About portresi: `public/images/hero.png`
- Tüm görseller `<Image>` ile sunulur (lazy, optimize)

## Sosyal Medya Handle ve İletişim

- **LinkedIn:** `eniac` → linkedin.com/in/eniac
- **X:** `@HayrettinAi` → x.com/HayrettinAi
- **Instagram:** `hayrettinai` → instagram.com/hayrettinai
- **GitHub:** `hsendil` → github.com/hsendil
- **E-posta (resmi/iş):** `support@hayrettinsendil.tr` (workshop, danışmanlık, ekip eğitimi)
- **E-posta (kişisel):** `hayrettin.sendil@hotmail.com.tr` — yalnızca kişisel/gizli yazışma, public yerlerde KULLANMA

*Son güncelleme: 2026-05-26 — e-posta + prose tokenları + AuthorBio kuralı*

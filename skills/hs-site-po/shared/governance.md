# Governance — Commit, Branch & Deploy Kuralları

## Branch Modeli

**Single-branch flow:** Sadece `main` branch kullanılır.

- Feature branch açılmaz (küçük proje, tek geliştirici)
- Direct push `main`'e — her commit production'a gider
- Geri alma: Vercel UI'dan instant rollback (1 tık)
- Hotfix: doğrudan `main`'e commit

## Commit Format (Conventional Commits)

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type prefix'leri

| Type | Kullanım |
|---|---|
| `feat` | Yeni özellik (yeni sayfa, yeni component, yeni endpoint) |
| `fix` | Bug fix |
| `chore` | Build, config, lint, dependency, yeniden adlandırma |
| `docs` | README, comment, dokümantasyon |
| `refactor` | Davranış değişmeden kod yeniden yapılandırma |
| `perf` | Performans iyileştirme |
| `style` | Tailwind sınıfı, CSS, format (logic değişmez) |
| `content` | Blog yazısı, hakkımda metni, MDX değişikliği |

### Örnek

```
feat(blog): dinamik OG image üretimi + RSS alternate link

- src/app/opengraph-image.tsx (site default 1200x630)
- src/app/blog/[slug]/opengraph-image.tsx (post başlığı dinamik)
- layout.tsx alternates.types ile RSS link

Etki: LinkedIn/X paylaşımlarında her yazı için özgün branded kart.
```

## Vercel Deploy

- `main` push → Vercel webhook tetiklenir → build başlar
- Ortalama build süresi: ~15s (Turbopack + build cache)
- Build cache restore deploy'lar arası
- Deploy başarısız ise Vercel önceki başarılı deploy'da kalır (zero-downtime)

### Build doğrulama

Her commit sonrası:
1. Vercel MCP `list_deployments` ile son deploy'u kontrol et
2. `state: READY` bekle (max 60s)
3. `state: ERROR` ise `get_deployment_build_logs` ile incele
4. Önemli rota değişikliği varsa `mcp__workspace__web_fetch` ile canlı doğrula
   (Not: hayrettinsendil.tr Cowork allowlist'inde değil — alternatif: Chrome MCP)

## Otonom vs Onay Gerektiren

| Aksiyon | Otonom | Onay |
|---|---|---|
| Kod, metadata, görsel commit | ✅ | — |
| Vercel production deploy | ✅ (push ile otomatik) | — |
| Dependency patch/minor bump | ✅ | — |
| Dependency major bump | — | ✅ Sahip |
| Yeni route / sayfa | ✅ | — |
| Renk paleti değişikliği | — | ✅ Sahip (önce brand.md) |
| Blog yazısı taslak commit | ✅ (published: false) | — |
| Blog yayını (published: true) | — | ✅ Sahip |
| Sosyal medya post paylaşımı | — | ✅ Sahip (SOC draft) |
| `env` / secret | — | ✅ Sahip |

## Hassas Veri

**Asla commit etme:**
- `.env`, `.env.local`, `.env.*.local`
- API key, secret, token, password
- Kişisel veri (e-posta listesi, müşteri verisi)
- `*.pem`, `*.key` dosyaları

**`.gitignore` kontrolü:** Her yeni dosya türü eklendiğinde `.gitignore` güncellenir.

## Rollback Protokolü

1. Vercel dashboard → Deployments → önceki başarılı build → "Promote to Production"
2. Bozuk commit'i tespit et: `git log --oneline -10`
3. Revert commit: `git revert <sha>` + `git push`
4. Yeni deploy ile düzelt

## Versiyonlama (plugin için)

- Bu plugin SemVer'i izler: MAJOR.MINOR.PATCH
- MAJOR: takım yapısı / orchestrator değişikliği
- MINOR: yeni ajan / yeni capability / büyük refactor
- PATCH: hata düzeltme, küçük metin/kural güncellemesi
- Her sürüm `CHANGELOG.md` ve `plugin.json` `version` alanını günceller

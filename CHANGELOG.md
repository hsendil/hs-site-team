# Changelog

Tüm önemli değişiklikler bu dosyada belgelenir.
Format: [Keep a Changelog](https://keepachangelog.com/tr/1.0.0/) · SemVer.

## [1.0.0] — 2026-05-25

İlk sürüm.

### Eklendi
- Orchestrator skill `hs-site-po` — PO rolü, routing tablosu, onay matrisi
- 5 sub-agent referans dosyası (lazy load): WEB, SEO, CON, BRD, SOC
- Shared context: brand.md (renk/font/ton), stack.md (Next.js + Vercel), governance.md (commit + deploy kuralları)
- Mimari karar log: docs/architecture.md
- Pattern notları (öğretici): docs/patterns.md
- README (TR + EN), MIT License, plugin manifest

### Mimari kararlar
- Tek skill, references/ altında lazy sub-agent dosyaları (r34-team pattern)
- Chat-driven tetik (Cowork scheduled değil)
- Tam otonom commit + deploy (site repo'sundaki tüm değişiklikler doğrudan push)
- Social: draft-only (LinkedIn/X/Instagram için API'ler yetersiz veya ücretli)
- Plugin repo public, site repo private — vitrin gücü

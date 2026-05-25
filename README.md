# hs-site-team

> hayrettinsendil.tr kişisel sitesini yöneten 6 ajanlı Claude Code takımı.
> 1 Product Owner + 5 uzman sub-agent. Chat-driven, tam otonom commit + deploy.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Claude Code Plugin](https://img.shields.io/badge/Claude%20Code-Plugin-7C3AED.svg)](https://code.claude.com/docs/en/discover-plugins)
[English](README.en.md) · **Türkçe**

---

## Ne işe yarar?

Kişisel sitenizi tek başınıza yönetmek yerine **uzmanlaşmış ajan takımının** yönetmesini sağlar. Claude Code'da bir komutla webmaster, SEO uzmanı, içerik editörü, marka tasarımcısı ve sosyal medya stratejisti çağırırsınız; her biri kendi alanında çalışır, doğrudan site repo'suna commit + deploy eder.

### Mimari

| Ajan | Sorumluluk |
|---|---|
| **hs-site-po** | Orchestrator — talebi parçalar, doğru ajana yönlendirir, çıktıları birleştirir |
| **WEB** (Webmaster) | Next.js sayfa/component, performans, Lighthouse, deploy doğrulaması |
| **SEO** | Meta + JSON-LD + sitemap + GA4 event + GSC kontrol + keyword |
| **CON** (Content) | MDX blog taslak, başlık optimizasyonu, tag tutarlılığı, içerik takvimi |
| **BRD** (Brand) | Renk/tipografi tutarlılığı, OG image üretimi, ikon, görsel sistem |
| **SOC** (Social) | LinkedIn/X/Instagram için ayrı taslaklar (draft-only model) |

---

## Kurulum

```bash
# 1. Marketplace olarak ekle
/plugin marketplace add hsendil/hs-site-team

# 2. Plugin'i kur
/plugin install hs-site-team@hs-site-team
```

Kurulum sonrası Claude Code yeniden başlatılır; trigger kelimesi (`hs-site`, `webmaster`, `og image` vb.) gördüğünde skill devreye girer.

---

## Kullanım Örnekleri

```
# Orchestrator'ı çağır, plan yap
hs-site-po — site için Sprint 4 planı çıkar

# Webmaster'a doğrudan görev ver
webmaster — Lighthouse skoru ölç, 90 altı kategorileri düzelt

# İçerik üret
content — "Agent Skills nasıl çalışır" yazısı için MDX taslağı hazırla

# OG image yenile
brand — yeni blog yazısı için opengraph-image güncelle

# Sosyal medya taslakları
social — son blog yazısı için LinkedIn + X + Instagram taslakları üret
```

---

## Bu repo neden var?

İki amacı var:

1. **Pratik:** hayrettinsendil.tr'yi günlük yönetmek (kod, içerik, SEO, marka).
2. **Vitrin:** Claude Code'da multi-agent orchestration pattern'inin canlı örneği — danışmanlık ve eğitim referansı.

> **Not:** Site kodu bu repo'da **değil**. Site repo'su (`hsendil/hayrettinsendil`) private; bu plugin GitHub MCP ile o repo'ya commit yapar.

---

## Dokümantasyon

- [Architecture Decision Log](docs/architecture.md) — Niye 6 ajan, niye references/ lazy load, niye Claude Code (vs Cowork) — her kararın gerekçesi
- [Pattern Notes](docs/patterns.md) — Sub-agent isolation, lazy loading, context engineering, orchestrator-worker — kendi projende uygulanabilir öğretici notlar
- [CHANGELOG](CHANGELOG.md)

---

## Yazan

Hayrettin Şendil, PMP — AI / Context Engineering Eğitmeni
PMP + 8 Anthropic sertifikası · 21+ yıl BT operasyon deneyimi
[hayrettinsendil.tr](https://hayrettinsendil.tr) · [LinkedIn](https://www.linkedin.com/in/eniac)

MIT lisanslı. Pull request açın, fork'layın, kendi projenize uyarlayın.

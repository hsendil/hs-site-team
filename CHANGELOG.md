# Changelog

Tüm önemli değişiklikler bu dosyada belgelenir.
Format: [Keep a Changelog](https://keepachangelog.com/tr/1.0.0/) · SemVer.

## [1.1.0] — 2026-05-26

Minor sürüm — ilk MCP zinciri otomasyonu (Faz 2 Sprint 1).

### Eklendi
- **Chain 2: Vercel Deploy Triage** — her 6 saatte bir otomatik (GitHub Actions cron)
  - `.github/workflows/chain2-deploy-triage.yml` — cron + manuel tetik
  - `scripts/run-deploy-triage.sh` — Vercel API → Claude analiz → Notion kaydı (uctan uca implementasyon)
  - `scripts/README.md` — setup, secrets, risk, maliyet rehberi
- **Pattern P10:** Otonom CI/CD gözlemcisi — LLM-based incident triage (yeni pattern, sonraki commit'te docs/patterns.md'ye eklenecek)

### Mimari
- Plugin **hem chat-driven** (Claude Code) **hem otonom** (GitHub Actions cron) işler
- Ajan tanımları tek kaynak: `skills/hs-site-po/references/WEB.md` Claude API system prompt olarak kullanılır (context isolation korunur)
- Notion `pages` API ile her incident yeni sayfa (parent page UUID `NOTION_INCIDENT_DB` secret'ı)

### Gereken kullanıcı adımları
GitHub Actions secrets (6 adet): `ANTHROPIC_API_KEY`, `VERCEL_TOKEN`, `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`, `NOTION_API_KEY`, `NOTION_INCIDENT_DB`. Detay: `scripts/README.md`.

### Sonraki
- Sprint 2: Chain 1 (içerik radarı — GCal → CON → Notion)
- Sprint 3: Chain 3 (sertifika pipeline — Gmail → CON → site)

---

## [1.0.1] — 2026-05-25 (akşam)

Patch sürüm — dokümantasyon + canlı vaka kaydı.

### Eklendi
- **ADR-009:** SSR inline JSON-LD > Script `afterInteractive` — canlı vaka kaydı

### Vakaynin kökeni (canlı doğrulama)
- Plugin v1.0 kurulumu sonrası ilk smoke test — PO `hs-site-po` baseline audit tetikledi
- WEB + SEO ajanlar paralel çalıştı, sonuç: site genelinde 0 JSON-LD + 2 P0 canonical bug + 4 unique-OG eksikliği
- WEB ajan tek brief'le 4 dosyayı fix etti (site repo commit `29f0b29`)
- Vercel deploy READY 31 sn’de, 6/6 canlı check PASS
- Audit raporu Notion'a kalıcı arşivlendi (sayfa ID 36b66a37-ed10-81cd-ab82-d41f438ba996)

### Vitrin değeri
Bu vaka, plugin'in **"auditless trust = bug"** prensibini canlı örnekle kanıtladı. Sahip ve yardımcı (Claude) kodun var olduğuna güvenmişti; multi-agent audit kör noktayı açığa çıkardı.

---

## [1.0.0] — 2026-05-25 (öğleden sonra)

İlk sürüm.

### Eklendi
- Orchestrator skill `hs-site-po` — PO rolü, routing tablosu, onay matrisi
- 5 sub-agent referans dosyası (lazy load): WEB, SEO, CON, BRD, SOC
- Shared context: brand.md (renk/font/ton), stack.md (Next.js + Vercel), governance.md (commit + deploy kuralları)
- Mimari karar log: docs/architecture.md (ADR-001 → ADR-008)
- Pattern notları (öğretici): docs/patterns.md
- README (TR + EN), MIT License, plugin manifest

### Mimari kararlar
- Tek skill, references/ altında lazy sub-agent dosyaları (r34-team pattern)
- Chat-driven tetik (Cowork scheduled değil)
- Tam otonom commit + deploy (site repo'sundaki tüm değişiklikler doğrudan push)
- Social: draft-only (LinkedIn/X/Instagram için API'ler yetersiz veya ücretli)
- Plugin repo public, site repo private — vitrin gücü

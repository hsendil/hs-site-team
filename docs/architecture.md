# Architecture Decision Log

> Her mimari kararın **neden** verildiği, hangi alternatiflerin elendiği ve sonuçlarının ne olduğu.
> Format: hafif ADR (Architecture Decision Record).

---

## ADR-001: Multi-agent yapısı — niye 6 ajan (PO + 5)?

**Tarih:** 2026-05-25
**Durum:** Kabul edildi

### Bağlam
hayrettinsendil.tr kişisel bir marka sitesi. İş yükü: kod bakımı, blog, SEO, marka, sosyal medya. Tek-ajan modu ("Claude, şunu yap") koşturuyor ama:
- Context window her seferinde her şeyi yüklüyor (token israfı)
- Domain ayrımı yok — marka kararı için stack bilgisi gereksiz
- Vitrinleme amacı (danışmanlık vakası) öğretici bir mimari gerektiriyor

### Karar
Product Owner orchestrator + 5 uzman sub-agent (Webmaster, SEO, Content, Brand, Social).

### Alternatifler
| Seçenek | Avantaj | Dezavantaj | Neden Eleendi |
|---|---|---|---|
| **Tek skill** (her şey içeride) | Basit, hızlı setup | Context şişkin, domain sınırsız | Öğretici değil, token-pahalı |
| **2 ajan** (PO + Generic) | Az karmaşıklık | Hala domain ayrımı yok | Vitrin gücü düşük |
| **12 ajan** (r34-team'in kopyası) | Tam kapsam | Kişisel site için aşırı | Yönetilemez, boş koltuklar |
| **PO + 5 (seçilen)** | Domain ayrımı net, büyüyebilir | 7 dosya yönetimi | Optimal denge |

### Sonuç
Her ajan kendi referans dosyasında (50-100 satır) odaklı talimat alıyor. Context isolation ile token tasarrufu sağlanıyor. Security ve Growth ileride 7. ve 8. ajan olarak eklenebilir (açık kapı).

---

## ADR-002: Lazy loading — niye sub-agent'lar references/ altında?

**Tarih:** 2026-05-25
**Durum:** Kabul edildi

### Bağlam
Claude Code skill paketinde tüm dosyalar default yüklenmez. Frontmatter'ı olan SKILL.md tetikleyiciye göre yüklenir. Sub-agent dosyaları ayrı skill yapılabilir veya references/ altında olabilir.

### Karar
Tek skill (`hs-site-po`), sub-agent'lar `references/` altında lazy-loaded markdown dosyaları.

### Alternatifler
| Seçenek | Token davranışı | Kompleksite | Neden Eleendi/Seçildi |
|---|---|---|---|
| **6 ayrı skill** (her ajan = skill) | Her skill ayrı frontmatter, ayrı trigger | Yüksek — 6 SKILL.md yönetimi | Trigger çakışması riski, koordinasyon zor |
| **Hepsi SKILL.md içinde** | Her seferinde tümü context'te | Basit | Token-pahalı, blog yazısı yazarken brand kuralları da context'e giriyor |
| **references/ altında lazy (seçilen)** | Sadece ihtiyaç anında yüklenir | Orta | Token tasarrufu + domain ayrımı + tek trigger |

### Sonuç
- PO `Read references/WEB.md` ile sadece ilgili sub-agent'ı çağırır
- "Blog yaz" → sadece CON.md yüklenir, diğer 4 referans context'e girmez
- Tahmini token tasarrufu: %40-60 (göreve göre)

### Referans
r34-team v1.0 pattern — 12 sub-agent için aynı yapı kullanılıyor.

---

## ADR-003: Tam otonom commit + deploy (vs PR ile onay)

**Tarih:** 2026-05-25
**Durum:** Kabul edildi

### Bağlam
Site repo'sundaki değişiklikler için iki yaklaşım:
1. Ajan direkt `main`'e push (Vercel hemen deploy eder)
2. Ajan branch açıp PR gönderir, sahip review eder, merge eder

### Karar
Tam otonom: ajan direkt `main`'e push, Vercel auto-deploy.

### Gerekçe
- **Chat-driven model:** sahip her komutu kendi başlatıyor — implicit onay var
- **Vercel rollback bir tık:** dashboard → önceki deploy → "Promote to Production"
- **Tek geliştirici:** PR review yapacak ikinci kişi yok, PR açıp kendi onaylamak teatrikal
- **Git history korunur:** her commit revert edilebilir
- **Hız:** küçük düzeltmeler için PR overhead'i orantısız

### Risk Profili
| Risk | Olasılık | Etki | Kontrol |
|---|---|---|---|
| Yanlış commit prod'a gider | Düşük | Orta | Vercel rollback + git revert |
| Sahip onaylamadan kritik değişiklik | Düşük (chat-driven) | Yüksek | `published: false` default + onay matrisi (örn. renk değişikliği) |
| Build kirilirsa site downtime | Çok düşük | Yüksek | Vercel atomic deploy — hata olursa önceki sürüm aktif kalır |

### İstisnalar (onay zorunlu)
`shared/governance.md` onay matrisinde:
- Yayın (`published: true`)
- Renk paleti değişikliği
- Sosyal medya postu (SOC draft-only)
- Dependency major bump
- `env` / secret

---

## ADR-004: Social ajan — draft-only vs full automation

**Tarih:** 2026-05-25
**Durum:** Kabul edildi

### Bağlam
Sosyal medya postlarını ajan otomatik atabilir mi? Teknik olarak:
- LinkedIn: resmi MCP yok, API şirket sayfasına uygun, kişisel profil zor
- X: API Premium gerekli ($200/ay), OAuth setup
- Instagram: Business account + Meta Graph API

### Karar
Draft-only — SOC ajan asla post atmaz, sadece 3 platform için 3 ayrı taslak üretir.

### Gerekçe
- **Reputational risk:** sahip adına yanlış post = uzun-vadeli zarar
- **Bütçe:** X API Premium gereksiz harcama (sahip karar verir)
- **Yasal:** Instagram Business hesap dönüşümü kalan kullanıcı hesabını etkiler
- **Industry standard:** yüksek-risk eylemlerde "ajan üretir, insan yayınlar" yaygın pratik

### Sonuç
SOC ajan için **Draft-only safety pattern** uygulandı. Pattern detayı: `docs/patterns.md`.

### Gelecek
Sahip X API Premium alırsa veya Buffer/Hootsuite entegrasyonu düşünülürse SOC ajan yeniden değerlendirilir (v2.0).

---

## ADR-005: Chat-driven vs scheduled vs event-driven

**Tarih:** 2026-05-25
**Durum:** Kabul edildi (Faz 1)

### Bağlam
Ajanlar 3 yolla tetiklenebilir:
1. Chat-driven — sahip Claude Code'da komut yazar
2. Scheduled — cron/scheduled task (Cowork veya GitHub Actions)
3. Event-driven — GitHub webhook (PR açılınca QA çalışır)

### Karar
Faz 1: Chat-driven yalnızız.

### Gerekçe
- En basit, tüm öğrenme avantajları burada
- Scheduled task öğrenme egzersizini böler — ek altyapı (Cowork veya GH Actions)
- Event-driven daha ileri seviye — webhook setup, secret yönetimi

### Gelecek
- Faz 2: Scheduled task (haftalık SEO raporu, Cuma blog öneri)
- Faz 3: Event-driven (PR'da QA ajan otomatik audit)

---

## ADR-006: Claude Code plugin (vs Claude Desktop skill paketi vs Cowork)

**Tarih:** 2026-05-25
**Durum:** Kabul edildi

### Bağlam
Aynı SKILL.md formatı üç ortamda kullanılabilir:
- Claude Desktop — ZIP yapıp Customize/Skills/Upload
- Claude Cowork — farklı plugin manifest, lokal sessions altı
- Claude Code (CLI) — GitHub repo + marketplace, `/plugin install`

### Karar
Claude Code plugin formatı.

### Gerekçe
- **GitHub-native:** repo zaten public vitrin — marketplace install URL'i paylaşılabilir
- **Versiyonlu dağıtım:** git tag + `/plugin update` ile yeni sürüm
- **Öğrenme:** Claude Code CLI Anthropic'in flagship developer aracı — danışmanlık vakası için en değerli
- **Sub-agent / Task tool ekosistemi:** Claude Code'da Task tool ile programmatic sub-agent çağrısı mümkün

### Trade-off
- Cowork'ten farklı olarak GUI yok — her şey CLI'dan
- Marketplace install adımı yeni kullanıcı için öğrenme eğrisi

---

## ADR-007: Plugin repo public, site repo private

**Tarih:** 2026-05-25
**Durum:** Kabul edildi

### Bağlam
İki repo var:
1. `hsendil/hayrettinsendil` — site kodu (Next.js + env vars + içerik)
2. `hsendil/hs-site-team` — plugin (SKILL.md + dokümantasyon)

Her ikisi de public, ikisi de private, veya karışık mı?

### Karar
- Site repo: **private** (içerik draft'ları, env vars, kişisel kod stratejisi)
- Plugin repo: **public** (vitrin gücü, danışmanlıkta paylaşılabilir)

### Sonuç
- Mimariyi inceleyenler plugin repo'sundan tam görüş alır
- Kişisel veriler ve commit history (yazı taslakları, env değişiklikleri) site repo'da kalır
- Vitrin gücü maksimum, güvenlik korunur

---

## ADR-008: Single-branch flow (vs trunk + feature branch)

**Tarih:** 2026-05-25
**Durum:** Kabul edildi

### Bağlam
Tek geliştirici (sahip + Claude Code), Vercel auto-deploy, kişisel site. Branch stratejisi opsiyonları:
1. Sadece `main`, her commit prod'a gider
2. `main` + `feature/*`, PR ile merge
3. `main` + `dev` + feature

### Karar
Sadece `main`.

### Gerekçe
- Tek geliştirici — PR overhead'i ödülündan büyük
- Vercel rollback hızlı — yanlışlıkla bozulursa 1 tık geri
- Atomic deploy — build fail → önceki sürüm aktif kalır, downtime yok
- Sade tarihçe — git log doğrudan okunabilir

### İstisna
Büyük mimari değişiklik (örn. Next.js major upgrade) geçici branch açılabilir, ama default `main`.

---

## ADR-009: SSR inline JSON-LD > Script afterInteractive (canlı vaka)

**Tarih:** 2026-05-25 (akşam)
**Durum:** Kabul edildi — bug fix uygulandı (site repo commit `29f0b29`)

### Bağlam
hayrettinsendil.tr `layout.tsx`'inde Person JSON-LD schema'ı `next/script` ile `strategy="afterInteractive"` olarak inject ediliyordu:

```tsx
<Script
  id="person-schema"
  type="application/ld+json"
  strategy="afterInteractive"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
/>
```

Aynı pattern blog detay sayfasında Article schema için de kullanıldı. Plugin v1.0 kurulumu sonrası **ilk smoke test** — PO baseline audit sonucu: **site genelinde 0 JSON-LD bloku**. Kod doğru görünüyor ama HTML response'unda yok.

### Kök Neden
`strategy="afterInteractive"` Next.js'in JS bundle yüklendikten sonra script'i HTML'e enjekte eden modu. Sonuç:

- Initial HTML response'da `<script type="application/ld+json">` **YOK**
- Yalnızca tarayıcıda JS render olduktan sonra DOM'a inject
- **Crawler etkisi:**
  - Google bot çoğunlukla JS render eder, ama **first-pass crawl**'da göremez (ilk index yavaşlar)
  - LinkedIn / X / Slack / Facebook bot'ları **JS render etmez** → rich preview'de schema verisi yok
  - Rich Results Test ilk pass'te fail edebilir

### Karar
Tüm JSON-LD schema'lar **SSR inline** olarak render edilmeli:

```tsx
<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
/>
```

`next/script` yerine plain `<script>` (server-rendered, initial HTML'de bulunur).

### Alternatifler
| Seçenek | Avantaj | Dezavantaj | Karar |
|---|---|---|---|
| **Script `afterInteractive`** | Next.js native, perf cilası | Crawler'a görünmez | **Eleendi (gerçek bug)** |
| **Script `beforeInteractive`** | Daha erken inject | Hala JS bağımlı, marjinal kazanç | Bot uyumluluğu garantilenemez |
| **SSR inline `<script>` (seçilen)** | Initial HTML'de mevcut, tüm bot'lar görür | Performans bedeli yok (statik string) | **Seçildi** |
| **JSON-LD route handler** (`/schema.json`) | Cache control | Ekstra HTTP request, runtime cost | Aşırı mühendislik |

### Vaka — Bug Tespiti ve Fix

- **Audit:** 2026-05-25 baseline (plugin install sonrası ilk smoke test)
- **Tespit:** SEO ajan HTML'de `<script type="application/ld+json">` ararken hiç bulamadı (site geneli)
- **Fix:** WEB ajan brief'i, tek commit (4 dosya, +108/-38 LOC):
  - `src/app/layout.tsx` — Person + WebSite SSR inline
  - `src/app/blog/[slug]/page.tsx` — BlogPosting + BreadcrumbList SSR inline
  - `src/app/about/page.tsx` — canonical + per-page OG/Twitter
  - `src/app/blog/page.tsx` — canonical + per-page OG/Twitter
- **Commit:** `29f0b29` — `feat(seo): baseline P0 fixes — canonical + per-page metadata + inline JSON-LD`
- **Deploy:** Vercel READY 31 sn (atomic, zero-downtime)
- **Doğrulama:** 6/6 canlı check PASS

### Ders (genel pattern)
**SEO için JS-injected schema yetersiz.** Schema markup statik HTML zorunluluğu — bu kural Next.js dışında Vue, Svelte, React Router gibi tüm SSR framework'lerde geçerli.

**Bonus ders — plugin gerçek değer üretti.** Sahip ve "yardımcı" (Claude) kodun var olduğuna güvenmişti; SKILL'lerde "JSON-LD eklendi" yazıyordu. Ajan-bazlı baseline audit kör noktayı gösterdi.

> **Auditless trust = bug.** Pre-flight check + baseline audit, multi-agent setup'ın en değerli yan ürünü.

### Yan ürün
Bu vaka blog yazısı serisinin 1. yazısının (`Kişisel siteyi 7 ajanlı takım nasıl yönetir?`) ana hikayesidir. Pattern aynı zamanda `docs/patterns.md` Pattern 6 (Pre-flight Check) gerçek uygulaması.

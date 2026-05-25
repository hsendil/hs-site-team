# Blog Yazı Planı — 3 Yazılık Seri

> Bu plugin'in danışmanlık vitrini olması için 3 yazılık seri.
> hs-content ajanının ilk işi: bu outline'a göre yazıları MDX taslak olarak yazar.
> Sahip yayın kararı verir.

---

## Yazı 1: "Kişisel siteyi 7 ajanlı takim nasıl yönetir? — Claude Code multi-agent vakası"

### Hedef Kitle
Klaude AI / Claude Code'a ilgi duyan Türkçe konuşan teknik profesyoneller. Yönetici / danışman rollerı için de.

### Ana Mesaj
Kişisel site bile karmaşık yeterse uzmanlaşmış ajan takımıyla yönetilebilir. Bu hem zaman tasarrufu hem öğretici bir çerçeve. Gerçek bir vaka üzerinden adım adım mimari + karar gerekçesi.

### Bölüm Yapısı
1. **Açılış hook'u** — "hayrettinsendil.tr'yi tek başıma yönetiyordum. Şimdi 6 ajan yönetiyor"
2. **Sorun** — kişisel sitenin günlük iş yükü (kod, içerik, SEO, marka, sosyal) — tek-ajan modunun sınırları
3. **Çözüm mimari** — Orchestrator (PO) + 5 sub-agent (WEB, SEO, CON, BRD, SOC) — görsel diyagram
4. **Niye 6 ajan?** — ADR-001 özeti (alternatifler: 1 ajan, 12 ajan, 2 ajan — niye optimal nokta 6'da)
5. **Karar anı:** otonom commit + chat-driven — risk profili tablosu
6. **İlk hafta sonuçları** — (3 blog yazısı, 4 OG image, 6 commit, Lighthouse 90+)
7. **Görebileceğiniz yer:** github.com/hsendil/hs-site-team — fork yapip kendi projende uygula
8. **Sonuç** — "Asıl soru: kendi iş akışınızı hangi 3 ajana bölerdiniz?"

### Anahtar Kelimeler (SEO)
- claude code multi-agent
- claude code plugin
- agent skills türkçe
- context engineering vaka
- claude orchestrator

### Frontmatter Önerisi
```yaml
title: "Kişisel siteyi 7 ajanlı takim nasıl yönetir? — Claude Code multi-agent vakası"
summary: "hayrettinsendil.tr'yi yöneten 6 ajanlı takimin mimarisi: orchestrator + 5 sub-agent, ADR'lar ve pattern notlarıyla."
tags: ["Claude Code", "Agent Skills", "Context Engineering", "AI"]
```

### Tahmini
Uzunluk: 1200-1500 kelime · Okuma: 6-8 dk

---

## Yazı 2: "Claude Code plugin sıfırdan: skill paketleme, marketplace ve yüksek-leverage pattern'ler"

### Hedef Kitle
Claude Code kullanan veya kullanmak isteyen geliştiriciler. Plugin yazıp paylaşmak isteyenler.

### Ana Mesaj
Claude Code plugin yazmak GitHub repo + 1 JSON dosyası + SKILL.md'ler. Ama doğru pattern'lerle yazarsan plugin **öğretici** bir vitrin olur, **buharlaşmış öğrenme**ye dönmez.

### Bölüm Yapısı
1. **Hook** — "3 saatlik bir oturum sonunda public bir Claude Code plugin'im vardı"
2. **Plugin formatı nedir?** — `.claude-plugin/plugin.json` minimum, dizin yapısı (skills/, commands/, agents/, hooks/)
3. **Marketplace nedir?** — plugin repo vs marketplace repo farkı
4. **İlk hatalar (gotcha'lar)** — "`.claude-plugin/` içinde skills/ koymak", "description eksikliği"
5. **Öğretici pattern: lazy reference loading** — references/ altı vs ayrı skill (token tasarrufu örneği)
6. **Öğretici pattern: orchestrator-worker** — r34-team pattern uygulaması
7. **Kurulum + smoke test** — `/plugin marketplace add` → `/plugin install` → trigger
8. **Sonuç + repo linki** — "Bu plugin'in tüm kaynak kodu: github.com/hsendil/hs-site-team"

### Anahtar Kelimeler (SEO)
- claude code plugin nasıl yazılır
- claude code marketplace
- agent skills paketleme
- claude plugin türkçe
- skill.md format

### Frontmatter Önerisi
```yaml
title: "Claude Code plugin sıfırdan: paketleme, marketplace, pattern'ler"
summary: "GitHub repo + plugin.json + SKILL.md ile Claude Code plugin yazmak. Yaptıklarım, gotcha'lar ve yüksek-leverage pattern'ler."
tags: ["Claude Code", "Agent Skills", "Context Engineering"]
```

### Tahmini
Uzunluk: 1500-1800 kelime · Okuma: 8-10 dk

---

## Yazı 3: "Sub-agent orchestration ve token ekonomisi — 5 ajanlı takimde context isolation pratiklerim"

### Hedef Kitle
LLM mimarıları, prompt mühendisleri, context engineering ile ilgilenenler. Ileri seviye.

### Ana Mesaj
Multi-agent setup'ın "tatlı noktası" sadece teknik karar değil — token ekonomisi kararı. Lazy loading, single source of truth ve handoff pattern'leri ile nasıl %40-60 token tasarrufu sağladığımı örnek koddan göstereyim.

### Bölüm Yapısı
1. **Hook** — "Her sub-agent her sohbete yükleniyorsa context window'unuz ağlıyor demektir"
2. **Context isolation nedir?** — her ajan kendi domain bilgisini taşır, diğerinin context'i ile kirletilmez
3. **Pattern 1: Lazy reference loading** — kod örneği (SKILL.md + references/ tablo)
4. **Pattern 2: Single Source of Truth (shared/)** — marka/stack/governance ortak, drift yok
5. **Pattern 3: Handoff noktaları** — sub-agent birbirini doğrudan çağırmaz, PO koordineli
6. **Ölçüm** — "Aynı görev: tek-skill yaklaşımı (12K token) vs lazy-loaded sub-agent (4.5K token)"
7. **Ne zaman lazy etmemeli?** — her zaman lazy değil; ortak context (brand) hot-loaded olabilir
8. **Sonuç** — "Token ekonomisi prompt mimarisinin gizli karar parametresi"

### Anahtar Kelimeler (SEO)
- context engineering token
- claude token optimization
- sub-agent orchestration
- lazy loading skill
- multi-agent context isolation

### Frontmatter Önerisi
```yaml
title: "Sub-agent orchestration ve token ekonomisi: 5 ajanlı takimde çıkardıklarım"
summary: "Lazy loading, single source of truth ve handoff pattern'leri ile 5 sub-agent context'inde %40-60 token tasarrufu nasıl sağlandı."
tags: ["Context Engineering", "Agent Skills", "Claude", "AI"]
```

### Tahmini
Uzunluk: 1800-2200 kelime · Okuma: 10-12 dk

---

## Yayın Takvimi (öneri)

| Hafta | Yazı | Sebep |
|---|---|---|
| Hafta 1 (2026-W22) | Yazı 1 (mimari vaka) | Geniş kitle, plugin tanıtımı |
| Hafta 3 (2026-W24) | Yazı 2 (plugin nasıl yazılır) | Teknik kitleyi yakala |
| Hafta 5 (2026-W26) | Yazı 3 (token ekonomisi) | Derin teknik kitle, vitrin tepe noktası |

Her yazı sonrası SOC ajan LinkedIn + X + Instagram taslakları üretir.

---

## Co-publication Fırsatları
- **LinkedIn Newsletter** — "AI / CE Notları" newsletter eklerimden duyuru
- **Dev.to / Hashnode** — EN versiyonu cross-post (sonraki sprint)
- **Anthropic topluluk forumu** — plugin vitrini olarak repo'yu paylaş

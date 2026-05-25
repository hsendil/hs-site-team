# Pattern Notes — Öğretici Notlar

> Bu dosya kendi multi-agent projende uygulanabilir pattern'leri anlatır.
> Her pattern: **ne**, **niye çalışır**, **bu repo'da nerede**, **nasıl uygularsın**.

---

## P1 — Orchestrator-Worker

### Ne
Merkezi bir orchestrator (Product Owner) talebi parçalar ve uzman sub-agent'lara dağıtır. Sub-agent'lar dar kapsamlı, orchestrator koordineli.

### Niye Çalışır
- **Cognitive load**: sahip tek arabirim ile konuşur (PO), karmaşık ekibi yönetmesi gerekmez
- **Context isolation**: her sub-agent kendi alanının bilgisini taşır, diğerlerinin context'i ile kirletilmez
- **Specialization**: marka kararı vermek için stack bilgisi gereksiz — BRD ajanı sadece brand.md okur

### Bu Repo'da
- `skills/hs-site-po/SKILL.md` orchestrator
- `skills/hs-site-po/references/*.md` 5 sub-agent
- Routing tablosu (SKILL.md §3): talep → hangi ajan(lar)

### Nasıl Uygularsın
1. Bir orchestrator skill yaz: `<proje>-po` veya `<proje>-orchestrator`
2. Sorumluluk alanlarını ayır: kod, içerik, marka, güvenlik, vb.
3. Her alan için references/`XX.md` (kod adı 2-3 harf)
4. Routing tablosu yaz: talep → ajan(lar) → handoff noktaları

---

## P2 — Lazy Reference Loading

### Ne
Dokümanlar default yüklenmez — ajan ihtiyacı görünce `Read` ile yükler.

### Niye Çalışır
- **Token ekonomisi**: kişisel site için bile 5 sub-agent + shared = ~3000 token. Hepsi her sohbete yüklense pahalı.
- **Hedefli yükleme**: blog yazarken brand kurallarını okumana gerek yok (çoğunlukla)
- **Scale**: takim büyüdükçe (10+ ajan) lazy loading kritik hale gelir

### Bu Repo'da
- Tek `SKILL.md` yüklenir (description trigger eşleşince)
- `references/WEB.md` sadece WEB ajan görevi geldiğinde okunur
- `shared/brand.md` sadece marka/görsel sorgusunda

### Nasıl Uygularsın
```markdown
## 7. REFERANS DOSYALARI (Lazy Load)

| Dosya | Yüklenme koşulu |
|---|---|
| references/WEB.md | Frontend / component görevi |
| references/BRD.md | Renk / font / görsel görevi |
```
Bu tabloyu SKILL.md'ye koy. Orchestrator karar verir, ilgili dosyayı `Read` ile yükler.

---

## P3 — Single Source of Truth (Shared Context)

### Ne
Birden fazla ajanın paylaştığı bilgi (renk, stack, kurallar) tek bir yerde tutulur. Her ajan kendi kopyasını taşımaz, ihtiyaç anında okur.

### Niye Çalışır
- **Drift yok**: renk hex'i kodda da brand.md'de de varsa, hangisinin doğru olduğu belirsizleşir. Tek otorite → drift olmaz.
- **Tek noktadan güncelleme**: yeni dependency eklendi mi? `stack.md` güncelle. Her ajan otomatik güncel sürümle çalışır.

### Bu Repo'da
- `shared/brand.md` — renk + font + ton (BRD, WEB, CON okur)
- `shared/stack.md` — Next.js + Vercel + GA4 (WEB, SEO okur)
- `shared/governance.md` — commit + branch + deploy (her ajan okur)

### Nasıl Uygularsın
1. "Bu bilgiyi hangi ajan ihtiyaç duyar?" — 1'den fazlası ise → shared/
2. Sub-agent dosyasında **içeriği tekrarlama** — sadece referans: `Bak: shared/brand.md`
3. Update'lerde tek dosyayı güncelle, tüm ajanlar otomatik faydalanır

---

## P4 — Draft-Only Safety Pattern

### Ne
Yüksek-risk eylemler (sosyal paylaşım, e-posta blast, finansal işlem, kullanıcı verisi gönderme) için ajan **üretir, insan yayınlar**.

### Niye Çalışır
- **Reputational risk:** sahip adına yanlış içerik = uzun-vadeli zarar
- **Reversibility yok:** sosyal paylaşım geri alınmıyor (silinse bile screenshot kalır)
- **Industry standart:** Notion AI, Loom, Calendly hep "draft → human send" modeli

### Bu Repo'da
- `references/SOC.md` — SOC ajan **asla** post atmaz, 3 platform için 3 taslak üretir
- `references/CON.md` — blog yazısı `published: false` default, sahip `true` yapar

### Nasıl Uygularsın
```markdown
## Operasyon Modeli: DRAFT-ONLY

**Bu ajan asla [aksiyon] yapmaz — nedenler:**
- [risk 1]
- [risk 2]

**Ne yapar:** [draft üretir, format önerir]
**Sonra:** sahip kontrol → [insan yayınlar/gönderir]
```

---

## P5 — Convention over Configuration

### Ne
Konvansiyon (varsayılan davranış) ile yapılandırma maliyetini düşür. Default'larla %80 vaka için setup gereksiz.

### Niye Çalışır
- **Boilerplate yok**: her sub-agent için yeniden plugin tanımı yazmıyorsun
- **Anlayışı hızlandırır**: "references/ altı = lazy" gibi konvansiyon öğrenince tüm ajanlara uyar
- **Öğrenme eğrisi düşer**: yeni ajan eklemek = yeni dosya, ek registration yok

### Bu Repo'da
- **3-harfli ajan kodları**: WEB, SEO, CON, BRD, SOC (kısa, ezberlenebilir, token-cheap)
- **`references/<KOD>.md`** convention — her ajan aynı path yapısında
- **Next.js `opengraph-image.tsx`**: bu dosya `<route>/opengraph-image` URL'sini otomatik üretir, manuel link gerekmez
- **`generateStaticParams`**: her slug için pre-render, manuel route listesi yazma

### Nasıl Uygularsın
- Konvansiyon belirle: dosya naming (kebab-case), klasör konumları, frontmatter alanları
- README'de tek paragraf açıkla: "Ajan eklemek için `references/<KOD>.md` yarat, SKILL.md'ye tabloya ekle."
- Default'ları framework'ün convention'ıyla hizala (Next.js file-based routing gibi)

---

## P6 — Pre-flight Check

### Ne
Kod yazmadan / commit etmeden / deploy etmeden önce **mevcut durumu oku**.

### Niye Çalışır
- **Halüsinasyon önlemi**: "webmaster Next.js 14 için kod yazar" derken gerçekte 16 kuruluysa hata
- **Idempotency**: aynı görev tekrar çalıştırılınca side-effect olmamalı
- **Conflict önleme**: başka ajan/kişi değiştirmişse üzerine yazmamak

### Bu Repo'da
- `WEB.md` Kurallar: "Import önce package.json kontrol"
- `SEO.md` Kurallar: "GSC + Lighthouse ile mevcut durum ölçülür” (audit-first)
- `governance.md` Build doğrulama: "Vercel `state: READY` bekle, sonra raporla"

### Nasıl Uygularsın
Her sub-agent SKILL.md'ye "Pre-flight" bölümü ekle:
```markdown
## Pre-flight (kod yazmadan önce)
1. package.json oku
2. Mevcut dosya yapısını listele
3. İlgili stack.md bölümünü kontrol et
```

---

## P7 — Onay Matrisi (Authority Boundary)

### Ne
Her ajan için: hangi aksiyon **otonom**, hangisi **sahip onayı zorunlu**. Açık tablo.

### Niye Çalışır
- **Belirsizlik yok**: "sahip onaylar mı?" sorusu her seferinde sorulmaz — tabloda yazar
- **Güvenlik sınırı**: tam otonom modunda bile kritik aksiyonlar (renk değişikliği, env) korunur
- **Öğretici**: vitrin için kim hangi yetkiye sahip net

### Bu Repo'da
- `SKILL.md` §4 Onay Matrisi (orchestrator seviyesi)
- Her sub-agent dosyasında **Otonomi Sınırı** bölümü
- `shared/governance.md` Otonom vs Onay tablosu

### Nasıl Uygularsın
```markdown
## Otonomi Sınırı
- ✅ Otonom: [düşük-risk, geri alınabilir]
- ❌ Sahip onayı: [yüksek-risk, geri alınmaz, müteci karar]
```

---

## P8 — Handoff Noktaları

### Ne
Sub-agent görevini bitirdiğinde sonraki ajan(lar)a açık devir notası. PO koordineli, ajanlar birbirini doğrudan çağırmaz.

### Niye Çalışır
- **Tek tüccet** her ajanda kalır (kendi alanında)
- **Tracking**: handoff noktaları üzerinden İş akışı takip edilebilir
- **Coordination oçu**: PO konsolide eder, sub-agent'lar tekrar iş yapmaz

### Bu Repo'da
Her sub-agent dosyasında **Handoff Noktaları** bölümü:
```
## Handoff Noktaları
- Yeni sayfa → SEO ajanı metadata + sitemap güncellesin
- Yeni component görsel kullanıyorsa → BRD ajanı brand kontrol
```

### Nasıl Uygularsın
Her sub-agent SKILL.md'ye "Handoff" yaz, PO routing tablosunda referans ver. Ajanlar tamamlayıp PO'ya raporlar, PO sonraki ajanı çağırır.

---

## P9 — Vitrin Olarak Plugin

### Ne
Plugin sadece iş aracı değil, **vaka çalışması**. Her karar belgelenir, public repo'da paylaşılır.

### Niye Çalışır
- **Danışmanlık**: "şu repo'ya bak” demek konferans/müşteri konuşmasında en güçlü kanıt
- **Belgelenmemiş öğrenme buharlaşır**: 3 ay sonra "niye böyle yaptım" diye düşünmemek için karar logu
- **Topluluk geri dönüşü**: public repo issue/PR yoluyla pattern'lerin doğrulanması

### Bu Repo'da
- `docs/architecture.md` — her kararın ADR'i (8 karar)
- `docs/patterns.md` — bu dosya, 9 pattern
- `README.md` (TR) + `README.en.md` — çift dilli giriş
- MIT lisans — fork serbest

### Nasıl Uygularsın
- ADR formatı kullan: Bağlam / Karar / Alternatifler / Sonuç
- Her major patternin **niye** çalıştığını yaz — sadece **nasıl** yetmez
- Türkçe ürettiğin içeriği EN'e çevir — niche kazanımı çift

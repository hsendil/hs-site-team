# Brand Standard · hayrettinsendil.tr

> Tek otorite. Renk, tipografi, ton ve editöryal stil burada tanımlıdır. Tüm ajanlar bu dosyayı kaynak alır.

## Misyon (sahip beyanı, 2026-07-28)

Türkçe AI kaynak boşluğunu kapatmakta öncü olmak. Birinci hedef: yabancı basındaki AI gelişmelerini ve bilimsel makaleleri, sahibin 20+ yıllık operasyon tecrübesinden süzülmüş yorumla ve düzgün atıfla Türk kurumsal okuyucusuna taşımak. Vaka yazıları bu iddianın kanıt katmanıdır. Uygulama çerçevesi: `references/CON.md` → Haftalık İçerik Boru Hattı + Telif ve Atıf Kuralı. Güvenilir kaynak listesi: `sources/kaynaklar.json` + `docs/kaynak-listesi.md`.

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
- Eyebrow text: `#A78BFA`, uppercase, letter-spacing 4px (0.25em). **Uyarı:** Türkçe metinde `uppercase` kullanmadan önce Kural 8'e bak.

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
- **Hint:** Türkçe karakterleri test et; Outfit latin subset Türkçe destekler, latin-ext gerekirse ekle.

---

## EDITÖRYAL STİL KURALLARI (2026-05-26 sahip review · 2026-07-27 ve 2026-08-29 güncellemeleri)

> Bu bölüm tüm yazılı çıktılarda zorunlu: blog, hakkımda, ana sayfa, sosyal medya draft'ları, e-posta. **CON, SOC, BRD, EDT ajanların okuması şart.**

> **Geriye dönük değil (sahip kararı 2026-08-29).** 29.08 kararları yayınlanmış yazılara uygulanmaz; yazılar yazıldıkları haliyle kalır. Kurallar bir sonraki makaleden ve sosyal paylaşımdan itibaren geçerlidir. Eski yazıda kurala aykırı bir kullanım görülmesi bulgu değildir.

### Genel ton
- **Birinci tekil şahıs:** yazıyorum, kuruyorum, öğretiyorum
- Akademik dil yasak
- Kurumsal jargon minimal
- Sayı, tarih, sertifika ID açıkça belirtilir
- Övgü değil kanıt. Sıfat yerine doğrulanabilir olgu: "PMP® + N Anthropic Academy sertifikası" (N veri dosyasından gelir, Kural 9)
- Doğrudan eylem fiili ("yapıyorum", "kuruyorum")
- **Hitap (sahip kararı 2026-07-27):** Blog ve kişisel anlatı **"sen"** (samimi). Dönüşüm yüzeyleri, yani iletişim formu, CTA metinleri, başarı ve hata mesajları, SSS ve /egitimler program metni **"siz"** (kurumsal alıcı muhatap). İki mod aynı cümlede karışmaz; sayfa içinde blok bazında ayrışır.
- **Sicil iması (2026-08-29):** Bugün teslim edilmiş kurumsal program yok. Alışkanlık bildiren birinci tekil geniş zaman ("yılda sınırlı sayıda program alıyorum", "küçük grupları tercih ediyorum") olmayan bir geçmişi ima eder. Edilgen geniş zaman ("kurgulanır", "belirlenir") tasarım beyanıdır ve serbesttir. İlki tasarım kipine çekilir.

### Kural 1 · Em-dash (—) yasak
Em-dash hiçbir çıktıda kullanılmaz. Bu kural sahip talimatıdır ve istisnası yoktur.

**Em-dash yerine kullan:**
- Nokta: "Site var. Şimdi takım yönetiyor."
- Virgül: "Kod yazmadım, takım yazdı."
- Noktalı virgül: "Kod yazmadım; takım yazdı."
- Orta nokta: "Hayrettin Şendil · Ana sayfa"
- Parantez: "X bölümü (Y için)"
- Eğik çizgi: "FE / Frontend"
- İki nokta: "FE: Frontend"

**Kapsam:** yayına giden her metin. `aria-label`, `alt`, `title` ve JSON-LD alanları da buna dahildir; gözle görünmese de üretilen HTML'e girer ve ekran okuyucuya gider. Kod yorumları render edilmediği için kapsam dışıdır.

**Bu dosya da kapsamdadır (2026-08-29).** Standart dosyaları örnekle öğretir; sonraki oturum biçimi kaynaktan kopyalar. Başlık ve ayraç konumunda orta nokta kullanılır. Karakterin kuralın konusu olduğu yerler (yukarıdaki başlık ve tanım) istisna değil zorunluluktur; bir karakteri yasaklayan kural onu adlandırmak zorundadır.

### Kural 2 · Üçüncü tekil şahıs sızıntısı YASAK

Birinci tekil yazılıyor, sahip kendinden "Hayrettin Şendil yazdı" gibi 3. tekil bahsetmiyor.

**Yanlış:**
- "Hayrettin Şendil yazdı"
- "Bu yazıyı Hayrettin Şendil hazırladı"
- "Hayrettin Şendil 20+ yıl tecrübesini paylaşıyor"

**Doğru:**
- İmza kartı: foto + "**Hayrettin Şendil**" + tarih + 2 link (yazı tarzı yok, sadece kart)
- Yazı içinde: "20+ yıllık deneyimimde..."

**İstisna:** h1 başlığı, portre `alt` metni, OG ve Twitter metadata'sı, JSON-LD `Person` ve `VideoObject` alanları. Bunlar yapılandırılmış künye alanlarıdır, prose değildir.

### Kural 3 · AuthorBio Template (kalıcı)

Blog detay sayfası yazı sonu imza bloku **bu şablonu** kullanır:

```
[BW portre 56×56 yuvarlak]  Hayrettin Şendil
                             26 Mayıs 2026 · 4 dk okuma
                             [LinkedIn]  [X]
```

**Spec:**
- Foto: `public/images/about-bw.png` (BW portre)
- İsim: bold, normal büyüklük (text-base)
- Tarih + okuma süresi: sm gri
- 2 sosyal link: minimal text-link
- Border yok, sadece üstte hairline divider
- "yazdı" / "tarafından" YASAK
- Bio cümlesi YOK
- Sertifika/yetenek/yıl YASAK

### Kural 4 · İmla ve Açıklama Netliği

**Yapma:**
- Uzun cümle (40+ kelime), böl
- 2 cümleyi tek cümleye sıkıştırma
- Yüklem önünde dörtten fazla ad öbeği. Türkçede yüklem sonda olduğu için okur bütün öbekleri askıda tutar
- Sürekli parantez içi not ("yani", "demek ki", "başka bir deyişle")
- 4-5 parçalı iki nokta dizilimi
- Sarkan araç öbeği: mastardan sonra virgülle eklenen "...uygulamalarla" gibi kuyruklar

**Yap:**
- Kısa cümleler. Net özne, net fiil.
- Türkçe imla: ek ayırma (`'de`, `'da`), kesme işaretleri doğru, noktalı virgül uygun yerde
- Doğal Türkçe açıklama, Anglo-Sakson parantez çevirisi değil

### Kural 5 · Madde listeleri kontrollü

Madde-itis hastalığından kaç. Liste sadece:
- 3+ paralel öğe
- Adımlar (kronolojik)
- Karşılaştırma (tablo daha iyi)

Yoksa doğal cümle akışı: "Üç şey değişti: kontrast, link rengi, yazar kartı."

### Kural 6 · "biz" yasak

Tek geliştirici, tek yazar. "Biz" denmez. Yazılarda **"ben"** veya **7 ajanlı takım** referansı.

Sahip ile müşteriyi birlikte anlatan cümlelerde de "belirliyoruz" yerine edilgen kalıp kullanılır: "birlikte tanımlanır", "birlikte planlanır".

### Kural 7 · Kaynak açık olmadan sayı yazılmaz (2026-07-27)

> Kök neden kaydı: 26.05.2026 tarihli iki yazı ADR log ve CHANGELOG yanda olmadan hafızadan yazıldı. Sonuç: uydurma metrik ("RAG 380ms"), yanlış tarih ("21 Mayıs"), elenen çözümün reçete diye öğretilmesi. İki ay canlıda kaldı, sosyal medya postlarına sızdı. Yazan ve denetleyen aynı modeldi; fark bağlamdı.

- Her sayısal veya teknik iddia, **yazım anında** kaynağa karşı doğrulanır: ADR log, CHANGELOG, commit, SKILL.md. "Hatırlıyorum" kanıt değildir.
- Doğrulanamayan sayı cümleden çıkar; cümle sayısız ayakta duramıyorsa cümle de çıkar.
- Tahmin ile ölçüm ayrı etiketlenir: kaynakta "tahmini" yazan sayı, yazıda da tahmin diye geçer.
- Metrik kapsamı genişletilemez: "deploy 31 sn", uçtan uca süre olarak sunulamaz.
- Gelecek vaadi (yayın kadansı, "her yazıda X") sahip onayı olmadan yazılmaz.
- **Kaynağı olmayan nicelik yazılmaz.** "Yılda sınırlı sayıda", "örneklerin çoğu", "tüm büyük dil modelleri" gibi ifadeler doğrulanamaz; ya kaynak gösterilir ya nicelik kalkar.
- **İddia ile kanıt ayrılır.** Okurun kendi çıkarması gereken sonucu yazar önden söylüyorsa o cümle iddiadır. Kanıt gösterilemiyorsa cümle çıkar.
- Dış kaynaklı içerikte ek çerçeve: `references/CON.md` → Telif ve Atıf Kuralı.
- Prosedürün tamamı: `references/CON.md` → Kaynak Zorunluluğu bölümü. Denetim: her yazı yayın öncesi EDT'den geçer.

### Kural 8 · Türkçe büyük harf (2026-08-29)

`upper()`, CSS `text-transform: uppercase` ve `textTransform` Latin kuralı uygular: küçük **i** harfini **İ** yerine **I** yapar, ya da tersi bozulmalar üretir.

- **Satori (next/og) dil bilmez.** OG kartlarında `textTransform` KULLANILMAZ; metin elle büyük harfle yazılır.
- **Tarayıcıda `lang="tr"` varken** `uppercase` Türkçe kuralı uygular ve bu sefer İngilizce kelimeleri bozar: "Anthropic" → "ANTHROPİC". İçinde küçük i geçen İngilizce kelime barındıran başlıklarda `uppercase` kullanılmaz.
- İçinde küçük i olmayan Türkçe kelimelerde (örn. "Hakkımda") `uppercase` güvenlidir.
- Üretilen her görselde ve başlıkta gözle doğrulanır.

### Kural 9 · Tek kaynak, elle yazılan sayı yok (2026-08-29)

Aynı olgu iki yerde elle yazılıysa er geç ayrışır.

- Sertifika sayıları `src/lib/certifications.ts` içindeki `anthropicCertCount` ve `totalCertCount` üzerinden türetilir. Hero, sayfa başlığı, OG kartları, ana sayfa rozeti, `/egitimler` SSS'i ve JSON-LD `hasCredential` hepsi aynı kaynaktan okur.
- **Kök neden:** 29.08.2026'ya kadar sayı sekiz ayrı yerde elle yazılıydı ve hepsi 8'de kalmıştı. O tarihte arşivdeki gerçek Anthropic kaydı 20 idi; yani sapma 12 sertifikaydı.
- **Bu iki sayı bugünkü değer değildir, tarihli olgudur.** Güncel değerler yalnız veri dosyasından okunur; aynı gün devreye giren gösterim süzgeci (aşağıdaki KIRILMAZ bölüm) türetilen sayıları arşiv sayısından ayırdı. Bu paragraftaki rakamı güncel sanıp metne taşıma.
- Aynı ilke listeler için de geçerli: JSON-LD kredensiyal listesi elle yazılmaz, veri dosyasından üretilir.

### KIRILMAZ · Sertifika gösteriminde iki süzgeç (sahip talimatı 2026-08-29)

Bir sertifikanın sitede görünmesi için **iki ayrı şartı birden** geçmesi gerekir. Biri diğerinin yerine geçmez.

**Süzgeç 1, taban şart.** Sertifika listesine yalnız çalışan doğrulama linki olan kayıt girer. Linki olmayan kayıt kart açmaz; anlatı metninde anılabilir, ama anılırken sertifikası olmadığı açıkça yazılır, yoksa listedeki benzer adlı kartla karışır.

Kaynaklar: Anthropic Academy `verify.skilljar.com/c/<hash>`, PMI için Credly rozeti.

**Süzgeç 2, gösterim kararı.** Linki olması gösterilmesi için YETMEZ. Kayıt ancak sahibin işine ve konumlandırmasına katkı veriyorsa gösterilir. Karar veri dosyasındaki `showcase` bayrağıyla verilir ve bayrak **opt-in**'dir: yazmayan gösterilmez. Yeni bir sertifika veri dosyasına eklenmekle yayına girmez; göstermek ayrı ve bilinçli bir editöryal karardır ve sahibindir.

> **İkinci süzgeç neden var.** 29.08.2026'da birinci şart tam filtre sanılıp linki olan yirmi bir kaydın hepsi yayınlandı. Yedisi aynı kursun hedef kitle varyantıydı: educators, students, pK-12, nonprofits, Small Businesses, Creative Work, Builders. Kurumsal BT alıcısına sinyal vermiyor, listeyi seyreltiyor ve güçlü kayıtları gölgeliyorlardı. Sahip düzeltmesi: "Görmemiş gibi her sertifikayı da yayımlamak istemiyorum. İşime odaklı ve bana kazanç ve olgunluk sağlayacak olanlar önemli."

Dosya **tam arşivi tutar, hiçbir kayıt silinmez.** Gösterimden çıkan kayıt dosyada durur; fikir değişirse tek satır.

**`showcase` ile `featured` karıştırılmaz.** `showcase` süzgeçtir, `featured` ana sayfa önizlemesindeki küratörlü seçkidir. Önce süzgeç, sonra seçki: showcase taşımayan kayıt featured olsa bile hiçbir yerde görünmez.

Türetilen her sayı showcase kümesinden okunur (Kural 9). **JSON-LD `hasCredential` de arşivden değil showcase kümesinden üretilir**; sitede göstermediğini şemaya bildirmek iki yüzey arasında tutarsızlık üretir.

Tam kural ve gerekçe: Notion → Site Operations → "Kırılmaz Kural · Sertifika Gösterimi".

---

### Örnek (iyi)
> "Claude'u kurumunuzun günlük iş akışına entegre ediyorum. Sunum değil, çalışan sistem."

### Örnek (kaçınılacak)
> "En iyi yapay zeka dönüşüm çözümlerimizle dijital geleceğinizi şekillendiriyoruz."

---

## Logo / Görsel Varlık

- Kişisel marka işareti var (2026-07-26, Claude Design): mor zeminli HS monogramı. Site tarafında kod üretir: `src/components/BrandMark.tsx` + `src/app/icon.svg` + `src/lib/brandMark.ts` (OG data URI). Kaynak dosyalar sahip arşivinde (`HS-WWW/logo/`).
- **Hakkımda portresi:** `public/images/about-hs.jpg`
- **AuthorBio portresi:** `public/images/about-bw.png` (BW)
- `public/images/hero.png` layout'ta LCP preload hedefidir
- **PMP® rozeti:** `public/images/PMP_badge.png`, PMI'nin dağıttığı 1700x1700 PNG. `next/image` istek anında küçültür, depoya ikinci kopya konmaz
- Tüm görseller `<Image>` ile sunulur (lazy, optimize)

### Yazı Görselleri: Grok Standart Prompt Şablonu (sahip talebi, 2026-07-28)

Her yazı için soyut, yazısız, palete kilitli görsel seti üretilir. Üretim Grok'ta manueldir; prompt iki bloktan oluşur.

Sabit stil bloğu (her yazıda aynı):

```
Abstract minimal digital artwork for a corporate technology blog. Dark indigo background with a subtle diagonal gradient from #1E1B4B to #2D1B69. Glowing violet accents in #7C3AED with soft lavender highlights in #A78BFA. Clean geometric composition, soft radial glow, subtle film grain, generous negative space. No text, no letters, no numbers, no logos, no people, no faces. Professional editorial illustration, premium and restrained, not futuristic cliche.
```

Konsept bloğu: yazı taslağıyla birlikte üretilir (CON teslim eder, BRD kalitesinden sorumludur). Yazının ana metaforu tek paragraflık soyut bir sahneye çevrilir. Örnek (olay-analizi-30-dakika): üç ayrı cam panelde dağınık noktalar, panelleri aşan ışıklı mor iplikler, tek parlak takımyıldız deseni; ayrı sistemlerde saklı korelasyonun görünür olması.

Boyut seti (üç ayrı üretim):

| Kullanım | Oran | Kompozisyon notu |
|---|---|---|
| Hero | 16:9 (1920x1080) | Desen merkezin hafif sağında, sol üçte bir sakin boşluk |
| OG | 1.91:1 (1200x630) | Desen ortada, kenarlardan bol pay |
| Card | 1:1 (1080x1080) | Sıkı kırpım, desen kadrajı doldurur |

Kurallar: metin/harf/rakam/logo yasak; insan ve yüz yasak; palet dışına çıkılmaz; AI klişeleri (beyin, robot kafası, devre kartı, nöron ağı) yasak. Üretilen dosyalar sahipten gelir; repoya Chrome web arayüzüyle yüklenir (GitHub MCP binary dosyayı bozar, 27.07.2026 ve 29.08.2026 kanıtlı).

## Terim Kuralları (canonical)

EDT denetiminin (2026-05-26) tespit ettiği site geneli terim ikiliği sahip kararıyla netleştirildi; 2026-08-29 kararlarıyla genişletildi.

- **"AI" baskın:** teknik tonda, kısa, jargon parantezi yok. Tüm prose, UI string ve blog gövdesinde varsayılan.
- **İlk geçişte** (yalnızca `ABOUT_DESCRIPTION` gibi tanımlayıcı meta pozisyonlarda) "yapay zeka (AI)" tek seferlik tanım. Sonraki tüm geçişler "AI".
- **SEO istisnası (2026-07-27):** çekirdek keyword'ler ("kurumsal yapay zeka eğitimi", "Türkçe yapay zeka eğitmeni" vb.) title, H1 ve meta pozisyonlarında keyword formunu korur. "AI baskın" kuralı gövde prose'u içindir.
- **"Yapay Zeka" yalnız özel ad pozisyonunda** (örn. "Yapay Zeka Genel Müdürü").

### 2026-08-29 sahip kararları

- **Unvan tek biçim:** **"AI / Context Engineering Eğitmeni"**. JSON-LD `jobTitle`, /about hero, sayfa başlığı, iki OG kartı ve ana sayfa rozeti aynı dizgeyi taşır. **TDK:** unvan yalnız yüklem konumunda küçük yazılır ("AI / Context Engineering eğitmeniyim"); etiket ve başlık konumunda ad olduğu için büyük kalır.
- **PMP tescil işareti:** kredensiyal adının geçtiği her görünür yerde **PMP®**. Biçim **"PMP® + N Anthropic"**; "PMP ve N" yasak, N elle yazılmaz (Kural 9).
- **Atölye tek terim:** görünür metinde daima **"atölye"**. "Workshop" yalnız iki yerde kalır: `data-cta` değerleri ve `layout.tsx` `keywords` dizisi. İkisi de GA4 ve SEO sürekliliğine bağlıdır, değiştirilmez. `id="workshop"` çapası da aynı zincirin parçasıdır.
- **Slayt kelimesi kullanılmaz.** Yerine **"sunum"**. Site geneli geçerlidir.
- **Motto tek doğru biçim:** **"Sunum değil, çalışan sistem."** Başka varyant üretilmez; "X değil, Y" kalıbı aynı sayfada ikinci kez kullanılmaz, yoksa motto seyrelir.
- **checkpoint → "kontrol noktası".** Kurumsal jargon minimal kuralı.
- **Deneyim yılı:** **"20+ yıl"** tek standart. "20 yıllık", "21 yıl", "21+ yıl" yasak.
- **Takım kadrosu:** **"7 ajanlı takım"** (PO + WEB + SEO + CON + BRD + SOC + EDT). Sayı vermek yerine açık depoya link vermek tercih edilir; sayı değişirse metin kırılmaz.
- **Domain:** lowercase **"hayrettinsendil.tr"**. Cümle başında "Hayrettinsendil.tr" yerine cümleyi yeniden yapılandır.
- **Compound korunur:** `multi-agent`, `sub-agent`, `JSON-LD`, `ADR-009`, `draft-only`, `chat-driven`. Türkçe sıfat tamlamalarında tire kullanılmaz: "tek ajan", "dar kapsamlı", "çok ajanlı" (keyword listesindeki tarihsel "çok-ajanlı sistemler" yazımı SEO sürekliliği için korunur).

## Sosyal Medya Handle ve İletişim

- **LinkedIn:** `eniac` → linkedin.com/in/eniac
- **LinkedIn Şirket Sayfası:** linkedin.com/company/hayrettinsendil
- **X:** `@HayrettinAi` → x.com/HayrettinAi
- **Instagram:** `hayrettinai` → instagram.com/hayrettinai
- **GitHub:** `hsendil` → github.com/hsendil
- **E-posta (resmi/iş):** `talep@hayrettinsendil.tr`, atölye, danışmanlık ve ekip eğitimi için (27.07.2026: support@ tüm görünür yüzeylerden kaldırıldı)
- **E-posta (kişisel):** `hayrettin.sendil@hotmail.com.tr`, yalnızca kişisel ve gizli yazışma, public yerlerde KULLANMA

*Son güncelleme: 2026-08-29 · sertifika KIRILMAZ kuralı iki süzgeç olarak yeniden yazıldı (showcase opt-in bayrağı, featured ile farkı, JSON-LD daraltılması), Kural 9 kök neden cümlesindeki tarihli sayı güncel sanılmayacak biçimde netleştirildi, Kural 1 kapsamı bu dosyanın kendisine genişletildi ve başlıklardaki em-dash'ler orta noktaya çevrildi. Aynı gün daha önce: 29.08 sahip kararları (unvan, PMP®, atölye, sunum, motto, kontrol noktası), Kural 8 ve Kural 9 eklendi, em-dash kuralının kapsamı aria-label ve JSON-LD alanlarına genişletildi, geriye dönük uygulanmama notu kondu.*

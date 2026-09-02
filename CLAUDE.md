# hs-site-team

hayrettinsendil.tr sitesinin ajan takımı ve sosyal yayın hattı. Site kodu
burada değil (`hsendil/hayrettinsendil`, private); bu depo skill, kuyruk ve
zincirleri taşır. Bu dosya her oturumda okunur; bir sayfayı geçmez.

## Komutlar

```bash
node --test scripts/yazim-denetim.test.mjs   # 13 test, hepsi geçmeli
node scripts/yazim-denetim.mjs               # kuyruk denetimi; çıkış 0 = temiz, 1 = yasak tire
node evals/kos.mjs                           # ajan konfigürasyon evali (ANTHROPIC_API_KEY ister)
```

Sağlıklı çıktı: `13 dosya denetlendi. Temiz. Yasak tire yok.` Her görev
bitiminde bu komutlar koşulur ve çıktı PR gövdesine yapıştırılır.

## Yapı

- `plugins/hs-site-team/skills/hs-site-po/` kanonik skill; `references/*.md`
  rol metinleri (WEB, SEO, CON, BRD, SOC, EDT). Kök `skills/` kalıntıdır, düzenlenmez.
- `queue/<kanal>/*.json` yayın kuyruğu; kanal `x`, `linkedin`, `instagram`.
- `scripts/` zincir betikleri; `.github/workflows/chain*.yml` zincirler.
- `.claude/hooks/` deterministik kapılar; `evals/` konfigürasyon regresyon seti.

## Kurallar

- Yayın kapısı sahiptedir. Ajan dal açar, PR gönderir, merge etmez.
- İnsan ve ajan main'e doğrudan yazmaz. Tek istisna Chain 4b/5b arşiv
  commit'leridir (`github-actions[bot]`, `[skip ci]`); bu yüzden ruleset'te
  "PR zorunlu" yoktur, insan tarafı `.claude/hooks/komut-kapisi.mjs` ile kilitlidir.
- Uzun tire hiçbir dosyaya girmez; `yazma-kapisi.mjs` yazmadan önce durdurur,
  CI `yazim-denetim` merge öncesi ikinci kez bakar.
- Türkçe büyük harf: `toUpperCase()` kullanılmaz, i harfi elle İ yapılır.
- Instagram bio linki yalnız sitede yayınlanmış makalesi olan gönderide değişir.
- Her gönderi o haftanın site yazısını taşır; kaynak siteden doğrulanır.
- push_files mesajında anılan her dosya `files` dizisinde olmak zorundadır.

## Künye ve unvan

Kişisel çıktıların künyesi alt alta iki satırdır, tek satıra birleştirilmez,
® düşürülmez:

```
Hayrettin Şendil, PMP®
AI / Context Engineering Eğitmeni
```

Unvan tek biçim "AI / Context Engineering Eğitmeni". Motto "Sunum değil,
çalışan sistem." (virgül ile; tireli biçim yasak varyanttır).

## Plan kuralı

Üçten fazla dosyaya dokunan, zincir betiği değiştiren veya yayın hattına giren
her iş planla başlar. Claude Code'da plan mode; Cowork'te önce plan, sonra dosya.
Plan `docs/plan/<YYYY-AA-GG>-<konu>.md` olarak ilk commit'te girer, şablon
`docs/plan/SABLON.md`. Sapma olursa plan aynı commit'te güncellenir. Tek
dosyalık düzeltmede plan istenmez.

## Claude'un yanlış yaptıkları

Aynı hata ikinci kez görülünce buraya yazılır; tarih kanıttır.

- 12.08.2026: iki zincir aynı anda arşiv push'u yaptı, kuyruk tıkandı. Arşiv
  commit'i tek bekçiye (Chain 11) bırakıldı; zincire arşiv adımı eklenmez.
- 18.08.2026: zamanlanmış görev bloklayıcı soruda takıldı, taslak üretmedi.
  Zamanlanmış koşuda soru sorulmaz, kayıtlı varsayımla devam edilir.
- 24.08.2026: karusel kartlarında dört etiket `upper()` yüzünden yanlış çıktı
  (TÜRKIYE). Görsel üretiminde i→İ eşlemesi elle yapılır.
- 25.08.2026 (tekrar): haber postunda bio linki değiştirilmek istendi. Bio
  yalnız makaleye; haber ve yorum postunda dokunulmaz.
- 27.08.2026: "CI yeşil" denip merge önerildi, Actions kırmızıydı. Combined
  status check run göstermez; Actions sayfasındaki koşu satırı okunur.
- 29.08.2026 (üç kez tek oturumda): push_files mesajı üç dosya anlattı, pakette
  tek dosya vardı. Gönderimden önce mesajdaki her yol `files` içinde aranır.
- 30.07.2026: web_fetch oturum içinde önbellekliyor; merge sonrası eski HTML
  döndü. Deploy sonrası doğrulama Chrome ile yapılır.
- 02.09.2026: ilk eval koşusu künye vakasında düştü; künye yalnız Cowork proje
  talimatında yaşıyordu. Ajanın uyması beklenen her kural depoda durur.
- Genel: "bende çalıştı" kanıt değildir; runner'da araç kurulu sayılmaz,
  kurulum adımı iş akışına yazılır.

## Kapılar (tavsiye ile zorlama ayrı)

| Kural | Tavsiye | Zorlama |
|---|---|---|
| Uzun tire yok | skill metni | `yazma-kapisi.mjs` (PreToolUse) + CI yazım denetimi |
| Merge sahipte, main'e push yok | bu dosya | `komut-kapisi.mjs` (PreToolUse Bash) + ruleset (force push, silme) |
| Skill değişince gerileme yok | yok | `evals/` + `agent-evals.yml` (CLAUDE.md, .claude/**, SKILL.md değişince) |

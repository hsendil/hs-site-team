# Ajan konfigürasyon evalleri

Ajanı yönlendiren dosyalar (CLAUDE.md, `.claude/**`, skill metinleri) kod gibi
regresyon testine girer. Bir skill değişince ajan hâlâ aynı standartta iş
yapıyor mu, bu set söyler.

- `vakalar/*.json`: prompt + kabul kontrolleri. Kontrol tipleri: `contains`,
  `not_contains`, `regex`.
- `kos.mjs`: her vakayı `claude -p` ile koşar, `check.mjs` ile puanlar, geçiş
  oranını yazar. Eşik `ESIK` (varsayılan 0.8); altında çıkış 1.
- `check.mjs`: tek vaka ve tek sonuç dosyasını karşılaştırır.

Kural: her yayın olayı (kural ihlali, yanlış çıktı) bir vaka olur ve sette kalır.
Beş tohum vaka 02.09.2026'da kondu; hedef 20.

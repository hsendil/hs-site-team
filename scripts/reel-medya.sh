#!/usr/bin/env bash
#
# Chain 10: Reel medya hattı
#
# HeyGen'in 16:9 çıktısını alır, dikey Reel'e çevirir, alt bandı basar,
# sıkıştırır ve kapak karesini çıkarır. Elle dosya taşımayı ortadan kaldırır.
#
# Neden HeyGen'e dikey ürettirmiyoruz: HeyGen 9:16 isterken kadrajı ortadan
# kırpıyor. Hayrettin kadrajın sağında oturduğu için yüzü kesiliyor.
# 19.08.2026'da bu 3 kredi yaktı. Kırpım penceresi bu yüzden burada,
# ölçülmüş değerle veriliyor.
#
# Girdi (env):
#   VIDEO_URL    zorunlu. HeyGen imzalı mp4 adresi (get_video döner)
#   SLUG         zorunlu. Çıktı dosya adı, örn. bu-site-neden-var
#   CROP         opsiyonel. Kırpım penceresi w:h:x:y, varsayılan 608:1080:986:0
#   BAND_LINE1   opsiyonel. Üst satır
#   BAND_LINE2   opsiyonel. Alt satır
#   BAND_START   opsiyonel. Bandın göründüğü saniye, varsayılan 1.0
#   BAND_END     opsiyonel. Bandın söndüğü saniye, varsayılan 4.5
#   FADE         opsiyonel. Açılma ve kapanma süresi, varsayılan 0.4
#   BITRATE      opsiyonel. Hedef video bit hızı, varsayılan 2600k
#   OUT_DIR      opsiyonel. Varsayılan ./out
#   FONT_DIR     opsiyonel. Outfit-Bold.ttf ve Outfit-Regular.ttf burada aranır
#
# Çıktı: $OUT_DIR/$SLUG.mp4 ve $OUT_DIR/$SLUG-cover.jpg

set -euo pipefail

VIDEO_URL="${VIDEO_URL:?VIDEO_URL zorunlu}"
SLUG="${SLUG:?SLUG zorunlu}"
CROP="${CROP:-608:1080:986:0}"
BAND_LINE1="${BAND_LINE1:-Hayrettin ŞENDİL, PMP}"
BAND_LINE2="${BAND_LINE2:-AI / Context Engineering Eğitmeni}"
BAND_START="${BAND_START:-1.0}"
BAND_END="${BAND_END:-4.5}"
FADE="${FADE:-0.4}"
BITRATE="${BITRATE:-2600k}"
OUT_DIR="${OUT_DIR:-./out}"
FONT_DIR="${FONT_DIR:-./fonts}"

# Instagram Reels sınırları. Aşılırsa yayın adımı değil bu adım patlasın;
# Meta tarafında patlarsa hata mesajı çok daha karanlık oluyor.
# Varsayılan bırakılır, ezilebilir olması testin muhafızı gerçekten
# tetikleyebilmesi için gerekli.
MAX_SECONDS="${MAX_SECONDS:-90}"
MAX_MB="${MAX_MB:-95}"

mkdir -p "$OUT_DIR"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

log() { printf '%s\n' "$*"; }
fail() { printf '✗ %s\n' "$*" >&2; exit 1; }

# --- Font -------------------------------------------------------------------
# Marka fontu Outfit. Runner'da yok, @fontsource paketinden woff2 gelir,
# TTF'e açılır ve latin + latin-ext birleştirilir. Birleştirme şart:
# Ş, İ, ğ latin-ext'te, gövde harfleri latin'de.
BOLD="$FONT_DIR/Outfit-Bold.ttf"
REG="$FONT_DIR/Outfit-Regular.ttf"
if [ ! -f "$BOLD" ] || [ ! -f "$REG" ]; then
  fail "Outfit fontları bulunamadı: $BOLD / $REG. Önce font hazırlama adımını koş."
fi

# --- İndir ------------------------------------------------------------------
log "→ Kaynak indiriliyor"
curl -fsSL --retry 3 --retry-delay 2 -o "$WORK/raw.mp4" "$VIDEO_URL" \
  || fail "İndirme başarısız. HeyGen imzalı adresleri süreli, tazesini al."

SRC_W=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$WORK/raw.mp4")
SRC_H=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$WORK/raw.mp4")
SRC_D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WORK/raw.mp4")
SRC_MB=$(( $(stat -c%s "$WORK/raw.mp4") / 1048576 ))
log "  kaynak ${SRC_W}x${SRC_H}, ${SRC_D} sn, ${SRC_MB} MB"

# Kırpım penceresi kaynağın dışına taşarsa ffmpeg sessizce saçmalar, önce bak.
CW=${CROP%%:*}; REST=${CROP#*:}
CH=${REST%%:*}; REST=${REST#*:}
CX=${REST%%:*}; CY=${REST#*:}
[ $((CX + CW)) -le "$SRC_W" ] || fail "Kırpım x+w=$((CX+CW)) kaynak genişliği $SRC_W dışında"
[ $((CY + CH)) -le "$SRC_H" ] || fail "Kırpım y+h=$((CY+CH)) kaynak yüksekliği $SRC_H dışında"

# --- Alt bant alfa eğrisi ---------------------------------------------------
# drawtext'in alpha ifadesi kutuyu da soldurur, ayrı drawbox gerekmiyor.
# Doğrulandı 20.08.2026: 0,5 sn yok, 2,5 sn var, 5,5 sn yok.
S="$BAND_START"; E="$BAND_END"; F="$FADE"
FI=$(python3 -c "print(f'{$S + $F:.3f}')")
FO=$(python3 -c "print(f'{$E - $F:.3f}')")
ALPHA="if(lt(t,$S),0,if(lt(t,$FI),(t-$S)/$F,if(lt(t,$FO),1,if(lt(t,$E),($E-t)/$F,0))))"

esc() { printf '%s' "$1" | sed "s/\\\\/\\\\\\\\/g; s/:/\\\\:/g; s/'/\\\\\\\\'/g"; }
L1=$(esc "$BAND_LINE1")
L2=$(esc "$BAND_LINE2")

# --- İşle -------------------------------------------------------------------
log "→ Kırpım $CROP, ölçek 1080x1920, alt bant ${S}-${E} sn"
ffmpeg -y -v error -i "$WORK/raw.mp4" -filter_complex \
"crop=$CROP,scale=1080:1920:flags=lanczos[v];\
[v]drawtext=fontfile='$BOLD':text='$L1':fontsize=54:fontcolor=white:x=(w-tw)/2:y=h-368:box=1:boxcolor=black@0.55:boxborderw=22:alpha='$ALPHA'[v1];\
[v1]drawtext=fontfile='$REG':text='$L2':fontsize=38:fontcolor=0xA78BFA:x=(w-tw)/2:y=h-292:box=1:boxcolor=black@0.55:boxborderw=18:alpha='$ALPHA'[out]" \
-map "[out]" -map 0:a? -c:v libx264 -preset medium -b:v "$BITRATE" -pix_fmt yuv420p \
-c:a aac -b:a 128k -movflags +faststart "$OUT_DIR/$SLUG.mp4" \
  || fail "ffmpeg işleme başarısız"

# Kapak: bandın tam göründüğü an. Bandsız kare kimliksiz kalıyor.
COVER_AT=$(python3 -c "print(f'{($S + $E) / 2:.2f}')")
ffmpeg -y -v error -ss "$COVER_AT" -i "$OUT_DIR/$SLUG.mp4" -frames:v 1 -q:v 3 \
  "$OUT_DIR/$SLUG-cover.jpg" || fail "Kapak karesi alınamadı"

# --- Doğrula ----------------------------------------------------------------
OUT_W=$(ffprobe -v error -select_streams v:0 -show_entries stream=width -of csv=p=0 "$OUT_DIR/$SLUG.mp4")
OUT_H=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$OUT_DIR/$SLUG.mp4")
OUT_D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT_DIR/$SLUG.mp4")
OUT_B=$(stat -c%s "$OUT_DIR/$SLUG.mp4")
OUT_MB=$(( OUT_B / 1048576 ))

[ "$OUT_W" = "1080" ] && [ "$OUT_H" = "1920" ] || fail "Çıktı ${OUT_W}x${OUT_H}, 1080x1920 bekleniyordu"
python3 -c "import sys; sys.exit(0 if abs($OUT_D - $SRC_D) < 0.5 else 1)" \
  || fail "Süre kaydı: kaynak $SRC_D, çıktı $OUT_D"
python3 -c "import sys; sys.exit(0 if $OUT_D <= $MAX_SECONDS else 1)" \
  || fail "Süre $OUT_D sn, Reels sınırı $MAX_SECONDS sn"
[ "$OUT_MB" -le "$MAX_MB" ] || fail "Boyut ${OUT_MB} MB, sınır ${MAX_MB} MB"
[ -s "$OUT_DIR/$SLUG-cover.jpg" ] || fail "Kapak boş"

log "✓ ${OUT_W}x${OUT_H}, ${OUT_D} sn, ${OUT_MB} MB (kaynak ${SRC_MB} MB)"
log "  video: $OUT_DIR/$SLUG.mp4"
log "  kapak: $OUT_DIR/$SLUG-cover.jpg"

if [ -n "${GITHUB_OUTPUT:-}" ]; then
  {
    echo "video_path=$OUT_DIR/$SLUG.mp4"
    echo "cover_path=$OUT_DIR/$SLUG-cover.jpg"
    echo "duration=$OUT_D"
    echo "size_mb=$OUT_MB"
    echo "src_size_mb=$SRC_MB"
  } >> "$GITHUB_OUTPUT"
fi

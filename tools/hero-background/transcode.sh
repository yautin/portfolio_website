#!/usr/bin/env bash
# Re-encode only the approved v3 clip: no new animation or image generation.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="${1:-$ROOT/context/hero-background-study/motion-v3/master-flow.mp4}"
OUT="$ROOT/public/images/hero-background"
QA="$ROOT/context/hero-integration-media"
mkdir -p "$OUT" "$QA"
for name in desktop mobile; do
  if [[ "$name" == desktop ]]; then
    width=2560; height=1440; level=5.0; poster=chip-flow-poster.webp
  else
    width=1280; height=720; level=3.1; poster=chip-flow-mobile.webp
  fi
  ffmpeg -hide_banner -y -i "$SRC" -map 0:v:0 -an -sn -dn \
    -vf "scale=$width:$height:flags=lanczos,setsar=1" -r 30 -frames:v 300 \
    -c:v libx264 -preset slow -crf 17 -profile:v high -level:v "$level" \
    -pix_fmt yuv420p -g 60 -keyint_min 60 -sc_threshold 0 \
    -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
    -movflags +faststart -map_metadata -1 "$OUT/chip-flow-$name.mp4" \
    2> "$QA/encode-$name.log"
  # Poster uses the approved animation's first frame, not a different composition.
  ffmpeg -hide_banner -y -i "$SRC" -map 0:v:0 -an \
    -vf "scale=$width:$height:flags=lanczos,setsar=1" -frames:v 1 \
    -c:v png -f image2pipe - 2> "$QA/poster-$name.log" | \
    "${PYTHON:-/opt/anaconda3/bin/python}" -c \
    'import sys; from PIL import Image; Image.open(sys.stdin.buffer).save(sys.argv[1], "WEBP", quality=95, method=6)' "$OUT/$poster"
done

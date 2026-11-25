# Approved chip-flow web media — restored previous version

The 4K delivery experiment was reverted at the user's request. Current assets were restored byte-for-byte from `context/hero-quality-upgrade/previous/`; hashes were compared after restoration. The original integrated helix, controls and earlier bug fixes remain unchanged.

## Current delivery

All assets live in `public/images/hero-background/`:

| File | Dimensions | Bytes |
|---|---|---:|
| chip-flow-desktop.mp4 | 2560×1440 | 4,180,787 |
| chip-flow-mobile.mp4 | 1280×720 | 1,000,477 |
| chip-flow-poster.webp | 2560×1440 | 185,756 |
| chip-flow-mobile.webp | 1280×720 | 62,606 |

Video and poster select the mobile source at viewport widths <=767 CSS pixels, as before the experiment. Both clips: x264 slow/CRF17/GOP60, H.264 High/yuv420p, BT.709 limited range, 30fps, 300 frames, 10 seconds, silent and faststart. Desktop level 5.0; mobile level 3.1. Posters use WebP quality95/method6.

## Provenance and reproduction

Input: `context/hero-background-study/motion-v3/master-flow.mp4` (4K approved animation). SHA-256: `bb64a15ab53f38f2615b518e23ceb32fb660131e8c9899f4d68ed56f5407c5fe`.

Background source was AI-enhanced from 1424×800, not native 4K detail. No source/master is copied into public. No artwork, timing, geometry or helix redesign is performed.

```sh
bash tools/hero-background/transcode.sh
/opt/anaconda3/bin/python tools/hero-background/verify.py
/opt/anaconda3/bin/python tools/hero-background/quality.py
```

Requires ffmpeg/ffprobe and Python with Pillow/NumPy; `PYTHON` overrides the poster-generation interpreter. Optional transcode argument supplies a different path to the same approved master. Scripts have been restored to the previous dimensions/settings.

Rollback metadata verification passed. Hero browser tests: 15 passed, 1 intentionally skipped (touch dragging disabled). Scoped lint, type checking and production build passed. The archived 4K experiment lives in `context/hero-quality-upgrade/reverted-4k/` and is NOT current delivery. No commit, push or deployment.

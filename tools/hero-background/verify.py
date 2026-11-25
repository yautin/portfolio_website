#!/usr/bin/env python3
"""Verify the published media contract; exits nonzero for missing/bad media."""
import json
import struct
import subprocess
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/images/hero-background'
QA = ROOT / 'context/hero-integration-media'
EXPECTED = {'chip-flow-desktop.mp4': (2560, 1440), 'chip-flow-mobile.mp4': (1280, 720), 'chip-flow-poster.webp': (2560, 1440), 'chip-flow-mobile.webp': (1280, 720)}

def verify():
    errors, results = [], {}
    for name, size in EXPECTED.items():
        p = OUT / name
        if not p.is_file():
            errors.append(f'Missing required deliverable: {name}')
            continue
        try:
            item: dict = {'bytes': p.stat().st_size}
            if p.suffix == '.webp':
                with Image.open(p) as im:
                    assert im.size == size and im.format == 'WEBP', 'poster format/size'
                    im.load()
                    item['dimensions'] = im.size
            else:
                data = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', str(p)]))
                assert len(data['streams']) == 1, 'must contain video only'
                s = data['streams'][0]
                assert s['codec_name'] == 'h264' and s['pix_fmt'] == 'yuv420p', 'H264 yuv420p'
                assert (s['width'], s['height']) == size, 'video dimensions'
                assert s['avg_frame_rate'] == '30/1' and s['nb_read_frames'] == '300', '30fps / 300 frames'
                assert abs(float(s['duration']) - 10) < .001, '10-second duration'
                assert all(s.get(k) == 'bt709' for k in ['color_space', 'color_transfer', 'color_primaries']), 'BT709 metadata'
                atoms = []
                with p.open('rb') as f:
                    while f.tell() < p.stat().st_size:
                        offset = f.tell()
                        length, tag = struct.unpack('>I4s', f.read(8))
                        if length == 1:
                            length = struct.unpack('>Q', f.read(8))[0]
                        if length == 0:
                            length = p.stat().st_size - offset
                        atoms.append(tag.decode('ascii'))
                        f.seek(offset + length)
                assert atoms.index('moov') < atoms.index('mdat'), 'faststart moov before mdat'
                item.update(stream=s, atoms=atoms)
            results[name] = item
        except Exception as e:
            errors.append(f'{name}: {e}')
    result = {'pass': not errors, 'errors': errors, 'files': results}
    QA.mkdir(parents=True, exist_ok=True)
    (QA / 'verification.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))
    return 1 if errors else 0

if __name__ == '__main__':
    raise SystemExit(verify())

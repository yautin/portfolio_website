#!/usr/bin/env python3
"""Sampled SSIM and absolute RGB seam measurements against approved master."""
import hashlib
import json
import re
import subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
QA = ROOT / 'context/hero-integration-media'
SRC = ROOT / 'context/hero-background-study/motion-v3/master-flow.mp4'
OUT = ROOT / 'public/images/hero-background'
QA.mkdir(parents=True, exist_ok=True)

def rgb_frames(path, width, height):
    command = ['ffmpeg', '-v', 'error', '-i', str(path), '-vf', f"select='eq(n,0)+eq(n,1)+eq(n,150)+eq(n,298)+eq(n,299)',scale={width}:{height}:flags=lanczos,format=yuv420p,format=rgb24", '-fps_mode', 'passthrough', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    data = subprocess.check_output(command)
    return np.frombuffer(data, dtype=np.uint8).reshape(5, height, width, 3)

def mae(a, b):
    return float(np.abs(a.astype(np.float32) - b.astype(np.float32)).mean())

report = {'source_sha256': hashlib.sha256(SRC.read_bytes()).hexdigest(), 'sample_frames': list(range(0,300,30)) + [299], 'rgb_units': '8-bit code values, 0–255; full-frame mean across RGB channels', 'outputs': {}}
for name, w, h in [('desktop',2560,1440),('mobile',1280,720)]:
    p = OUT / f'chip-flow-{name}.mp4'
    stats = QA / f'ssim-{name}.log'
    graph = f"[0:v]select='not(mod(n,30))+eq(n,299)',scale={w}:{h}:flags=lanczos,setpts=N/(30*TB)[ref];[1:v]select='not(mod(n,30))+eq(n,299)',setpts=N/(30*TB)[enc];[ref][enc]ssim=stats_file={stats}"
    cmd = ['ffmpeg','-hide_banner','-i',str(SRC),'-i',str(p),'-lavfi',graph,'-an','-f','null','-']
    run = subprocess.run(cmd, capture_output=True, text=True, check=True)
    (QA/f'ssim-{name}-command.log').write_text(' '.join(cmd)+'\n'+run.stderr)
    scores = [float(x) for x in re.findall(r'All:([\d.]+)',stats.read_text())]
    assert len(scores) == 11 and min(scores) > .97, scores
    ref = rgb_frames(SRC,w,h)
    enc = rgb_frames(p,w,h)
    result = {'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest(), 'sampled_ssim_mean':float(np.mean(scores)), 'sampled_ssim_min':min(scores), 'sampled_ssim_scores':scores, 'seam_master_rgb_mae':mae(ref[-1],ref[0]), 'seam_encoded_rgb_mae':mae(enc[-1],enc[0]), 'adjacent_encoded_start_rgb_mae':mae(enc[1],enc[0]), 'adjacent_encoded_end_rgb_mae':mae(enc[-1],enc[-2]), 'first_frame_rgb_error':mae(ref[0],enc[0]), 'last_frame_rgb_error':mae(ref[-1],enc[-1]), 'midpoint_rgb_error':mae(ref[2],enc[2])}
    # Absolute tolerance, not a ratio amplified by near-static background.
    assert result['seam_encoded_rgb_mae'] < 1.0, result
    report['outputs'][name] = result
    sheet = Image.new('RGB',(1280,3*384),(18,18,18))
    draw = ImageDraw.Draw(sheet)
    for row, ix in enumerate([0,2,4]):
        for col, (label, frames) in enumerate([('Resized master',ref),('CRF17 web encode',enc)]):
            image = Image.fromarray(frames[ix])
            image.save(QA/f'{name}-{label.split()[0].lower()}-frame{[0,1,150,298,299][ix]}.png')
            sheet.paste(image.resize((640,360),Image.Resampling.LANCZOS),(col*640,row*384+24))
            draw.text((col*640+8,row*384+6),f'{name}: {label}, frame {[0,1,150,298,299][ix]}',fill='white')
    sheet.save(QA/f'comparison-{name}.jpg',quality=95)
(QA/'quality.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))

"""Bake Natural Earth's land polygons into small runs of dots on latitude rings.

Usage: python3 tools/contact-globe/bake-land.py /path/to/ne_110m_land.geojson
Input: Natural Earth 1:110m physical land, public domain. No network at runtime.
"""
import hashlib
import json
import math
from pathlib import Path
import sys

SOURCE_SHA = '9e0729ee253ca7d7a5c4ae9395fb1902264c5377c52e224d13dd85010e2835d9'
source = Path(sys.argv[1]).read_bytes()
if hashlib.sha256(source).hexdigest() != SOURCE_SHA:
    raise SystemExit('Unexpected land file; verify the dataset before regenerating.')
polygons = []
for feature in json.loads(source)['features']:
    geom = feature['geometry']
    polygons.extend([geom['coordinates']] if geom['type'] == 'Polygon' else geom['coordinates'])

def cuts(ring, lat):
    return sorted(x1 + (lat-y1)*(x2-x1)/(y2-y1)
                  for (x1, y1), (x2, y2) in zip(ring, ring[1:])
                  if (y1 > lat) != (y2 > lat))

def bake(rings, filename):
  rows = []
  for row in range(rings):
    lat = -90 + (row + 0.5) * 180 / rings
    count = max(1, round(2 * rings * math.cos(math.radians(lat))))
    offset = (row % 2) / 2
    # Scan the outer rings and holes together using the even-odd fill rule.
    cells = set()
    for polygon in polygons:
        xs = sorted(x for ring in polygon for x in cuts(ring, lat))
        for lo, hi in zip(xs[::2], xs[1::2]):
            cells.update(range(max(0, math.ceil((lo+180)*count/360-offset)),
                               min(count, math.ceil((hi+180)*count/360-offset))))
    runs = []
    for i in sorted(cells):
        if runs and runs[-1]+runs[-2] == i:
            runs[-1] += 1
        else:
            runs.extend((i, 1))
    if runs:
        rows.append([lat, count, offset, *runs])

  out = Path(__file__).resolve().parents[2] / 'src/components/contact-globe' / filename
  out.parent.mkdir(parents=True, exist_ok=True)
  out.write_text(json.dumps(rows, separators=(',', ':')) + '\n')
  print(f'{filename}: {sum(sum(row[4::2]) for row in rows)} land dots; {out.stat().st_size} bytes')

bake(90, 'land.json')       # compact static fallback
bake(300, 'particles.json') # lazy-loaded interactive renderer

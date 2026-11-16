"""Lay candidate previews out as numbered rows, 6 places per sheet.
Usage: python3 -I candidate_sheets.py <candidates_dir> <out_dir>"""
import sys, json, os
from PIL import Image, ImageDraw, ImageFont

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
data = json.load(open(os.path.join(src, 'candidates.json')))
W, H, LABEL = 220, 140, 150
try:
    font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 18)
except Exception:
    font = ImageFont.load_default()

ids = list(data)
for s in range(0, len(ids), 6):
    chunk = ids[s:s + 6]
    sheet = Image.new('RGB', (LABEL + 8 * (W + 6), len(chunk) * (H + 8)), 'white')
    d = ImageDraw.Draw(sheet)
    for r, pid in enumerate(chunk):
        y = r * (H + 8)
        d.text((6, y + 6), pid, fill='black', font=font)
        for i, c in enumerate(data[pid]['candidates']):
            p = c.get('preview')
            if not p or not os.path.exists(p): continue
            try:
                im = Image.open(p).convert('RGB')
            except Exception:
                continue
            im.thumbnail((W, H))
            x = LABEL + i * (W + 6)
            sheet.paste(im, (x, y))
            d.rectangle([x, y, x + 22, y + 22], fill='black')
            d.text((x + 6, y + 2), str(i), fill='white', font=font)
    sheet.save(os.path.join(out, f'sheet_{s // 6 + 1}.jpg'), quality=80)
print('done')

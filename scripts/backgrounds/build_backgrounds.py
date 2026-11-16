"""Download the chosen Commons photos, make full (1200w) + thumbnail (480x300) JPEGs,
write js/backgrounds.js with credits, and a contact sheet.
Usage: python3 -I build_backgrounds.py <candidates_dir> <raw_dir> <project_dir>"""
import sys, json, os, re, time, urllib.request, urllib.parse
from PIL import Image, ImageDraw, ImageFont, ImageOps

cand_dir, raw_dir, proj = sys.argv[1:4]
UA = 'PlateLogBackgrounds/1.0 (personal fitness app; image selection)'
PICKS = {
  'london': 4, 'paris': 1, 'tokyo': 0, 'kyoto': 0, 'seoul': 0, 'hongkong': 6, 'singapore': 5,
  'budapest': 1, 'istanbul': 0, 'rome': 0, 'venice': 2, 'barcelona': 6, 'amsterdam': 2,
  'prague': 0, 'sydney': 3, 'rio': 3, 'capetown': 6, 'newyork': 3,
  'forest': 3, 'redwoods': 2, 'plitvice': 0, 'skogafoss': 0, 'iguazu': 7, 'dolomites': 6,
  'matterhorn': 4, 'patagonia': 0, 'morainelake': 0, 'fjord': 0, 'aurora': 5, 'sahara': 7,
  'grandcanyon': 4, 'riceterraces': 4, 'cherryblossom': 0, 'santorini': 0, 'beach': 0, 'highlands': 1,
}
# Display order: the order places were listed in the search script
ORDER = ['london', 'paris', 'tokyo', 'kyoto', 'seoul', 'hongkong', 'singapore', 'budapest', 'istanbul',
         'rome', 'venice', 'barcelona', 'amsterdam', 'prague', 'sydney', 'rio', 'capetown', 'newyork',
         'forest', 'redwoods', 'plitvice', 'skogafoss', 'iguazu', 'dolomites', 'matterhorn', 'patagonia',
         'morainelake', 'fjord', 'aurora', 'sahara', 'grandcanyon', 'riceterraces', 'cherryblossom',
         'santorini', 'beach', 'highlands']

data = json.load(open(os.path.join(cand_dir, 'candidates.json')))
full_dir = os.path.join(proj, 'img', 'backgrounds', 'full')
thumb_dir = os.path.join(proj, 'img', 'backgrounds', 'thumbs')
for d in (raw_dir, full_dir, thumb_dir): os.makedirs(d, exist_ok=True)

def get(url):
    for attempt in range(6):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=120) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == 5: raise
            wait = int(e.headers.get('Retry-After') or 0) or 20 * (attempt + 1)
            print('  rate limited, waiting', wait, flush=True); time.sleep(wait)

def api_thumb(title, width=1920):
    q = urllib.parse.urlencode({'action': 'query', 'format': 'json', 'titles': title, 'prop': 'imageinfo',
                                'iiprop': 'url', 'iiurlwidth': width})
    d = json.loads(get('https://commons.wikimedia.org/w/api.php?' + q))
    page = next(iter(d['query']['pages'].values()))
    return page['imageinfo'][0]['thumburl']

def short_artist(a):
    a = re.sub(r'\s*\(talk\)|\s*Diese Datei.*|\s*This file.*|\s*NOTE:.*|\.\s*Feel free.*|\s*followhansi', '', a)
    a = re.sub(r'^This Photo was taken by\s*', '', a).strip()
    return a[:60].rstrip(' ,;') if a else 'Unknown'

entries = []
for pid in ORDER:
    place = data[pid]
    c = place['candidates'][PICKS[pid]]
    raw = os.path.join(raw_dir, pid + '.img')
    if not os.path.exists(raw):
        url = api_thumb(c['title'])
        open(raw, 'wb').write(get(url))
        time.sleep(1.5)
    im = ImageOps.exif_transpose(Image.open(raw)).convert('RGB')
    full = im.copy(); full.thumbnail((1200, 1200 * im.height // im.width + 1), Image.LANCZOS)
    full.save(os.path.join(full_dir, pid + '.jpg'), 'JPEG', quality=78, progressive=True, optimize=True)
    thumb = ImageOps.fit(im, (480, 300), Image.LANCZOS)
    thumb.save(os.path.join(thumb_dir, pid + '.jpg'), 'JPEG', quality=72, progressive=True, optimize=True)
    entries.append({'id': pid, 'category': place['category'], 'label': place['label'], 'sub': place['sub'],
                    'artist': short_artist(c['artist']), 'licence': c['licence'],
                    'licenceUrl': c['licenceUrl'], 'page': c['page']})
    print(pid, os.path.getsize(os.path.join(full_dir, pid + '.jpg')) // 1024, 'KB', flush=True)

js = """// Curated backgrounds for the Profile cover (no DOM). Photos come from Wikimedia Commons;
// their licences need the credit shown wherever the photo appears (see backgroundPicker.js).
// Files: img/backgrounds/full/<id>.jpg (1200px wide) and img/backgrounds/thumbs/<id>.jpg (480×300).
// Rebuilt by scripts/backgrounds/ (find_candidates → candidate_sheets → build_backgrounds).

export const BACKGROUNDS = """ + json.dumps(entries, indent=2, ensure_ascii=False) + """;

export function getBackgroundById(id) {
  return id ? BACKGROUNDS.find(b => b.id === id) || null : null;
}

export function backgroundFullUrl(bg) { return `img/backgrounds/full/${bg.id}.jpg`; }
export function backgroundThumbUrl(bg) { return `img/backgrounds/thumbs/${bg.id}.jpg`; }
"""
open(os.path.join(proj, 'js', 'backgrounds.js'), 'w').write(js)

# Contact sheet: 6 columns of thumbnails with labels
try:
    font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 20)
    small = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 15)
except Exception:
    font = small = ImageFont.load_default()
cols, tw, th, pad = 6, 300, 188, 16
rows = (len(entries) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (tw + pad) + pad, rows * (th + 70) + pad), 'white')
d = ImageDraw.Draw(sheet)
for i, e in enumerate(entries):
    x = pad + (i % cols) * (tw + pad); y = pad + (i // cols) * (th + 70)
    t = Image.open(os.path.join(thumb_dir, e['id'] + '.jpg')); t.thumbnail((tw, th))
    sheet.paste(t, (x, y))
    d.text((x, y + th + 6), f"{i + 1}. {e['label']}", fill='black', font=font)
    d.text((x, y + th + 32), e['sub'], fill=(100, 100, 100), font=small)
out = os.path.join(proj, 'design-reference', 'mockups', 'profile-header', 'backgrounds-contact-sheet.jpg')
sheet.save(out, quality=82)
print('total full KB', sum(os.path.getsize(os.path.join(full_dir, f)) for f in os.listdir(full_dir)) // 1024)
print('total thumb KB', sum(os.path.getsize(os.path.join(thumb_dir, f)) for f in os.listdir(thumb_dir)) // 1024)

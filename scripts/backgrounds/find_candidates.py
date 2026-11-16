"""Search Wikimedia Commons (featured + quality pictures) for landscape photos with
licences that allow app use with a credit. Saves small previews + a JSON of candidates.
Usage: python3 -I find_candidates.py <out_dir>"""
import sys, json, time, re, urllib.request, urllib.parse, os

OUT = sys.argv[1]
UA = 'PlateLogBackgrounds/1.0 (personal fitness app; image selection)'
API = 'https://commons.wikimedia.org/w/api.php'

PLACES = [
  # id, category, label, sub, search
  ('london', 'cities', 'London', 'Tower Bridge', 'Tower Bridge'),
  ('paris', 'cities', 'Paris', 'Eiffel Tower', 'Eiffel Tower Paris'),
  ('tokyo', 'cities', 'Tokyo', 'Skyline', 'Tokyo skyline'),
  ('kyoto', 'cities', 'Kyoto', 'Pagoda', 'Kyoto pagoda'),
  ('seoul', 'cities', 'Seoul', 'Gyeongbokgung', 'Gyeongbokgung'),
  ('hongkong', 'cities', 'Hong Kong', 'Victoria Harbour', 'Victoria Harbour Hong Kong'),
  ('singapore', 'cities', 'Singapore', 'Marina Bay', 'Marina Bay Singapore'),
  ('budapest', 'cities', 'Budapest', 'Parliament', 'Hungarian Parliament Building Danube'),
  ('istanbul', 'cities', 'Istanbul', 'Hagia Sophia', 'Hagia Sophia'),
  ('rome', 'cities', 'Rome', 'Colosseum', 'Colosseum Rome'),
  ('venice', 'cities', 'Venice', 'Grand Canal', 'Grand Canal Venice'),
  ('barcelona', 'cities', 'Barcelona', 'Sagrada Família', 'Sagrada Familia'),
  ('amsterdam', 'cities', 'Amsterdam', 'Canals', 'Amsterdam canal'),
  ('prague', 'cities', 'Prague', 'Charles Bridge', 'Charles Bridge Prague'),
  ('sydney', 'cities', 'Sydney', 'Opera House', 'Sydney Opera House'),
  ('rio', 'cities', 'Rio de Janeiro', 'Sugarloaf Mountain', 'Rio de Janeiro Sugarloaf'),
  ('capetown', 'cities', 'Cape Town', 'Table Mountain', 'Table Mountain Cape Town'),
  ('newyork', 'cities', 'New York', 'Manhattan', 'Manhattan skyline'),
  ('forest', 'nature', 'Forest path', 'Woodland', 'forest path'),
  ('redwoods', 'nature', 'Redwoods', 'California', 'Redwood National Park'),
  ('plitvice', 'nature', 'Plitvice Lakes', 'Croatia', 'Plitvice Lakes'),
  ('skogafoss', 'nature', 'Skógafoss', 'Iceland', 'Skógafoss'),
  ('iguazu', 'nature', 'Iguazú Falls', 'Argentina–Brazil', 'Iguazu Falls'),
  ('dolomites', 'nature', 'Dolomites', 'Italy', 'Dolomites'),
  ('matterhorn', 'nature', 'Matterhorn', 'Swiss Alps', 'Matterhorn'),
  ('patagonia', 'nature', 'Patagonia', 'Torres del Paine', 'Torres del Paine'),
  ('morainelake', 'nature', 'Moraine Lake', 'Canadian Rockies', 'Moraine Lake'),
  ('fjord', 'nature', 'Geirangerfjord', 'Norway', 'Geirangerfjord'),
  ('aurora', 'nature', 'Northern lights', 'Arctic sky', 'aurora borealis'),
  ('sahara', 'nature', 'Sahara', 'Sand dunes', 'Sahara dunes'),
  ('grandcanyon', 'nature', 'Grand Canyon', 'Arizona', 'Grand Canyon'),
  ('riceterraces', 'nature', 'Rice terraces', 'Bali', 'rice terraces Bali'),
  ('cherryblossom', 'nature', 'Cherry blossom', 'Spring', 'cherry blossom'),
  ('santorini', 'nature', 'Santorini', 'Aegean coast', 'Santorini'),
  ('beach', 'nature', 'Tropical beach', 'Turquoise water', 'tropical beach'),
  ('highlands', 'nature', 'Scottish Highlands', 'Glencoe', 'Glencoe Scotland'),
]

CATS = ['Featured_pictures_on_Wikimedia_Commons', 'Quality_images']
OK_LICENCE = re.compile(r'^(CC0|Public domain|PD|CC BY(-SA)? \d)', re.I)

def _get(url):
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == 4: raise
            wait = int(e.headers.get('Retry-After') or 0) or 20 * (attempt + 1)
            print('  rate limited, waiting', wait, flush=True); time.sleep(wait)

def api(params):
    params = {**params, 'format': 'json'}
    return json.loads(_get(API + '?' + urllib.parse.urlencode(params)))

def strip(html):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', html or '')).strip()

def search(q, cat):
    d = api({'action': 'query', 'generator': 'search', 'gsrnamespace': 6, 'gsrlimit': 20,
             'gsrsearch': f'{q} incategory:{cat}', 'prop': 'imageinfo',
             'iiprop': 'url|size|extmetadata|mime', 'iiurlwidth': 330,
             'iiextmetadatafilter': 'LicenseShortName|LicenseUrl|Artist'})
    pages = sorted(d.get('query', {}).get('pages', {}).values(), key=lambda p: p.get('index', 99))
    return pages

def fetch(url, path):
    data = _get(url)
    with open(path, 'wb') as f:
        f.write(data)

jp = os.path.join(OUT, 'candidates.json')
allc = json.load(open(jp)) if os.path.exists(jp) else {}
for pid, cat, label, sub, q in PLACES:
    prev = allc.get(pid, {}).get('candidates', [])
    if prev and all(c.get('preview') for c in prev):
        continue
    seen, cands = set(), []
    for c in CATS:
        try:
            pages = search(q, c)
        except Exception as e:
            print('search failed', pid, c, e); pages = []
        for p in pages:
            ii = (p.get('imageinfo') or [{}])[0]
            m = ii.get('extmetadata', {})
            lic = m.get('LicenseShortName', {}).get('value', '')
            if p['title'] in seen or ii.get('mime') not in ('image/jpeg', 'image/png'): continue
            if not OK_LICENCE.match(lic) or re.search(r'NC|ND', lic): continue
            if ii.get('width', 0) < 1600 or ii['width'] < ii['height'] * 1.25: continue
            seen.add(p['title'])
            cands.append({'title': p['title'], 'width': ii['width'], 'height': ii['height'],
                          'licence': lic, 'licenceUrl': m.get('LicenseUrl', {}).get('value', ''),
                          'artist': strip(m.get('Artist', {}).get('value', '')),
                          'page': ii.get('descriptionurl'), 'thumb': ii.get('thumburl'), 'quality': c})
            if len(cands) >= 8: break
        if len(cands) >= 8: break
        time.sleep(0.5)
    for i, cd in enumerate(cands):
        path = os.path.join(OUT, f'{pid}_{i}.jpg')
        try:
            fetch(cd['thumb'], path); cd['preview'] = path
        except Exception as e:
            print('preview failed', pid, i, e)
        time.sleep(1)
    allc[pid] = {'category': cat, 'label': label, 'sub': sub, 'candidates': cands}
    print(pid, len(cands), flush=True)
    with open(jp, 'w') as f:
        json.dump(allc, f, indent=1)
    time.sleep(1)

with open(os.path.join(OUT, 'candidates.json'), 'w') as f:
    json.dump(allc, f, indent=1)

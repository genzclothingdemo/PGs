"""Build an enrichment plan for the live DB from every research file in PG/.
Usage: python scripts/enrich_plan.py <db_dump.json> <out_plan.json>
Writes nothing to the DB; scripts/apply_plan.mjs applies the plan."""
import csv, json, re, sys, os, math, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); P = os.path.join(ROOT, 'PG')
dump, out = sys.argv[1], sys.argv[2]
db = json.load(open(dump, encoding='utf-8'))
rd = lambda f: list(csv.DictReader(open(os.path.join(P, f), encoding='utf-8-sig')))
js = lambda f: json.load(open(os.path.join(P, f), encoding='utf-8'))
dig = lambda s: re.sub(r'\D', '', s or '')[-10:]
norm = lambda s: re.sub(r'[^a-z0-9]', '', (s or '').lower())
def hv(a, b, c, d):
    r = math.pi / 180
    return 2 * 6371 * math.asin(math.sqrt(math.sin((c - a) * r / 2) ** 2 + math.cos(a * r) * math.cos(c * r) * math.sin((d - b) * r / 2) ** 2))

pgs = [r for r in db if r['type'] == 'pg']
by_phone = {}
for r in pgs:
    if r['phone']: by_phone.setdefault(r['phone'], []).append(r)
by_name = {}
for r in pgs: by_name.setdefault(norm(r['name']), []).append(r)

def match(name, phone, lat=None, lng=None):
    """Find the DB PG for a source record: phone (+name/location tie-break), exact name, or same spot + similar name."""
    ph = dig(phone)
    if ph and ph in by_phone:
        c = by_phone[ph]
        if len(c) == 1: return c[0]
        for x in c:
            if norm(x['name']) == norm(name): return x
        if lat:
            return min(c, key=lambda x: hv(lat, lng, x['lat'], x['lng']) if x['lat'] else 99)
        return c[0]
    n = norm(name)
    if n in by_name:
        c = by_name[n]
        if len(c) == 1 or not lat: return c[0]
        return min(c, key=lambda x: hv(lat, lng, x['lat'], x['lng']) if x['lat'] else 99)
    if lat:
        toks = set(re.findall(r'[a-z]{4,}', name.lower())) - {'girls', 'boys', 'hostel', 'gandhinagar', 'sector', 'paying', 'guest'}
        for x in pgs:
            if x['lat'] and hv(lat, lng, x['lat'], x['lng']) < 0.06 and toks & set(re.findall(r'[a-z]{4,}', x['name'].lower())): return x
    return None

def gender_of(name, cat, hint=''):
    t = f'{name} {cat}'.lower()
    g = 'boys' in t or "boy's" in t or 'gents' in t or ' men' in t
    w = any(k in t for k in ('girl', 'ladies', 'lady', 'women', 'woman', 'mahila', 'kanya', 'female'))
    if g and w: return 'both'
    if w: return 'girls'
    if g: return 'boys'
    h = (hint or '').lower().strip('*')
    return {'girls': 'girls', 'boys': 'boys', 'both': 'both'}.get(h)

# ---------- 1. new PGs missing from the DB ----------
PG_CAT = re.compile(r"dormitor|boys' hostel|girls' hostel|student housing|women's hostel|boarding house", re.I)
PG_NAME = re.compile(r'\bp\.?\s?g\b|hostel|paying guest|co-?living', re.I)
NOT_RENTABLE = re.compile(r'ambedkar|government|govt|sarkari|youth hostel|samras|iitgn|nfsu|gnlu|university|college|library|sachivalay|leuva|patidar|samaj|chhatralay|છાત્રાલય|સમાજ', re.I)
SKIP_CAT = re.compile(r'backpacker|home stay|bed & breakfast|education|youth hostel|manor|temporarily closed|hotel|real estate', re.I)
cands = []
raw =js('secpg.json') + js('rows.json')
g = js('gnr_raw.json')
for v in (g.values() if isinstance(g, dict) else g):
    if isinstance(v, list) and len(v) >= 4:
        meta = v[3]
        m_r = re.match(r'([\d.]+)\((\d+)\)', meta)
        parts = [x.strip() for x in meta.split('|')]
        cat = parts[1].split('·')[0].strip() if len(parts) > 1 else ''
        addr = parts[1].split('·', 1)[1].strip() if len(parts) > 1 and '·' in parts[1] else ''
        phm = re.search(r'(\d{5}\s?\d{5}|0\d{4}\s?\d{6})', meta)
        hrs = parts[2].split('·')[0].strip() if len(parts) > 2 else ''
        raw.append(dict(name=v[0], lat=v[1], lng=v[2], rating=float(m_r.group(1)) if m_r else None, cnt=int(m_r.group(2)) if m_r else None, cat=cat, addr=addr, phone=phm.group(1) if phm else '', hours=hrs))
seen_new = {}
for r in raw:
    if not r.get('lat') or not r.get('name'): continue
    cat = r.get('cat') or ''
    if SKIP_CAT.search(cat): continue
    if not (PG_CAT.search(cat) or PG_NAME.search(r['name'])): continue
    if NOT_RENTABLE.search(r['name'] + ' ' + cat): continue
    if hv(r['lat'], r['lng'], 23.215, 72.637) > 18: continue  # Gandhinagar + edge only
    if match(r['name'], r.get('phone', ''), r['lat'], r['lng']): continue
    k = (norm(r['name']), dig(r.get('phone', '')) or f"{r['lat']:.4f}")
    if k in seen_new: continue
    seen_new[k] = 1
    cands.append(dict(external_ref='pg-' + hashlib.md5((r['name'] + str(r['lat']) + str(r['lng'])).encode()).hexdigest()[:10], name=r['name'].strip(), phone=dig(r.get('phone', '')) or None,
                      gender=gender_of(r['name'], cat, r.get('g', '')) or 'not_stated', category=cat or None, address=(r.get('addr') or None), lat=r['lat'], lng=r['lng'],
                      google_rating=r.get('rating'), google_reviews=r.get('cnt'), hours=r.get('hours') or None))

# ---------- 2. per-property updates ----------
upd = {}   # id -> dict of column changes
units = {}  # id -> list of unit rows (only for properties without units)
srcnote = {}
def setf(pid, k, v):
    if v in (None, ''): return
    upd.setdefault(pid, {})[k] = v

# 2a. gender for not_stated rows
for r in pgs:
    if r['gender'] == 'not_stated':
        gg = gender_of(r['name'], r['category'] or '')
        if gg: setf(r['id'], 'gender', gg)
for f in ('PG_Final_Ranked.csv', 'Sector_3_4_5_6_12_13_PGs.csv', 'Gandhinagar_Ranked_PGs.csv'):
    for s in rd(f):
        x = match(s['Name'], s['Phone'], float(s['Lat']) if s.get('Lat') else None, float(s['Lng']) if s.get('Lng') else None)
        gg = gender_of('', '', s.get('Gender (Maps)', ''))
        if x and x['gender'] == 'not_stated' and gg and x['id'] not in [k for k in upd if 'gender' in upd[k]]: setf(x['id'], 'gender', gg)

# 2b. rents parsed from first-hand calls / WhatsApp (Notion) and from listing sites
def parse_rent(t):
    t = (t or '').replace('₹', ' ').replace(',', '')
    out, ac = [], False
    for line in re.split(r'[\n|/]+', t):
        l = line.strip()
        if re.search(r'\bac room|❄', l, re.I) and not re.search(r'non', l, re.I): ac = True
        if re.search(r'non\s*ac', l, re.I): ac = False
        for m in re.finditer(r'((?:\d\s*/\s*)*\d)\s*(?:sharing|shering)\s*[-:]?\s*(\d{4,5})', l, re.I):
            for s_ in re.findall(r'\d', m.group(1)): out.append((int(s_), int(m.group(2)), ac))
        for m in re.finditer(r'(\d{4,5})\s*\[(\d)\]', l): out.append((int(m.group(2)), int(m.group(1)), ac))
        for m in re.finditer(r'(\d{4,5})\s*\((\d)\s*sharing( ac)?', l, re.I): out.append((int(m.group(2)), int(m.group(1)), bool(m.group(3))))
        m = re.search(r'no sharing\s*-\s*(\d{4,5})', l, re.I)
        if m: out.append((1, int(m.group(1)), ac))
    if not out:
        m = re.match(r'\s*([\d/ ]+)\s*sharing\s*:\s*(\d{4,5})', t, re.I)
        if m:
            for s_ in re.findall(r'\d', m.group(1)): out.append((int(s_), int(m.group(2)), False))
        else:
            m = re.search(r'(\d{4,5})', t)
            if m: out.append((None, int(m.group(1)), 'ac' in t.lower()))
    return out
snap = js('notion_snapshot.json')
FOOD = {'food': 'included', 'non food': 'none', 'optional': 'optional'}
# Vrundavan: two DB listings share the name and the visit note does not say which one; Nisarg: rent reply ambiguous
OVERRIDE = {'Shakti girls pg and hostel': [(2, 8000, False), (4, 7500, False)], 'Nisarg Homes': [], 'Vrundavan girls pg': [], 'VRUNDAVAN GIRLS PG': []}
def first_hand(name, phone, rent, food=None, tiffin=None, timing=None, area=None):
    x = match(name, phone)
    if not x: return None
    rows = OVERRIDE[x['name']] if x['name'] in OVERRIDE else parse_rent(rent)
    food_inc = (food or '').lower() == 'food'
    if x['name'] in ('Vrundavan girls pg', 'VRUNDAVAN GIRLS PG'): return x
    if rows and not x['units']:
        units[x['id']] = [dict(label=(('Single room' if s == 1 else f'{s} sharing') if s else 'Per person') + (' AC' if a else ''), sharing=s, rent=v, ac=a, food_included=food_inc or None) for s, v, a in rows]
        srcnote[x['id']] = 'Rent confirmed by phone/WhatsApp, Nov 2026'
    if food and food.lower() in FOOD: setf(x['id'], 'food_option', FOOD[food.lower()])
    if tiffin:
        tl = tiffin.lower()
        if tl.startswith('yes') or 'probabl' in tl: setf(x['id'], 'food_option', 'tiffin' if not food_inc else 'included')
        elif 'not' in tl or tl.startswith('no'): setf(x['id'], 'food_option', 'none')
    if timing and timing.strip() not in ('-', ''):
        tt = timing.strip()
        setf(x['id'], 'gate_time', 'No fixed time limit' if re.search(r'no tim', tt, re.I) else ('12 midnight' if re.fullmatch(r'12\s*pm', tt, re.I) else tt))
    return x
NAME_FIX = {'Shakti Girls PG': 'Shakti girls pg and hostel', 'Aashirwad Hostel & PG': 'Aashirwad Hostel & PG', 'Vrundavan Girls PG': 'VRUNDAVAN GIRLS PG', 'Shree Bhagwati Girls PG': 'SHREE BHAGWATI GIRLS PG & HOSTEL',
            'The Best Girls Hostel': 'Girls hostel (the best)', 'Smart Girls PG': 'SMART GIRLS PG HOSTEL GANDHINAGAR', 'Dwarkesh PG': 'DWARKESH BOYS & GIRLS HOSTEL'}
fh = 0
for v in snap['visits']:
    if v.get('Rent per sharing') or v.get('Food') or v.get('Time limit'):
        if v.get('Area') == 'Sector 4' and v['PG name'] == 'Dwarkesh PG': continue
        if first_hand(NAME_FIX.get(v['PG name'], v['PG name']), '', v.get('Rent per sharing', ''), food=v.get('Food'), timing=v.get('Time limit')): fh += 1
for c in snap['cold']:
    if (c.get('Rent') not in (None, '', '-')) or (c.get('Tiffin') not in (None, '', '-', '?')):
        if first_hand(c['PG name'], c.get('Phone', ''), '' if c.get('Rent') in ('-', None) else c['Rent'], tiffin=c.get('Tiffin')): fh += 1

# 2c. listing-site prices (food included) where no first-hand rent
lp = 0
for f, col, scol in (('Gandhinagar_Ranked_PGs.csv', 'Monthly price (food incl) INR', 'Price source'), ('Sector14_24_25_Girls_PGs.csv', 'Monthly price INR (food incl)', 'Price source'), ('PG_Final_Ranked.csv', 'Known price INR (food incl)', None)):
    for s in rd(f):
        if scol and 'estimate' in (s.get(scol) or '').lower(): continue
        pr = re.sub(r'\D', '', s.get(col) or '')
        if not pr or not (2000 <= int(pr) <= 30000): continue
        x = match(s['Name'], s['Phone'], float(s['Lat']) if s.get('Lat') else None, float(s['Lng']) if s.get('Lng') else None)
        if x and not x['units'] and x['id'] not in units:
            units[x['id']] = [dict(label='Per person, food included', sharing=None, rent=int(pr), ac=None, food_included=True)]
            setf(x['id'], 'food_option', 'included')
            srcnote[x['id']] = f"Price as listed on {s.get(scol) or 'a listing site'}; confirm with the owner"
            lp += 1

# ---------- 3. rented homes ----------
homes = {r['external_ref']: r for r in db if r['type'] == 'home'}
rent_by_url = {r['Listing URL']: r for r in rd('Gandhinagar_Rental_Homes.csv')}
new_homes, hupd = [], 0
for o in rd('Gandhinagar_Ranked_Options.csv'):
    src = rent_by_url.get(o['Listing URL'])
    ref = 'home-' + src['ID'] if src else 'home-o' + hashlib.md5(o['Listing URL'].encode()).hexdigest()[:8]
    note = ' '.join(x for x in [o['Furnishing'] and f"{o['Furnishing']}.", o['Tenant note'] and f"Tenants: {o['Tenant note']}.", o['Posted by'] and f"Posted by {o['Posted by'].lower()}."] if x)
    kind = 'broker' if re.search(r'broker|agent|dealer', o['Posted by'], re.I) else ('owner' if re.search(r'owner', o['Posted by'], re.I) else None)
    if ref in homes:
        h = homes[ref]
        setf(h['id'], 'description', note); setf(h['id'], 'owner_kind', kind); hupd += 1
    else:
        rent = re.sub(r'\D', '', o['Monthly rent (INR)'])
        if rent: new_homes.append(dict(external_ref=ref, name=f"{o['BHK']} {o['Type']} - {o['Society'] or o['Locality']}".strip(), area_label=o['Locality'], address=o['Locality'], category=o['Type'], description=note, owner_kind=kind, listing_url=o['Listing URL'], rent=int(rent), bhk=o['BHK'], sqft=re.sub(r'\D', '', o['Area']) or None, furnishing=o['Furnishing'] or None))

CEN = js('centroids.json')
for c in cands:
    m = re.search(r'sector[\s-]*(\d{1,2}[a-z]?)', f"{c['address'] or ''} {c['name']}", re.I)
    best = min(CEN.items(), key=lambda kv: hv(c['lat'], c['lng'], kv[1][0], kv[1][1]))
    c['area_label'] = ('Sector ' + m.group(1).upper()) if m else (best[0] if hv(c['lat'], c['lng'], best[1][0], best[1][1]) <= 1.6 else None)
plan = dict(new_pgs=cands, updates=upd, units=units, notes=srcnote, new_homes=new_homes)
json.dump(plan, open(out, 'w', encoding='utf-8'), ensure_ascii=False)
import collections
print(f"new PGs: {len(cands)} ({dict(collections.Counter(c['gender'] for c in cands))}), with phone {sum(1 for c in cands if c['phone'])}")
print(f"gender fixes: {sum(1 for v in upd.values() if 'gender' in v)}; first-hand matched: {fh}; units first-hand: {sum(1 for k in units if 'phone' in srcnote.get(k,''))}; listing prices: {lp}")
print(f"food_option set: {sum(1 for v in upd.values() if 'food_option' in v)}; gate_time set: {sum(1 for v in upd.values() if 'gate_time' in v)}")
print('new PG names:', ' | '.join(c['name'][:30] for c in cands))
print(f"homes updated: {hupd}; new homes: {len(new_homes)}")
for c in cands[:8]: print('  +', c['name'][:40], c['gender'], c['category'], c['phone'] and 'ph')

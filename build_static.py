#!/usr/bin/env python3
"""ساخت نسخه‌ی «فقط مشاهده» برای GitHub Pages.
اجرا:  python3 build_static.py
خروجی: پوشه‌ی online  ← محتوای همین پوشه را در یک ریپوی Public گیت‌هاب آپلود کن."""
import json, hashlib, shutil, re
from pathlib import Path
ROOT = Path(__file__).resolve().parent; OUT = ROOT / 'online'
THEMES = ('aizen', 'madara', 'halloween', 'winter', 'gold'); AUD = {'.mp3', '.ogg', '.wav', '.m4a'}; VID = {'.mp4', '.webm'}
ld = lambda p, d=None: json.loads(p.read_text(encoding='utf-8')) if p.exists() else d
cfg = ld(ROOT / 'data/config.json')
if OUT.exists(): shutil.rmtree(OUT)
OUT.mkdir()
skip = {'server.py', 'build_static.py', 'online', '__pycache__', 'data', 'README_FA.txt'}
def keep(p): return p.name not in skip and not p.name.endswith(('.zip', '.pyc', '.tmp'))
for p in ROOT.iterdir():
    if not keep(p): continue
    shutil.copytree(p, OUT / p.name, ignore=shutil.ignore_patterns('__pycache__')) if p.is_dir() else shutil.copy2(p, OUT / p.name)
music = {}
for t in THEMES:
    d = ROOT / 'assets/music' / t
    music[t] = [{'name': (f.stem.split('_', 1)[-1] if re.match(r'^[0-9a-f]{10}_', f.name) else f.stem).replace('_', ' '), 'file': f.name, 'url': f'assets/music/{t}/{f.name}'} for f in sorted(d.glob('*')) if f.suffix.lower() in AUD] if d.exists() else []
videos = {}
for s in ('bro-yes', 'bro-no', 'bro-never'):
    f = next((x for x in (ROOT / 'assets/videos').glob(s + '.*') if x.suffix.lower() in VID), None) if (ROOT / 'assets/videos').exists() else None
    videos[s] = f'assets/videos/{f.name}?v={int(f.stat().st_mtime)}' if f else None
data = {'hash': hashlib.sha256(f"{cfg['person_name'].strip().lower()}|{cfg['birthdate']}".encode()).hexdigest(), 'person_name': cfg['person_name'],
        'profile': {'name': cfg['person_name'], 'birthdate': cfg['birthdate']}, 'content': ld(ROOT / 'data/content.json', {}), 'music': music, 'videos': videos,
        'cards': ld(ROOT / 'data/cards.json', {'cards': []}), 'kv': {k: ld(ROOT / f'data/kv_{k}.json', {}) for k in ('lines', 'brother')}}
(OUT / 'static-data.json').write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8'); (OUT / '.nojekyll').write_text('')
print('آماده شد:', OUT, '\nمحتوای پوشه‌ی online را در یک ریپوی Public گیت‌هاب آپلود کن و Pages را روشن کن.')

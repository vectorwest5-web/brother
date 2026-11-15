import json, secrets, mimetypes, os, re, base64, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, unquote
import posixpath
from http import cookies
from email.parser import BytesParser
from email.policy import default
ROOT=Path(__file__).resolve().parent; DATA=ROOT/'data/content.json'; CARDS=ROOT/'data/cards.json'; CONFIG=ROOT/'data/config.json'; SESSIONS={}
def load(p): return json.loads(p.read_text(encoding='utf-8'))
def save(p,obj):
 t=p.with_suffix('.tmp'); t.write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf-8'); t.replace(p)
def send(h,code,obj):
 b=json.dumps(obj,ensure_ascii=False).encode(); h.send_response(code); h.send_header('Content-Type','application/json; charset=utf-8'); h.send_header('Content-Length',str(len(b))); h.end_headers(); h.wfile.write(b)
THEMES_OK=('aizen','madara','halloween','winter','gold'); AUDIO_EXT={'.mp3','.ogg','.wav','.m4a'}; VIDEO_EXT={'.mp4','.webm'}; VSLOTS=('bro-yes','bro-no','bro-never'); KV_OK=('lines','brother')
def body(h):
 n=int(h.headers.get('Content-Length','0'))
 if n>300_000_000: raise ValueError('فایل/درخواست خیلی بزرگ است (حداکثر ۳۰۰ مگابایت).')
 return h.rfile.read(n)
def auth(h):
 c=cookies.SimpleCookie(h.headers.get('Cookie','')); s=c.get('session'); return bool(s and s.value in SESSIONS)
def is_admin(h):
 c=cookies.SimpleCookie(h.headers.get('Cookie','')); s=c.get('session'); return bool(s and SESSIONS.get(s.value)=='admin')
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw): super().__init__(*a,directory=str(ROOT),**kw)
 def log_message(self,*a): pass
 def end_headers(self):
  self.send_header('Cache-Control','no-cache'); self.send_header('Accept-Ranges','bytes'); super().end_headers()
 def do_GET(self):
  p=urlparse(self.path).path
  q=posixpath.normpath(unquote(p)).lower()
  if q.startswith('/data') or q.endswith(('.py','.txt','.tmp')): return send(self,404,{'error':'پیدا نشد.'})
  rg=self.headers.get('Range')
  if rg and rg.startswith('bytes=') and not p.startswith('/api/'):
   fp=(ROOT/unquote(p).lstrip('/')).resolve()
   if ROOT.resolve() in fp.parents and fp.is_file():
    n=fp.stat().st_size; a,_,b=rg[6:].split(',')[0].partition('-')
    try:
     st=int(a) if a else max(0,n-int(b)); en=int(b) if (a and b) else n-1
    except ValueError: st,en=0,n-1
    en=min(en,n-1)
    if st>en or st>=n:
     self.send_response(416); self.send_header('Content-Range',f'bytes */{n}'); self.end_headers(); return
    self.send_response(206); self.send_header('Content-Type',self.guess_type(str(fp))); self.send_header('Accept-Ranges','bytes'); self.send_header('Content-Range',f'bytes {st}-{en}/{n}'); self.send_header('Content-Length',str(en-st+1)); self.end_headers()
    try:
     with open(fp,'rb') as f:
      f.seek(st); left=en-st+1
      while left>0:
       c=f.read(min(65536,left))
       if not c: break
       self.wfile.write(c); left-=len(c)
    except (BrokenPipeError,ConnectionResetError): pass
    return
  if p=='/api/content':
   if not auth(self): return send(self,401,{'error':'ابتدا وارد شو.'})
   return send(self,200,load(DATA))
  if p=='/api/music':
   if not auth(self): return send(self,401,{'error':'ابتدا وارد شو.'})
   out={}
   for t in THEMES_OK:
    d=ROOT/'assets'/'music'/t; out[t]=[{'name':f.stem.split('_',1)[-1].replace('_',' ') if re.match(r'^[0-9a-f]{10}_',f.name) else f.stem.replace('_',' '),'file':f.name,'url':f'assets/music/{t}/{f.name}'} for f in sorted(d.glob('*')) if f.suffix.lower() in AUDIO_EXT] if d.exists() else []
   return send(self,200,out)
  if p=='/api/videos':
   if not auth(self): return send(self,401,{'error':'ابتدا وارد شو.'})
   out={}
   for s_ in VSLOTS:
    f=next((x for x in (ROOT/'assets'/'videos').glob(s_+'.*') if x.suffix.lower() in VIDEO_EXT),None) if (ROOT/'assets'/'videos').exists() else None
    out[s_]=f'assets/videos/{f.name}?v={int(f.stat().st_mtime)}' if f else None
   return send(self,200,out)
  m_=re.match(r'^/api/kv/([a-z]+)$',p)
  if m_ and m_.group(1) in KV_OK:
   if not auth(self): return send(self,401,{'error':'ابتدا وارد شو.'})
   f=ROOT/'data'/f'kv_{m_.group(1)}.json'; return send(self,200,load(f) if f.exists() else {})
  if p=='/api/cards':
   if not auth(self): return send(self,401,{'error':'ابتدا وارد شو.'})
   return send(self,200,load(CARDS) if CARDS.exists() else {'cards':[]})
  if p=='/api/profile':
   if not auth(self): return send(self,401,{'error':'ابتدا وارد شو.'})
   c=load(CONFIG); return send(self,200,{'name':c['person_name'],'birthdate':c['birthdate']})
  if p=='/api/config-public': return send(self,200,{'person_name':load(CONFIG)['person_name']})
  if p=='/api/session': return send(self,200,{'logged_in':auth(self),'admin':is_admin(self)})
  super().do_GET()
 def do_POST(self):
  p=urlparse(self.path).path
  try:
   raw=body(self)
   if p=='/api/login':
    d=json.loads(raw or b'{}'); c=load(CONFIG)
    nm=str(d.get('name','')).strip().casefold(); role=None
    if c.get('admin_name') and c.get('admin_birthdate') and nm==str(c['admin_name']).strip().casefold() and d.get('birthdate')==c['admin_birthdate']: role='admin'
    elif nm==c['person_name'].strip().casefold() and d.get('birthdate')==c['birthdate']: role='viewer' if (c.get('admin_name') and c.get('admin_birthdate')) else 'admin'
    if role:
     sid=secrets.token_urlsafe(32); SESSIONS[sid]=role; self.send_response(200); self.send_header('Set-Cookie',f'session={sid}; Path=/; HttpOnly; SameSite=Strict'); self.send_header('Content-Type','application/json'); self.end_headers(); self.wfile.write(b'{"ok":true}'); return
    return send(self,401,{'error':'نام یا تاریخ تولد درست نیست.'})
   if not is_admin(self): return send(self,403,{'error':'فقط ادمین می‌تواند ویرایش کند.'})
   if p=='/api/save':
    if not auth(self): return send(self,401,{'error':'برای ذخیره، ابتدا وارد شو.'})
    d=json.loads(raw or b'{}')
    if not isinstance(d,dict) or 'site' not in d or 'sections' not in d: return send(self,400,{'error':'ساختار محتوا معتبر نیست.'})
    save(DATA,d); return send(self,200,{'ok':True})
   if p=='/api/upload':
    if not auth(self): return send(self,401,{'error':'ابتدا وارد شو.'})
    ct=self.headers.get('Content-Type','')
    if 'multipart/form-data' not in ct: return send(self,400,{'error':'فرمت آپلود نامعتبر است.'})
    msg=BytesParser(policy=default).parsebytes((f'Content-Type: {ct}\r\nMIME-Version: 1.0\r\n\r\n').encode()+raw)
    parts=list(msg.iter_parts()); filepart=next((x for x in parts if x.get_filename()),None)
    if not filepart: return send(self,400,{'error':'فایلی انتخاب نشده.'})
    name=Path(filepart.get_filename()).name; ext=Path(name).suffix.lower()
    allowed={'.jpg','.jpeg','.png','.webp','.gif','.mp4','.webm','.mp3','.ogg','.wav','.m4a'}
    if ext not in allowed: return send(self,400,{'error':'این پسوند مجاز نیست. عکس، ویدئو یا صوت انتخاب کن.'})
    folder='photos' if ext in {'.jpg','.jpeg','.png','.webp','.gif'} else ('videos' if ext in {'.mp4','.webm'} else 'music')
    dest=ROOT/'assets'/folder; dest.mkdir(parents=True,exist_ok=True); safe=f'{secrets.token_hex(5)}_{name.replace(" ","_")}'; (dest/safe).write_bytes(filepart.get_payload(decode=True)); return send(self,200,{'ok':True,'file':f'assets/{folder}/{safe}','kind':folder,'name':name})
   if p=='/api/music-upload' or p=='/api/video-upload':
    if not auth(self): return send(self,401,{'error':'ابتدا وارد شو.'})
    ct=self.headers.get('Content-Type','')
    if 'multipart/form-data' not in ct: return send(self,400,{'error':'فرمت آپلود نامعتبر است.'})
    msg=BytesParser(policy=default).parsebytes((f'Content-Type: {ct}\r\nMIME-Version: 1.0\r\n\r\n').encode()+raw)
    parts=list(msg.iter_parts()); key=next((x.get_content().strip() for x in parts if not x.get_filename() and x.get_param('name',header='content-disposition') in ('theme','slot')),None)
    files=[x for x in parts if x.get_filename()]
    if not files: return send(self,400,{'error':'فایلی انتخاب نشده.'})
    saved=[]
    if p=='/api/music-upload':
     if key not in THEMES_OK: return send(self,400,{'error':'تم نامعتبر است.'})
     dest=ROOT/'assets'/'music'/key; dest.mkdir(parents=True,exist_ok=True)
     for x in files:
      nm=Path(x.get_filename()).name; ext=Path(nm).suffix.lower()
      if ext not in AUDIO_EXT: continue
      safe=f"{secrets.token_hex(5)}_{re.sub(r'[^A-Za-z0-9._-]','_',Path(nm).stem)[:40] or 'track'}{ext}"; (dest/safe).write_bytes(x.get_payload(decode=True)); saved.append(safe)
    else:
     if key not in VSLOTS: return send(self,400,{'error':'اسلات نامعتبر است.'})
     x=files[0]; ext=Path(x.get_filename()).suffix.lower()
     if ext not in VIDEO_EXT: return send(self,400,{'error':'فقط mp4 یا webm.'})
     dest=ROOT/'assets'/'videos'; dest.mkdir(parents=True,exist_ok=True)
     for e in VIDEO_EXT:
      o=dest/(key+e)
      if o.exists(): o.unlink()
     (dest/(key+ext)).write_bytes(x.get_payload(decode=True)); saved.append(key+ext)
    return send(self,200,{'ok':True,'saved':saved})
   if p=='/api/music-delete':
    if not auth(self): return send(self,401,{'error':'ابتدا وارد شو.'})
    d=json.loads(raw or b'{}'); t=d.get('theme'); fn=Path(str(d.get('file',''))).name
    if t in THEMES_OK:
     f=ROOT/'assets'/'music'/t/fn
     if f.exists() and f.suffix.lower() in AUDIO_EXT: f.unlink()
    return send(self,200,{'ok':True})
   if p=='/api/video-delete':
    if not auth(self): return send(self,401,{'error':'ابتدا وارد شو.'})
    d=json.loads(raw or b'{}'); k=d.get('slot')
    if k in VSLOTS:
     for e in VIDEO_EXT:
      o=ROOT/'assets'/'videos'/(k+e)
      if o.exists(): o.unlink()
    return send(self,200,{'ok':True})
   m_=re.match(r'^/api/kv/([a-z]+)$',p)
   if m_ and m_.group(1) in KV_OK:
    if not auth(self): return send(self,401,{'error':'ابتدا وارد شو.'})
    d=json.loads(raw or b'{}'); save(ROOT/'data'/f'kv_{m_.group(1)}.json',d); return send(self,200,{'ok':True})
   if p=='/api/cards':
    if not auth(self): return send(self,401,{'error':'ابتدا وارد شو.'})
    d=json.loads(raw or b'{}'); db=load(CARDS) if CARDS.exists() else {'cards':[]}; cards=db['cards']
    if d.get('action')=='delete':
     cid=re.sub(r'[^a-z0-9]','',str(d.get('id','')))
     for c in cards:
      if c['id']==cid and c.get('img','').startswith('assets/cards/'):
       try: (ROOT/c['img'].split('?')[0]).unlink()
       except OSError: pass
     db['cards']=[c for c in cards if c['id']!=cid]; save(CARDS,db); return send(self,200,{'ok':True})
    c=d.get('card') or {}; cid=re.sub(r'[^a-z0-9]','',str(c.get('id',''))) or secrets.token_hex(4)
    clamp=lambda v:max(1,min(100,int(v or 1)))
    card={'id':cid,'name':str(c.get('name',''))[:60].strip() or 'بدون نام','series':str(c.get('series',''))[:60].strip(),
     'rar':c.get('rar') if c.get('rar') in ('N','R','SR','SSR','UR') else 'N','atk':clamp(c.get('atk')),'def':clamp(c.get('def')),'spd':clamp(c.get('spd')),'mag':clamp(c.get('mag')),
     'skill':str(c.get('skill',''))[:60].strip(),'skillText':str(c.get('skillText',''))[:300].strip(),'lore':str(c.get('lore',''))[:400].strip(),'img':''}
    old=next((x for x in cards if x['id']==cid),None)
    if old: card['img']=old.get('img','')
    im=d.get('image')
    if im:
     m=re.match(r'^data:image/(jpeg|png|webp);base64,(.+)$',im,re.S)
     if not m: return send(self,400,{'error':'تصویر نامعتبر است.'})
     blob=base64.b64decode(m.group(2))
     if len(blob)>6_000_000: return send(self,400,{'error':'تصویر خیلی بزرگ است.'})
     ext={'jpeg':'jpg','png':'png','webp':'webp'}[m.group(1)]; dest=ROOT/'assets'/'cards'; dest.mkdir(parents=True,exist_ok=True)
     for e in ('jpg','png','webp'):
      o=dest/f'{cid}.{e}'
      if o.exists(): o.unlink()
     (dest/f'{cid}.{ext}').write_bytes(blob); card['img']=f'assets/cards/{cid}.{ext}?v={int(time.time())}'
    db['cards']=[x for x in cards if x['id']!=cid]+[card]; save(CARDS,db); return send(self,200,{'ok':True,'card':card})
   if p=='/api/upload-slot':
    if not auth(self): return send(self,401,{'error':'ابتدا وارد شو.'})
    ct=self.headers.get('Content-Type','')
    if 'multipart/form-data' not in ct: return send(self,400,{'error':'فرمت آپلود نامعتبر است.'})
    msg=BytesParser(policy=default).parsebytes((f'Content-Type: {ct}\r\nMIME-Version: 1.0\r\n\r\n').encode()+raw)
    parts=list(msg.iter_parts()); slot=None; filepart=None
    for x in parts:
     if x.get_filename(): filepart=x
     elif x.get_param('name',header='content-disposition')=='slot': slot=x.get_content().strip()
    SLOTS={'aizen-login':('photos',{'.jpg','.jpeg','.png','.webp'}),'madara-login':('photos',{'.jpg','.jpeg','.png','.webp'}),'aizen-voice':('audio',{'.mp3','.ogg','.wav','.m4a'}),'login-music':('audio',{'.mp3','.ogg','.wav','.m4a'})}
    if slot not in SLOTS or not filepart: return send(self,400,{'error':'اسلات یا فایل نامعتبر است.'})
    folder,exts=SLOTS[slot]; ext=Path(filepart.get_filename()).suffix.lower()
    if ext not in exts: return send(self,400,{'error':'پسوند این اسلات مجاز نیست.'})
    ext='.jpg' if ext=='.jpeg' else ext
    dest=ROOT/'assets'/folder; dest.mkdir(parents=True,exist_ok=True)
    for e in ('.jpg','.png','.webp','.mp3','.ogg','.wav','.m4a'):
     old=dest/(slot+e)
     if old.exists(): old.unlink()
    (dest/(slot+ext)).write_bytes(filepart.get_payload(decode=True)); return send(self,200,{'ok':True,'file':f'assets/{folder}/{slot}{ext}'})
   send(self,404,{'error':'مسیر پیدا نشد.'})
  except Exception as e: send(self,400,{'error':str(e)})
if __name__=='__main__':
 print('\n'+'='*52+'\n EIZEN — http://127.0.0.1:8000\n برای توقف: Ctrl+C\n'+'='*52+'\n')
 import os
 port=int(os.environ.get('PORT','8000')); host='0.0.0.0' if os.environ.get('PORT') else '127.0.0.1'
 ThreadingHTTPServer((host,port),Handler).serve_forever()

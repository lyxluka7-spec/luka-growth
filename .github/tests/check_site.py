from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit,unquote
import json,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parent.parent.parent
class Page(HTMLParser):
 def __init__(self,s):
  super().__init__();self.ids=[];self.refs=[];self.schemas=[];self.schema=False;self.canonical=[];self.feed(s)
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  if t in ('a','link','script','img'):
   if a.get('href') or a.get('src'):self.refs.append(a.get('href') or a.get('src'))
  if t=='script' and a.get('type')=='application/ld+json':self.schema=True
  if t=='link' and a.get('rel')=='canonical':self.canonical.append(a['href'])
 def handle_data(self,s):
  if self.schema:self.schemas.append(json.loads(s))
 def handle_endtag(self,t):
  if t=='script':self.schema=False
pages={p:Page(p.read_text()) for p in ROOT.rglob('*.html') if 'tests' not in p.parts}
errors=[]
for p,d in pages.items():
 if len(d.ids)!=len(set(d.ids)):errors.append(f'{p.name}: duplicate IDs')
 if not p.name.startswith('baidu_') and len(d.canonical)!=1:errors.append(f'{p.name}: canonical')
 for ref in d.refs:
  u=urlsplit(ref)
  if u.scheme or u.netloc:continue
  target=(ROOT/u.path.lstrip('/')) if u.path.startswith('/') else (p.parent/u.path if u.path else p)
  if target.is_dir():target=target/'index.html'
  if not target.exists():errors.append(f'{p.name}: missing {ref}')
  elif u.fragment and target in pages and unquote(u.fragment) not in pages[target].ids:errors.append(f'{p.name}: bad anchor {ref}')
ns={'s':'http://www.sitemaps.org/schemas/sitemap/0.9'}
locs=[e.text for e in ET.parse(ROOT/'sitemap.xml').findall('s:url/s:loc',ns)]
assert len(locs)==len(set(locs))
for p,d in pages.items():
 if not p.name.startswith('baidu_') and d.canonical[0] not in locs:errors.append(f'{p.name}: absent from sitemap')
assert not errors, '\n'.join(errors)
print(json.dumps({'html_pages':len(pages),'sitemap_urls':len(locs),'errors':errors},ensure_ascii=False))

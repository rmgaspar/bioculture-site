#!/usr/bin/env python3
"""Exporta coleções da Koppert Portugal para JSONs separados, preservando a fonte."""
from __future__ import annotations
import argparse, html, json, re, sys, time
from pathlib import Path
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE="https://www.koppert.pt"
COLLECTIONS={
 "produtos":"/produtos/", "controlo_pragas":"/produtos/controle-de-pragas/", "controlo_doencas":"/produtos/controle-de-doencas/",
 "polinizacao":"/produtos/polinizacao/", "saude_plantas":"/produtos/saude-das-plantas/",
 "culturas_vegetais_protegidos":"/culturas/vegetais-de-cultivos-protegidos/", "culturas_frutas":"/culturas/frutas/", "culturas_hortalicas":"/culturas/hortalicas/",
 "doencas_plantas":"/doencas-das-plantas/", "dicas_noticias":"/centro-de-informacoes/"}
def clean(v): return re.sub(r"\s+"," ",v or "").strip()
def absolute(v): return urljoin(BASE,v).split("#",1)[0]
def session():
 s=requests.Session(); s.mount("https://",HTTPAdapter(max_retries=Retry(total=3,backoff_factor=1,status_forcelist=(429,500,502,503,504),allowed_methods=frozenset({"GET"}))))
 s.headers.update({"User-Agent":"koppert-collections-export/1.0","Accept-Language":"pt-PT,pt;q=0.9"}); return s
def fetch(s,u,t):
 r=s.get(u,timeout=t); r.raise_for_status(); return r.text
def component_products(soup):
 c=soup.find("products-overview"); raw=c and (c.get(":product-data") or c.get("v-bind:product-data"))
 if not raw:return []
 try:return [absolute(x["url"]) for x in json.loads(html.unescape(raw)).get("products",[]) if x.get("url")]
 except (json.JSONDecodeError,TypeError):return []
def discover(page,index):
 soup=BeautifulSoup(page,"html.parser"); products=component_products(soup)
 if products:return sorted(set(products))
 root=urlparse(index).path.rstrip("/"); urls=set()
 for a in soup.select("a[href]"):
  u=absolute(a["href"]); p=urlparse(u)
  if p.netloc==urlparse(BASE).netloc and p.path.rstrip("/").startswith(root+"/"):urls.add(u)
 return sorted(urls)
def record(page,url,collection):
 soup=BeautifulSoup(page,"html.parser"); crumbs=soup.select(".hero__breadcrumbs-link")
 title=clean(crumbs[-1].get_text(" ",strip=True)) if crumbs else ""
 if not title:
  tag=soup.find("meta",property="og:title"); title=clean(tag.get("content") if tag else "")
 d=soup.find("meta",attrs={"name":"description"}); image=soup.find("meta",property="og:image"); main=soup.find("main")
 return {"titulo":title,"colecao":collection,"url":url,"resumo":clean(d.get("content") if d else ""),"imagem":absolute(image["content"]) if image and image.get("content") else "","conteudo":clean(main.get_text(" ",strip=True)) if main else ""}
def load(p):
 if not p.exists():return []
 v=json.loads(p.read_text(encoding="utf8"))
 if not isinstance(v,list):raise ValueError(f"{p} deve conter uma lista JSON")
 return v
def write(p,v):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(v,ensure_ascii=False,indent=2)+"\n",encoding="utf8")
def export(name,path,out,s,delay,timeout,limit):
 index=absolute(path); urls=discover(fetch(s,index,timeout),index); urls=urls[:limit] if limit else urls
 target=out/f"koppert_{name}.json"; report=out/f"koppert_{name}_erros.json"; rows=load(target); known={x.get("url") for x in rows if isinstance(x,dict)}; errors=[]; added=0
 for i,u in enumerate(urls):
  try:
   if u not in known:
    row=record(fetch(s,u,timeout),u,name)
    if row["titulo"]:rows.append(row);known.add(u);added+=1
    else:errors.append({"url":u,"erro":"título não encontrado"})
  except requests.RequestException as exc:errors.append({"url":u,"erro":str(exc)})
  if i<len(urls)-1 and delay:time.sleep(delay)
 write(target,rows);write(report,{"colecao":name,"indice":index,"descobertas":len(urls),"adicionadas":added,"erros":errors})
 print(f"{name}: {added} adicionadas; {len(errors)} erros → {target}")
def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument("--output-dir",type=Path,default=Path("data"));p.add_argument("--only",choices=COLLECTIONS);p.add_argument("--limit",type=int);p.add_argument("--delay",type=float,default=.7);p.add_argument("--timeout",type=int,default=30);a=p.parse_args();s=session()
 for n,path in ({a.only:COLLECTIONS[a.only]} if a.only else COLLECTIONS).items():export(n,path,a.output_dir,s,a.delay,a.timeout,a.limit)
if __name__=="__main__":
 try:main()
 except (ValueError,json.JSONDecodeError) as e:print(f"Erro de JSON: {e}",file=sys.stderr);sys.exit(2)

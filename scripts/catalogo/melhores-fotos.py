#!/usr/bin/env python3
"""Melhores fotos do catálogo de espécies, por blocos (grupo taxonómico).

Para cada ficha junta candidatos de três fontes, todos com licença permissiva (CC0, CC BY, CC BY-SA, domínio público)
e do ORGANISMO CERTO (táxon resolvido como em verificar-fotos.py):

  1. Wikidata P18 — a imagem que os editores da Wikipédia escolheram para o táxon (Wikimedia Commons);
  2. fotos do iNaturalist do táxon (por ordem de curadoria);
  3. fotos mais votadas de observações de grau de investigação (só quando faltam boas).

Pontuação: origem (Wikidata 40, iNaturalist 30 menos a posição, observação 25 + favoritos) + resolução (lado maior:
≥2000 px +30, ≥1400 +24, ≥1000 +18, ≥700 +8, ≥500 0, menos de 500 −30). Só troca a foto actual se a nova pontuar
pelo menos MARGEM pontos mais; uma ficha sem imagem fica com a melhor candidata.

Comandos:
  candidatos --grupos Aves Mammalia   junta candidatos e guarda na cache (rede)
  escolher   --grupos Aves Mammalia   decide (sem rede) e escreve o plano em --plano
  aplicar    --plano plano.json       escreve imagem + foto em data/especies_master.json
"""
import argparse
import importlib.util
import json
import re
import subprocess
import sys
import time
import urllib.parse
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]


def carregar(nome, ficheiro):
    spec = importlib.util.spec_from_file_location(nome, RAIZ / "scripts" / "catalogo" / ficheiro)
    mod = importlib.util.module_from_spec(spec)
    sys.modules[nome] = mod
    spec.loader.exec_module(mod)
    return mod


vf = carregar("vf", "verificar-fotos.py")
lf = vf.lf
MARGEM = 12
# Fichas cujo nome comum e nome científico se contradizem: ficam sem foto até alguém decidir qual é a espécie certa.
EXCLUIR = {"terebinto", "buglossa", "trevina", "lapa-mansa", "cubres", "erva-mosca", "margaça", "sargaço-branco"}
QID = {"Plantae": "Q756", "Fungi": "Q764", "Aves": "Q5113", "Mammalia": "Q7377", "Insecta": "Q1390", "Arachnida": "Q1358",
       "Mollusca": "Q25326", "Actinopterygii": "Q127282", "Reptilia": "Q10811", "Amphibia": "Q10908", "Animalia": "Q729",
       "Chromista": "Q10250"}
MAU_NOME = re.compile(r"\b(egg|eggs|ei|eier|oeuf|oeufs|huevo|huevos|skull|skeleton|skelett|crane|cr[aâ]nio|map|range|distribution|plate|illustration|"
                      r"drawing|print|engraving|lithograph|painting|herbarium|specimen|museum|taxiderm|dead|carcass|nest|nestling|chick|tracks|"
                      r"footprint|scat|feather|feathers|silhouette|logo|stamp|coin|flag|diagram|chart|comparison|spectrogram|sonogram|fossil|"
                      r"cladogram|tree of life|svg|anatomy|dissection|sketch|cartoon|icon|symbol|mating|corpse|roadkill|killed|eaten|skin|pelt|"
                      r"trophy|hunted|market|cooked|dish|recipe|food)\b", re.I)
LIC_COMMONS = re.compile(r"^(CC BY(?:-SA)? \d\.\d(?: \w+)?|CC0(?: 1\.0)?|Public domain|PDM(?: 1\.0)?)$", re.I)


def curl(url, dados=None, cabecalhos=()):
    for tentativa in range(4):
        cmd = ["curl", "-s", "-m", "90", "-A", lf.UA]
        for c in cabecalhos:
            cmd += ["-H", c]
        if dados:
            cmd += ["--data-urlencode", dados]
        r = subprocess.run(cmd + [url], capture_output=True, text=True)
        if r.stdout.strip():
            return r.stdout
        time.sleep(3 + 4 * tentativa)
    raise RuntimeError("sem resposta: " + url[:80])


def pontuar(origem, lado, posicao=0, favoritos=0):
    base = {"wikidata": 40, "inat": max(30 - 1.5 * posicao, 15), "obs": 25 + min(favoritos, 15)}[origem]
    if lado >= 2000: res = 30
    elif lado >= 1400: res = 24
    elif lado >= 1000: res = 18
    elif lado >= 700: res = 8
    elif lado >= 500: res = 0
    else: res = -30
    return base + res


# ---------- candidatos ----------
def wikidata(nomes, grupo, cache):
    """nome científico → [(ficheiro P18, nome do táxon pai)]. A identidade confirma-se depois, comparando o pai
    com os antepassados do táxon do iNaturalist (nomes iguais em grupos diferentes ficam de fora)."""
    em_falta = sorted({n for n in nomes if n not in cache["wd"]})
    for i in range(0, len(em_falta), 80):
        lote = em_falta[i:i + 80]
        valores = " ".join('"' + n.replace('"', "") + '"' for n in lote)
        q = (f"SELECT ?n ?img ?pn WHERE {{ VALUES ?n {{ {valores} }} ?t wdt:P225 ?n . ?t wdt:P18 ?img . "
             f"OPTIONAL {{ ?t wdt:P171 ?p . ?p wdt:P225 ?pn . }} }}")
        try:
            dados = json.loads(curl("https://query.wikidata.org/sparql?format=json", "query=" + q, ["Accept: application/sparql-results+json"]))
        except Exception as erro:  # noqa: BLE001
            print("wikidata falhou:", erro, file=sys.stderr)
            continue
        achados = defaultdict(list)
        for b in dados["results"]["bindings"]:
            ficheiro = urllib.parse.unquote(b["img"]["value"].rsplit("/", 1)[-1]).replace("_", " ")
            par = [ficheiro, b.get("pn", {}).get("value", "")]
            if par not in achados[b["n"]["value"]]:
                achados[b["n"]["value"]].append(par)
        for n in lote:
            cache["wd"][n] = achados.get(n, [])[:4]
        time.sleep(1)


def commons(ficheiros, cache):
    em_falta = sorted({f for f in ficheiros if f not in cache["cm"]})
    for i in range(0, len(em_falta), 40):
        lote = em_falta[i:i + 40]
        q = urllib.parse.urlencode({"action": "query", "titles": "|".join("File:" + f for f in lote), "prop": "imageinfo",
                                    "iiprop": "extmetadata|size|mime|url", "iiurlwidth": "960", "format": "json", "formatversion": "2"})
        try:
            dados = json.loads(curl("https://commons.wikimedia.org/w/api.php?" + q))
        except Exception as erro:  # noqa: BLE001
            print("commons falhou:", erro, file=sys.stderr)
            continue
        titulos = {p["title"][5:]: p for p in dados["query"]["pages"]}
        norm = {t["from"][5:]: t["to"][5:] for t in dados["query"].get("normalized", [])}
        for f in lote:
            p = titulos.get(norm.get(f, f))
            ii = (p or {}).get("imageinfo", [None])[0] if p else None
            if not ii:
                cache["cm"][f] = None
                continue
            md = ii.get("extmetadata", {})
            lic = (md.get("LicenseShortName") or {}).get("value", "")
            art = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", (md.get("Artist") or {}).get("value", ""))).strip()
            cache["cm"][f] = {"lic": lic, "autor": art[:90], "licurl": (md.get("LicenseUrl") or {}).get("value", ""),
                              "w": ii.get("width", 0), "h": ii.get("height", 0), "mime": ii.get("mime", ""),
                              "thumb": (ii.get("thumburl") or "").split("?")[0], "page": ii.get("descriptionurl", "").split("?")[0]}
        time.sleep(0.5)


def inat_taxon(tids, cache):
    em_falta = sorted({t for t in tids if str(t) not in cache["it"] or "def" not in cache["it"][str(t)]
                       or any("x" not in f for f in cache["it"][str(t)]["fotos"])})
    for i in range(0, len(em_falta), 30):
        lote = em_falta[i:i + 30]
        try:
            res = lf.api("taxa/" + ",".join(map(str, lote)))["results"]
        except Exception as erro:  # noqa: BLE001
            print("inat falhou:", erro, file=sys.stderr)
            continue
        for r in res:
            fotos = []
            for pos, p in enumerate([r.get("default_photo")] + [x["photo"] for x in r.get("taxon_photos", [])]):
                if p and p.get("license_code") in lf.PERMISSIVAS:
                    d = p.get("original_dimensions") or {}
                    ext = (p.get("medium_url") or p.get("url") or "x.jpg").rsplit(".", 1)[-1].split("?")[0].lower()
                    fotos.append({"id": p["id"], "lic": p["license_code"], "attr": p.get("attribution") or "", "w": d.get("width", 0), "h": d.get("height", 0), "x": ext})
            vistos, unicas = set(), []
            for f in fotos:
                if f["id"] not in vistos:
                    vistos.add(f["id"]); unicas.append(f)
            dp = r.get("default_photo") or {}
            cache["it"][str(r["id"])] = {"nome": r["name"], "def": dp.get("id"), "fotos": unicas}


def inat_obs(tid, cache):
    chave = str(tid)
    if chave in cache["io"] and all("x" in f for f in cache["io"][chave]):
        return
    dados = lf.api(f"observations?taxon_id={tid}&quality_grade=research&photo_license=cc0,cc-by,cc-by-sa,pd&order_by=votes&per_page=8&photos=true")
    lista = []
    for o in dados.get("results", []):
        p = o["photos"][0]
        if p.get("license_code") not in lf.PERMISSIVAS:
            continue
        d = p.get("original_dimensions") or {}
        ext = (p.get("url") or "x.jpg").rsplit(".", 1)[-1].split("?")[0].lower()
        lista.append({"id": p["id"], "lic": p["license_code"], "attr": p.get("attribution") or "", "w": d.get("width", 0), "h": d.get("height", 0),
                      "fav": o.get("faves_count") or 0, "x": ext})
    cache["io"][chave] = lista


def novo_cache(caminho):
    base = {"wd": {}, "cm": {}, "it": {}, "io": {}, "im": {}}
    if caminho.exists():
        base.update(json.loads(caminho.read_text(encoding="utf-8")))
    return base


def guardar(cache, caminho):
    caminho.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")


def registos_do_bloco(master, grupos):
    return {k: v for k, v in master.items() if v.get("grupo") in grupos and k not in EXCLUIR}


def taxon_da_ficha(reg, todos, por_nome, vcache):
    t, estado = vf.resolver(reg.get("grupo"), reg.get("nome_cientifico"), por_nome)
    if estado == "sem-taxon":
        tid = vf.resolver_por_api(reg.get("grupo"), reg.get("nome_cientifico"), vcache)
        return todos.get(tid) if tid else None
    return t if estado in ("ok", "ambiguo") else None


def candidatos(args):
    caminho = Path(args.cache)
    cache = novo_cache(caminho)
    vcache = json.loads(Path(args.cache_verificacao).read_text(encoding="utf-8"))
    master = json.loads((RAIZ / "data" / "especies_master.json").read_text(encoding="utf-8"))
    print("A ler táxons…", flush=True)
    todos, por_nome = vf.ler_taxa()
    bloco = registos_do_bloco(master, args.grupos)
    print(f"{len(bloco)} fichas.", flush=True)
    taxon = {k: taxon_da_ficha(v, todos, por_nome, vcache) for k, v in bloco.items()}
    Path(args.cache_verificacao).write_text(json.dumps(vcache, ensure_ascii=False), encoding="utf-8")
    print(f"{sum(1 for t in taxon.values() if t)} com táxon.", flush=True)
    # 1. Wikidata
    por_grupo = defaultdict(set)
    for k, v in bloco.items():
        t = taxon[k]
        if not t:
            continue
        for n in {t["nome"], (v.get("nome_cientifico") or "").strip()}:
            if n:
                por_grupo[v["grupo"]].add(n)
    for g, nomes in por_grupo.items():
        wikidata(nomes, g, cache)
    guardar(cache, caminho)
    ficheiros = {f for lista in cache["wd"].values() for f, _ in lista}
    commons(ficheiros, cache)
    guardar(cache, caminho)
    print(f"Wikidata: {sum(1 for l in cache['wd'].values() if l)} nomes com P18; Commons: {len(cache['cm'])} ficheiros.", flush=True)
    # 2. iNaturalist (táxon)
    inat_taxon({t["id"] for t in taxon.values() if t}, cache)
    guardar(cache, caminho)
    # 3. observações, só onde não há nenhuma candidata com 1000 px
    precisa = []
    for k, v in bloco.items():
        t = taxon[k]
        if not t:
            continue
        m0 = melhores(v, t, cache, todos, sem_obs=True)
        if not m0 or m0[0]["pontos"] < 48:
            precisa.append(t["id"])
    precisa = sorted(set(precisa))
    print(f"{len(precisa)} táxons precisam de observações.", flush=True)
    feitos = 0

    def um(tid):
        try:
            inat_obs(tid, cache)
        except Exception as erro:  # noqa: BLE001
            print("obs falhou", tid, erro, file=sys.stderr)
    with ThreadPoolExecutor(max_workers=3) as pool:
        for _ in pool.map(um, precisa):
            feitos += 1
            if feitos % 60 == 0:
                guardar(cache, caminho)
                print(f"  {feitos}/{len(precisa)}", flush=True)
    guardar(cache, caminho)


# ---------- escolha ----------
def candidatas_da_ficha(reg, t, cache, todos, sem_obs=False):
    c = []
    nomes = {t["nome"], (reg.get("nome_cientifico") or "").strip()}
    anc_nomes = {todos[int(a)]["nome"] for a in t["anc"] if int(a) in todos}
    vistos = set()
    for n in nomes:
        for f, pai in cache["wd"].get(n, []):
            if f in vistos or (pai and pai not in anc_nomes):
                continue
            vistos.add(f)
            m = cache["cm"].get(f)
            if not m or not LIC_COMMONS.match(m["lic"] or "") or not m["mime"].startswith("image/") or "svg" in m["mime"] or "tiff" in m["mime"]:
                continue
            lado = max(m["w"], m["h"])
            if min(m["w"], m["h"]) < 500 or MAU_NOME.search(f.rsplit(".", 1)[0]):
                continue
            c.append({"origem": "wikidata", "ficheiro": f, "lado": lado, "pontos": pontuar("wikidata", lado), "m": m})
    entrada = cache["it"].get(str(t["id"]))
    if entrada:
        for pos, f in enumerate(entrada["fotos"]):
            lado = max(f["w"], f["h"])
            c.append({"origem": "inat", "foto": f, "lado": lado, "pontos": pontuar("inat", lado, pos)})
    if not sem_obs:
        for f in cache["io"].get(str(t["id"]), []):
            lado = max(f["w"], f["h"])
            c.append({"origem": "obs", "foto": f, "lado": lado, "pontos": pontuar("obs", lado, 0, f["fav"])})
    return c


def melhores(reg, t, cache, todos, sem_obs=False):
    return sorted(candidatas_da_ficha(reg, t, cache, todos, sem_obs), key=lambda x: -x["pontos"])


def credito(c):
    if c["origem"] == "wikidata":
        m = c["m"]
        return {"autor": m["autor"] or "Wikimedia Commons", "licenca": m["lic"], "licenca_url": m["licurl"], "pagina": m["page"], "origem": "Wikimedia Commons"}
    f = c["foto"]
    lic = lf.LICENCAS[f["lic"]]
    return {"autor": lf.autor_de(f["attr"], f["lic"]) or "iNaturalist", "licenca": lic[0], "licenca_url": lic[1],
            "pagina": f"https://www.inaturalist.org/photos/{f['id']}", "origem": "iNaturalist"}


def imagens(c):
    """(cartão ~500 px, grande ~1000 px)"""
    if c["origem"] == "wikidata":
        base = c["m"]["thumb"]
        if "/thumb/" not in base:  # original mais pequeno que a miniatura pedida: serve o próprio ficheiro
            return base, base
        return re.sub(r"/\d+px-", "/500px-", base), base
    i, x = c["foto"]["id"], c["foto"].get("x", "jpg")
    return f"https://inaturalist-open-data.s3.amazonaws.com/photos/{i}/medium.{x}", f"https://inaturalist-open-data.s3.amazonaws.com/photos/{i}/large.{x}"


def analisar_imagem(url, cache):
    """Descarrega a miniatura e descarta desenhos, pranchas de herbário e imagens quase brancas ou pretas.
    A Wikimedia limita pedidos em paralelo (devolve HTML): repete com espera; se não conseguir, não decide («erro»)."""
    if url in cache["im"] and "erro" not in cache["im"][url]:
        return cache["im"][url]
    try:
        import io
        import numpy as np
        from PIL import Image
    except ImportError as erro:
        raise SystemExit(f"Falta numpy ou Pillow ({erro})")
    r = {"mau": False, "erro": True}
    for tentativa in range(5):
        dados = subprocess.run(["curl", "-s", "-m", "60", "-A", lf.UA, url], capture_output=True).stdout
        try:
            img = Image.open(io.BytesIO(dados)).convert("RGB")
        except Exception:  # noqa: BLE001
            time.sleep(2 + 3 * tentativa)
            continue
        img.thumbnail((200, 200))
        a = np.asarray(img).astype("float32") / 255
        mx, mn = a.max(axis=2), a.min(axis=2)
        sat = float(np.mean((mx - mn) / (mx + 1e-6)))
        branco = float(np.mean(mn > 0.78))
        preto = float(np.mean(mx < 0.12))
        r = {"sat": round(sat, 3), "branco": round(branco, 3), "preto": round(preto, 3),
             "mau": bool(branco > 0.5 or (sat < 0.10 and branco > 0.28) or preto > 0.6)}
        break
    cache["im"][url] = r
    return r


def escolher(args):
    cache = novo_cache(Path(args.cache))
    vcache = json.loads(Path(args.cache_verificacao).read_text(encoding="utf-8"))
    master = json.loads((RAIZ / "data" / "especies_master.json").read_text(encoding="utf-8"))
    todos, por_nome = vf.ler_taxa()
    bloco = registos_do_bloco(master, args.grupos)
    plano, estados = {}, Counter()
    # análise das imagens da Wikidata em paralelo (8 de cada vez) antes de decidir
    urls = set()
    for k, v in bloco.items():
        t = taxon_da_ficha(v, todos, por_nome, vcache)
        if t:
            for c in [c for c in melhores(v, t, cache, todos) if c["origem"] == "wikidata"][:2]:
                urls.add(re.sub(r"/\d+px-", "/500px-", c["m"]["thumb"]))
    por_analisar = sorted(u for u in urls if u not in cache["im"] or "erro" in cache["im"][u])
    print(f"{len(por_analisar)} imagens a analisar…", flush=True)
    resultados = {}

    def uma(u):
        resultados[u] = analisar_imagem(u, {"im": {}})
    with ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(uma, por_analisar))
    cache["im"].update(resultados)
    for k, v in bloco.items():
        t = taxon_da_ficha(v, todos, por_nome, vcache)
        if not t:
            estados["sem-taxon"] += 1
            continue
        cand = melhores(v, t, cache, todos)
        cand = [c for c in cand if c["origem"] != "wikidata" or not analisar_imagem(re.sub(r"/\d+px-", "/500px-", c["m"]["thumb"]), cache)["mau"]]
        entrada = cache["it"].get(str(t["id"]), {"def": None, "fotos": []})
        m = lf.URL_FOTO.match(v.get("imagem") or "")
        atual_id = int(m.group(1)) if m else None
        atual = next((f for f in entrada["fotos"] + cache["io"].get(str(t["id"]), []) if f["id"] == atual_id), None) if atual_id else None
        escolha = None
        if not v.get("imagem"):
            escolha = cand[0] if cand else None
            estados["preenchida" if escolha else "sem-candidata"] += 1
        elif t["nivel"] > 10:
            estados["mantida-nivel-acima-da-especie"] += 1
        elif not atual_id:
            estados["mantida-escolhida-a-vista"] += 1  # Commons/outra origem já escolhida
        else:
            lado = max(atual["w"], atual["h"]) if atual else 0
            e_destacada = atual_id == entrada.get("def")
            if e_destacada and lado >= 800:
                estados["mantida-destacada"] += 1
            elif atual and lado >= 1400 and e_destacada is False and atual_id == (entrada["fotos"][0]["id"] if entrada["fotos"] else None):
                estados["mantida-primeira-do-taxon"] += 1
            else:
                # foto trocada por mim antes (ou pequena): 1) destacada do iNaturalist se permissiva e grande; 2) imagem da Wikipédia; 3) melhor pontuada
                destac = next((c for c in cand if c["origem"] == "inat" and c["foto"]["id"] == entrada.get("def") and c["lado"] >= 1000), None)
                wiki = next((c for c in cand if c["origem"] == "wikidata" and c["lado"] >= 1000), None)
                escolha = destac or wiki or (cand[0] if cand else None)
                if escolha and atual_id and escolha.get("foto", {}).get("id") == atual_id:
                    escolha = None
                    estados["mantida-ja-e-a-melhor"] += 1
                elif escolha is None:
                    estados["mantida-sem-alternativa"] += 1
        if escolha:
            cartao, grande = imagens(escolha)
            plano[k] = {"antes": v.get("imagem") or "", "imagem": cartao, "grande": grande, "foto": credito(escolha), "pontos": escolha["pontos"],
                        "rank": t["rank"], "origem": escolha["origem"], "lado": escolha["lado"], "grupo": v["grupo"], "nome": v.get("nome"),
                        "cientifico": v.get("nome_cientifico")}
            if v.get("imagem"):
                estados["trocada-" + escolha["origem"]] += 1
    Path(args.plano).write_text(json.dumps(plano, ensure_ascii=False), encoding="utf-8")
    guardar(cache, Path(args.cache))
    print(dict(estados.most_common()))


def aplicar(args):
    plano = json.loads(Path(args.plano).read_text(encoding="utf-8"))
    master = json.loads((RAIZ / "data" / "especies_master.json").read_text(encoding="utf-8"))
    for k, p in plano.items():
        master[k]["imagem"] = p["imagem"]
        f = dict(p["foto"])
        if p["grande"] != p["imagem"] and p["origem"] == "wikidata":
            f["grande"] = p["grande"]
        if re.search(r"['‘’]|\bcv\.|\bsubsp\.|\bvar\.", master[k].get("nome_cientifico", "")):
            f["da_especie"] = True
        master[k]["foto"] = f
    (RAIZ / "data" / "especies_master.json").write_text(json.dumps(master, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(len(plano), "fichas atualizadas.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("comando", choices=["candidatos", "escolher", "aplicar"])
    ap.add_argument("--grupos", nargs="+", default=[])
    ap.add_argument("--cache", default=str(RAIZ / "scripts" / "catalogo" / ".cache-melhores.json"))
    ap.add_argument("--cache-verificacao", default=str(RAIZ / "scripts" / "catalogo" / ".cache-fotos.json"))
    ap.add_argument("--plano", default=str(RAIZ / "scripts" / "catalogo" / ".plano.json"))
    a = ap.parse_args()
    {"candidatos": candidatos, "escolher": escolher, "aplicar": aplicar}[a.comando](a)

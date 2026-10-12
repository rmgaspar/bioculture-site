#!/usr/bin/env python3
"""Fotos de pragas, hortícolas e fauna invasora: só com licença permissiva e crédito.

Mesma política de scripts/catalogo/licencas-fotos.py (CC0, CC BY, CC BY-SA, domínio público), para os
ficheiros data/pragas.json, data/horticolas_master.json, data/fauna_invasora.json e data/flora_invasora.json:

  - Wikimedia Commons: lê autor e licença de cada ficheiro (API da Commons) e acrescenta o crédito `foto`;
    se a licença não serve (por exemplo GFDL) ou o ficheiro já não existe, troca por uma foto do iNaturalist.
  - iNaturalist: audita a licença como no catálogo de espécies e troca se for preciso.
  - Qualquer outra origem (Koppert, extensão da UMN…): troca por uma foto do iNaturalist do mesmo táxon.
    Se não houver, retira a imagem.

Uso:  python3 scripts/catalogo/fotos-terceiros.py [--cache ficheiro.json] [--relatorio] [--so pragas horticolas_master …]
Atenção: o ficheiro reescreve `imagem` e `foto` de todos os registos tratados; entradas genéricas escolhidas à mão (por exemplo
aves-frugivoras-em-pomares) perdem-se se voltares a correr sem --so.
"""
import argparse
import importlib.util
import json
import re
import sys
import time
import urllib.parse
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("lf", RAIZ / "scripts" / "catalogo" / "licencas-fotos.py")
lf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lf)

FICHEIROS = ["pragas", "horticolas_master", "fauna_invasora", "flora_invasora", "especies_master"]
# especies_master (fotos do iNaturalist) é tratado por licencas-fotos.py; aqui só entram as poucas da Wikimedia.
LIC_COMMONS = re.compile(r"^(CC BY(?:-SA)? \d\.\d(?: \w+)?|CC0(?: 1\.0)?|Public domain|PDM(?: 1\.0)?)$", re.I)


def registos(nome):
    caminho = RAIZ / "data" / f"{nome}.json"
    dados = json.loads(caminho.read_text(encoding="utf-8"))
    pares = list(dados.items()) if isinstance(dados, dict) else [(x["id"], x) for x in dados]
    return caminho, dados, pares


def nome_ficheiro(url):
    m = re.search(r"/commons/(?:thumb/)?[0-9a-f]/[0-9a-f]{2}/([^/]+)", url)
    return urllib.parse.unquote(m.group(1)).replace("_", " ") if m else None


def limpa(html):
    texto = re.sub(r"<[^>]+>", "", html or "")
    texto = texto.replace("&amp;", "&").replace("&quot;", '"').replace("&#039;", "'")
    return re.sub(r"\s+", " ", texto).strip()


def commons(nomes):
    saida = {}
    nomes = sorted(nomes)
    for i in range(0, len(nomes), 40):
        q = urllib.parse.urlencode({"action": "query", "titles": "|".join("File:" + n for n in nomes[i:i + 40]),
                                    "prop": "imageinfo", "iiprop": "extmetadata", "format": "json", "formatversion": "2"})
        time.sleep(0.5)
        dados = json.loads(lf.pedir("https://commons.wikimedia.org/w/api.php?" + q))
        for p in dados["query"]["pages"]:
            meta = (p.get("imageinfo") or [{}])[0].get("extmetadata", {})
            saida[p["title"][5:]] = {k: meta.get(k, {}).get("value") for k in ("Artist", "LicenseShortName", "LicenseUrl")}
    return saida


def nome_para_taxon(nome, taxa):
    """«Pieris brassicae e Pieris rapae» → Pieris brassicae; «Agrotis spp.» → Agrotis."""
    primeiro = re.split(r"\s+(?:e|ou)\s+|,|\(", nome or "")[0].strip()
    primeiro = re.sub(r"\s+(spp|sp)\.?$", "", primeiro).strip()
    # Nunca recua para o género quando a ficha é de uma espécie: a foto de um género mostra outra espécie.
    tentativas = [primeiro] + ([" ".join(primeiro.split()[:2])] if len(primeiro.split()) > 2 else [])
    for tentativa in tentativas:
        if tentativa in taxa:
            return taxa[tentativa]
    return None


def garantir_taxons(ids, cache, cache_path):
    em_falta = sorted(set(ids) - {int(k) for k in cache["taxa"]})
    for i in range(0, len(em_falta), 30):
        lote = em_falta[i:i + 30]
        for r in lf.api("taxa/" + ",".join(map(str, lote)))["results"]:
            cache["taxa"][str(r["id"])] = {"nome": r["name"], "default": lf.tratar_foto(r.get("default_photo")),
                                           "fotos": [lf.tratar_foto(p["photo"]) for p in r.get("taxon_photos", [])]}
    cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")


def pre_carregar_observacoes(ids, cache, cache_path):
    """Procura em paralelo (3 pedidos de cada vez) as alternativas dos táxons sem foto permissiva."""
    from concurrent.futures import ThreadPoolExecutor
    faltam = []
    for tid in sorted(ids):
        entrada = cache["taxa"].get(str(tid))
        fotos = ([entrada["default"]] if entrada and entrada["default"] else []) + [p for p in (entrada["fotos"] if entrada else []) if p]
        if not any(f["lic"] in lf.PERMISSIVAS for f in fotos) and str(tid) not in cache["obs"]:
            faltam.append(tid)
    print(f"{len(faltam)} táxons sem foto permissiva: a procurar em observações…", flush=True)

    def um(tid):
        try:
            return lf.procurar_observacoes(tid, cache, cache_path)
        except Exception as erro:  # noqa: BLE001
            print("falhou", tid, erro, file=sys.stderr)
    feitos = 0
    with ThreadPoolExecutor(max_workers=3) as pool:
        for _ in pool.map(um, faltam):
            feitos += 1
            if feitos % 50 == 0:
                cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
                print(f"  {feitos}/{len(faltam)}", flush=True)
    cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")


def foto_inat(tid, cache, cache_path):
    """Primeira foto permissiva do táxon (ou de uma observação), ou None."""
    entrada = cache["taxa"].get(str(tid)) if tid else None
    fotos = ([entrada["default"]] if entrada and entrada["default"] else []) + [p for p in (entrada["fotos"] if entrada else []) if p]
    permissiveis = [f for f in fotos if f["lic"] in lf.PERMISSIVAS]
    if not permissiveis and tid:
        permissiveis = lf.procurar_observacoes(tid, cache, cache_path)
    return permissiveis[0] if permissiveis else None


def credito_inat(foto):
    lic = lf.LICENCAS[foto["lic"]]
    return {"autor": lf.autor_de(foto["attr"], foto["lic"]) or "iNaturalist", "licenca": lic[0], "licenca_url": lic[1],
            "pagina": f"https://www.inaturalist.org/photos/{foto['id']}", "origem": "iNaturalist"}


def main(cache_path, so_relatorio, so=None):
    cache = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {"taxa": {}, "obs": {}}
    print("A ler a lista de táxons do iNaturalist…", flush=True)
    taxa = lf.ids_de_taxa()
    todos = {n: registos(n) for n in (so or FICHEIROS)}
    nomes_commons, ids_precisos = set(), set()
    plano = []  # (ficheiro, chave, tipo)
    for nome, (_, _, pares) in todos.items():
        for chave, reg in pares:
            url = reg.get("imagem") or ""
            if nome == "especies_master" and "wikimedia.org" not in url and "plantar.pt" not in url:
                continue  # as fotos do iNaturalist do catálogo são tratadas por licencas-fotos.py
            if "wikimedia.org" in url:
                nomes_commons.add(nome_ficheiro(url))
                plano.append((nome, chave, "commons"))
            elif url and ("inaturalist" in url):
                plano.append((nome, chave, "inat"))
            elif url and url.startswith("http"):
                plano.append((nome, chave, "outra"))  # Koppert, UMN, plantar.pt, invasoras.pt…
    meta = commons({n for n in nomes_commons if n})
    for nome, chave, tipo in plano:
        reg = dict(todos[nome][2])[chave]
        if tipo in ("inat", "outra"):
            tid = nome_para_taxon(reg.get("nome_cientifico"), taxa)
            if tid:
                ids_precisos.add(tid)
    garantir_taxons(ids_precisos, cache, cache_path)
    pre_carregar_observacoes(ids_precisos, cache, cache_path)
    estados, mudancas = Counter(), []
    for nome, chave, tipo in plano:
        reg = dict(todos[nome][2])[chave]
        url = reg["imagem"]
        tid = nome_para_taxon(reg.get("nome_cientifico"), taxa)
        novo = None  # (estado, imagem, foto)
        if tipo == "commons":
            ficheiro = nome_ficheiro(url)
            m = meta.get(ficheiro, {}) if ficheiro else {}
            lic = m.get("LicenseShortName") or ""
            if lic and LIC_COMMONS.match(lic):
                autor = limpa(m.get("Artist")) or "Wikimedia Commons"
                novo = ("commons-mantida", url, {"autor": autor, "licenca": lic, "licenca_url": m.get("LicenseUrl") or "",
                                                   "pagina": "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(ficheiro.replace(" ", "_")),
                                                   "origem": "Wikimedia Commons"})
        elif tipo == "inat":
            idf = lf.URL_FOTO.match(url)
            entrada = cache["taxa"].get(str(tid)) if tid else None
            fotos = ([entrada["default"]] if entrada and entrada["default"] else []) + [p for p in (entrada["fotos"] if entrada else []) if p]
            atual = next((f for f in fotos if idf and f["id"] == int(idf.group(1))), None)
            if atual and atual["lic"] in lf.PERMISSIVAS:
                novo = ("inat-mantida", atual["url"] or url, credito_inat(atual))
        if novo is None:  # troca por iNaturalist
            f = foto_inat(tid, cache, cache_path)
            novo = ("trocada-" + tipo, f["url"], credito_inat(f)) if f else ("removida-" + tipo, "", None)
        estados[novo[0]] += 1
        mudancas.append((nome, chave, novo))
    cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
    print("Resultado:")
    for e, n in estados.most_common():
        print(f"  {n:4d}  {e}")
    if so_relatorio:
        return
    for nome, chave, (estado, imagem, foto) in mudancas:
        caminho, dados, pares = todos[nome]
        reg = dict(pares)[chave]
        reg["imagem"] = imagem
        if foto:
            reg["foto"] = foto
        else:
            reg.pop("foto", None)
    for nome, (caminho, dados, _) in todos.items():
        original = caminho.read_text(encoding="utf-8")
        recuo = 2 if re.match(r'^\{\n  "|^\[\n  ', original) else 4
        caminho.write_text(json.dumps(dados, ensure_ascii=False, indent=recuo) + ("\n" if original.endswith("\n") else ""), encoding="utf-8")
    print("Ficheiros atualizados.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=str(RAIZ / "scripts" / "catalogo" / ".cache-fotos.json"))
    ap.add_argument("--relatorio", action="store_true")
    ap.add_argument("--so", nargs="+", choices=FICHEIROS, help="tratar só estes ficheiros (os restantes ficam como estão)")
    a = ap.parse_args()
    main(Path(a.cache), a.relatorio, a.so)

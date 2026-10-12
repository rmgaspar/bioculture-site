#!/usr/bin/env python3
"""Licenças das fotos do catálogo de espécies (iNaturalist).

As fotos de data/especies_master.json vêm do iNaturalist (campo `imagem`). Cada uma tem a licença do
seu autor; só CC0, CC BY e CC BY-SA permitem uso comercial e adaptação (recorte, redimensionamento),
sempre com crédito (CC0 não exige). Este script:

  auditar   consulta a API do iNaturalist (por nome científico, em lotes) e guarda, numa cache JSON, a
            licença de cada foto e as alternativas permissivas do mesmo táxon. Não altera nada.
  aplicar   com a cache pronta: mantém as fotos permissivas (acrescentando o crédito em `foto`),
            troca as restantes por uma foto permissiva do mesmo táxon e, se não houver, retira a foto
            (a ficha mostra a inicial do nome). Depois corre
            `node scripts/gerar-especies.mjs` (ou o fluxo normal de build) para refazer índice e blocos.

Uso:  python3 scripts/catalogo/licencas-fotos.py auditar [--cache ficheiro.json]
      python3 scripts/catalogo/licencas-fotos.py aplicar  [--cache ficheiro.json] [--relatorio]
"""
import argparse
import csv
import gzip
import io
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
MASTER = RAIZ / "data" / "especies_master.json"
UA = "bioCultura-site/1.0 (rmgaspar@me.com)"
PERMISSIVAS = {"cc0", "cc-by", "cc-by-sa", "pd"}
LICENCAS = {
    "cc0": ("CC0", "https://creativecommons.org/publicdomain/zero/1.0/"),
    "pd": ("Domínio público", "https://creativecommons.org/publicdomain/mark/1.0/"),
    "cc-by": ("CC BY", "https://creativecommons.org/licenses/by/4.0/"),
    "cc-by-sa": ("CC BY-SA", "https://creativecommons.org/licenses/by-sa/4.0/"),
}
URL_FOTO = re.compile(r"^https://(?:inaturalist-open-data\.s3\.amazonaws\.com|static\.inaturalist\.org)/photos/(\d+)/")
TAXA_CSV = "https://inaturalist-open-data.s3.amazonaws.com/taxa.csv.gz"


def pedir(url, tentativas=4):
    for n in range(tentativas):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except Exception as erro:  # noqa: BLE001
            if n == tentativas - 1:
                raise
            time.sleep(3 + 4 * n)


def api(caminho):
    time.sleep(0.8)
    return json.loads(pedir("https://api.inaturalist.org/v1/" + caminho))


def ids_de_taxa():
    """nome científico → id de táxon (activos; prefere a espécie)."""
    dados = pedir(TAXA_CSV)
    melhor = {}
    with gzip.open(io.BytesIO(dados), "rt", encoding="utf-8") as f:
        for linha in csv.DictReader(f, delimiter="\t"):
            if linha["active"] != "true":
                continue
            nivel = float(linha["rank_level"] or 100)
            atual = melhor.get(linha["name"])
            if atual is None or nivel < atual[0]:
                melhor[linha["name"]] = (nivel, int(linha["taxon_id"]))
    return {nome: v[1] for nome, v in melhor.items()}


def tratar_foto(f):
    if not f:
        return None
    return {"id": f.get("id"), "lic": f.get("license_code"), "attr": f.get("attribution") or "",
            "url": (f.get("medium_url") or "").replace("static.inaturalist.org", "inaturalist-open-data.s3.amazonaws.com")}


def alvos(master, taxa):
    """Fotos do iNaturalist por verificar: id da foto, nome científico e id de táxon."""
    saida = {}
    for chave, reg in master.items():
        m = URL_FOTO.match(reg.get("imagem") or "")
        if not m:
            continue
        nome = (reg.get("nome_cientifico") or "").strip()
        tid = taxa.get(nome) or taxa.get(" ".join(nome.split()[:2]))
        saida[chave] = {"foto": int(m.group(1)), "nome": nome, "taxon": tid}
    return saida


def auditar(cache_path):
    master = json.loads(MASTER.read_text(encoding="utf-8"))
    print("A ler a lista de táxons do iNaturalist…", flush=True)
    taxa = ids_de_taxa()
    lista = alvos(master, taxa)
    cache = json.loads(cache_path.read_text(encoding="utf-8")) if cache_path.exists() else {"taxa": {}, "obs": {}}
    por_tomar = sorted({v["taxon"] for v in lista.values() if v["taxon"]} - {int(k) for k in cache["taxa"]})
    print(f"{len(lista)} fotos; {len(por_tomar)} táxons por consultar.", flush=True)
    for i in range(0, len(por_tomar), 30):
        lote = por_tomar[i:i + 30]
        try:
            res = api("taxa/" + ",".join(map(str, lote)))["results"]
        except Exception as erro:  # noqa: BLE001
            print("falhou o lote", i, erro, file=sys.stderr)
            continue
        for r in res:
            cache["taxa"][str(r["id"])] = {
                "nome": r["name"],
                "default": tratar_foto(r.get("default_photo")),
                "fotos": [tratar_foto(p["photo"]) for p in r.get("taxon_photos", [])],
            }
        cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
        print(f"  {min(i + 30, len(por_tomar))}/{len(por_tomar)}", flush=True)
    print("Táxons consultados.", flush=True)


def procurar_observacoes(tid, cache, cache_path):
    """Fotos permissivas de observações de grau de investigação (quando o táxon não tem nenhuma)."""
    chave = str(tid)
    if chave in cache["obs"]:
        return cache["obs"][chave]
    dados = api(f"observations?taxon_id={tid}&quality_grade=research&photo_license=cc0,cc-by,cc-by-sa,pd&order_by=votes&per_page=3&photos=true")
    lista = []
    for o in dados.get("results", []):
        p = o["photos"][0]
        if p.get("license_code") in PERMISSIVAS:
            lista.append(tratar_foto({"id": p["id"], "license_code": p["license_code"], "attribution": p.get("attribution"),
                                      "medium_url": p["url"].replace("square", "medium")}))
    cache["obs"][chave] = lista
    return lista


def autor_de(attr, lic):
    """Nome do autor a partir do texto de atribuição do iNaturalist (que vem na língua do autor)."""
    m = re.match(r"\(c\)\s*(.*)\s*,\s*[^,()]*\(CC[^)]*\)", attr or "", re.S)
    if not m:
        return None
    nome = re.sub(r"\s+", " ", m.group(1)).strip(" ,")
    nome = re.sub(r"^Photo by\s+", "", nome)
    return nome or None


def decidir(reg_alvo, cache, cache_path, buscar):
    """Devolve (estado, foto escolhida) para um registo."""
    tid = reg_alvo["taxon"]
    entrada = cache["taxa"].get(str(tid)) if tid else None
    fotos = []
    if entrada:
        fotos = ([entrada["default"]] if entrada["default"] else []) + [p for p in entrada["fotos"] if p]
    atual = next((f for f in fotos if f["id"] == reg_alvo["foto"]), None)
    if atual and atual["lic"] in PERMISSIVAS:
        return "mantida", atual
    permissiveis = [f for f in fotos if f["lic"] in PERMISSIVAS]
    if not permissiveis and tid and buscar:
        permissiveis = procurar_observacoes(tid, cache, cache_path)
    if permissiveis:
        return ("trocada", permissiveis[0])
    if atual:
        return ("sem-alternativa-" + (atual["lic"] or "reservada"), atual)
    return ("desconhecida", None)


def precarregar(lista, cache, cache_path):
    """Procura em paralelo (3 pedidos de cada vez) as fotos permissivas dos táxons que não têm nenhuma."""
    from concurrent.futures import ThreadPoolExecutor
    faltam = []
    for alvo in lista.values():
        tid = alvo["taxon"]
        entrada = cache["taxa"].get(str(tid)) if tid else None
        fotos = ([entrada["default"]] if entrada and entrada["default"] else []) + [p for p in (entrada["fotos"] if entrada else []) if p]
        if tid and not any(f["lic"] in PERMISSIVAS for f in fotos) and str(tid) not in cache["obs"]:
            faltam.append(tid)
    faltam = sorted(set(faltam))
    print(f"{len(faltam)} táxons sem foto permissiva: a procurar em observações…", flush=True)

    def um(tid):
        try:
            return tid, procurar_observacoes(tid, cache, cache_path)
        except Exception as erro:  # noqa: BLE001
            print("falhou", tid, erro, file=sys.stderr)
            return tid, None
    feitos = 0
    with ThreadPoolExecutor(max_workers=3) as pool:
        for _ in pool.map(um, faltam):
            feitos += 1
            if feitos % 50 == 0:
                cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
                print(f"  {feitos}/{len(faltam)}", flush=True)
    cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")


def aplicar(cache_path, so_relatorio, buscar=True):
    master = json.loads(MASTER.read_text(encoding="utf-8"))
    cache = json.loads(cache_path.read_text(encoding="utf-8"))
    taxa = ids_de_taxa()
    lista = alvos(master, taxa)
    if buscar:
        precarregar(lista, cache, cache_path)
    estados = Counter()
    exemplos = {}
    novos = {}
    for chave, alvo in lista.items():
        estado, foto = decidir(alvo, cache, cache_path, buscar)
        estados[estado] += 1
        exemplos.setdefault(estado, []).append(chave)
        novos[chave] = (estado, foto)
    print("Resultado:")
    for estado, n in estados.most_common():
        print(f"  {n:5d}  {estado}  ex.: {', '.join(exemplos[estado][:3])}")
    if so_relatorio:
        return
    for chave, (estado, foto) in novos.items():
        reg = master[chave]
        if estado in ("mantida", "trocada") and foto:
            lic = LICENCAS[foto["lic"]]
            autor = autor_de(foto["attr"], foto["lic"])
            reg["imagem"] = foto["url"]
            reg["foto"] = {"autor": autor or "iNaturalist", "licenca": lic[0], "licenca_url": lic[1],
                           "pagina": f"https://www.inaturalist.org/photos/{foto['id']}"}
        else:
            # sem licença permissiva e sem alternativa (reservada, desconhecida, uso não comercial ou sem derivações):
            # a ficha fica sem foto (mostra a inicial do nome) em vez de usar uma foto que não podemos usar.
            reg["imagem"] = ""
            reg.pop("foto", None)
    MASTER.write_text(json.dumps(master, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("data/especies_master.json atualizado; corre node scripts/gerar-especies.mjs.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("comando", choices=["auditar", "aplicar"])
    ap.add_argument("--cache", default=str(RAIZ / "scripts" / "catalogo" / ".cache-fotos.json"))
    ap.add_argument("--relatorio", action="store_true", help="só mostra os números, sem alterar o catálogo")
    ap.add_argument("--sem-observacoes", action="store_true", help="não procura alternativas em observações")
    a = ap.parse_args()
    caminho = Path(a.cache)
    if a.comando == "auditar":
        auditar(caminho)
    else:
        aplicar(caminho, a.relatorio, buscar=not a.sem_observacoes)

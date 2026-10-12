#!/usr/bin/env python3
"""Verifica que cada foto do iNaturalist é MESMO da espécie da ficha.

O nome científico sozinho engana: *Olea* é a oliveira mas também um molusco, *Ficus* o figo e outro molusco,
*Parietaria*, *Solenopsis*… Esta verificação liga cada foto ao táxon de onde veio e confere:

  1. a foto pertence ao táxon que corresponde ao nome científico da ficha (e ao seu grupo: planta, ave, inseto…);
  2. o nome científico da ficha é coerente com o grupo da ficha (senão a ficha tem dados trocados);
  3. fichas sem táxon encontrado não ficam com foto.

Uso:
  python3 scripts/catalogo/verificar-fotos.py [--cache ficheiro.json] [--corrigir]

Sem --corrigir só escreve o relatório (scripts/catalogo/relatorio-fotos.json, fora do repositório se passares --relatorio).
Com --corrigir troca as fotos erradas por fotos do táxon certo (CC0, CC BY, CC BY-SA, domínio público) e retira as que
não têm táxon certo. Fichas com dados incoerentes ficam listadas para correção manual.
"""
import argparse
import csv
import gzip
import importlib.util
import io
import json
import re
import sys
import urllib.parse
from collections import Counter, defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("lf", RAIZ / "scripts" / "catalogo" / "licencas-fotos.py")
lf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lf)

# Grupos: ids de iNaturalist dos táxons que identificam cada grupo (classe, filo ou reino).
GRUPOS = {"Aves": "3", "Mammalia": "40151", "Reptilia": "26036", "Amphibia": "20978", "Actinopterygii": "47178",
          "Insecta": "47158", "Arachnida": "47119", "Mollusca": "47115", "Plantae": "47126", "Fungi": "47170", "Chromista": "48222"}
ANIMAIS = {"Aves", "Mammalia", "Reptilia", "Amphibia", "Actinopterygii", "Insecta", "Arachnida", "Mollusca", "Animalia"}
# Grupo da ficha → grupos de táxon aceites (None = sem restrição).
ACEITA = {g: {g} for g in GRUPOS}
ACEITA.update({"Flora Invasora": {"Plantae"}, "Animalia": ANIMAIS, "Sanidade Vegetal": None, "N/A": None, "Fauna Invasora": ANIMAIS})


def ler_taxa():
    dados = lf.pedir(lf.TAXA_CSV)
    todos, por_nome = {}, defaultdict(list)
    with gzip.open(io.BytesIO(dados), "rt", encoding="utf-8") as f:
        for r in csv.DictReader(f, delimiter="\t"):
            t = {"id": int(r["taxon_id"]), "anc": r["ancestry"].split("/") if r["ancestry"] else [], "nivel": float(r["rank_level"] or 100),
                 "rank": r["rank"], "nome": r["name"], "ativo": r["active"] == "true"}
            todos[t["id"]] = t
            if t["ativo"]:
                por_nome[t["nome"]].append(t)
    return todos, por_nome


def grupo_do_taxon(t):
    anc = set(t["anc"]) | {str(t["id"])}
    for g, i in GRUPOS.items():
        if i in anc:
            return g
    return "Animalia" if "1" in anc else None


def candidatos(nome, por_nome):
    """Táxons activos com este nome (ou com as duas primeiras palavras, para variedades e cultivares)."""
    nome = (nome or "").strip()
    c = por_nome.get(nome)
    if c:
        return c, nome
    dois = " ".join(re.sub(r"[‘’'].*$", "", nome).split()[:2])
    return por_nome.get(dois, []), dois


def resolver(grupo, nome, por_nome):
    """(táxon, estado). Estados: ok, ambiguo, grupo-incoerente, sem-taxon."""
    cands, usado = candidatos(nome, por_nome)
    if not cands:
        return None, "sem-taxon"
    aceita = ACEITA.get(grupo, None)
    certos = [t for t in cands if aceita is None or grupo_do_taxon(t) in aceita]
    if not certos:
        return None, "grupo-incoerente"
    certos.sort(key=lambda t: (t["nivel"], t["id"]))
    if len({t["id"] for t in certos}) > 1 and len({grupo_do_taxon(t) for t in certos}) > 1:
        return certos[0], "ambiguo"
    return certos[0], "ok"


def normaliza(nome):
    n = re.sub(r"[‘’'].*$", "", nome or "")
    n = n.replace("×", " ").replace(" x ", " ")
    return re.sub(r"\s+", " ", n).strip().lower()


def resolver_por_api(grupo, nome, cache):
    """Sinónimos: pergunta ao iNaturalist e só aceita correspondência EXACTA (nome aceite ou sinónimo), do grupo certo.
    Nunca recua para o género (a foto de um género mostra outra espécie)."""
    aceita = ACEITA.get(grupo, None)
    base = re.sub(r"[‘’'].*$", "", nome or "").strip()
    sem_infra = re.sub(r"\s+(subsp|var|f|ssp)\.?\s+\S+.*$", "", base).strip()
    consultas = [base] + ([sem_infra] if sem_infra != base else [])
    for q in consultas:
        chave = normaliza(q)
        if chave not in cache.setdefault("busca", {}):
            res = lf.api("taxa?per_page=8&q=" + urllib.parse.quote(q))["results"]
            cache["busca"][chave] = [{"id": r["id"], "nome": r["name"], "match": r.get("matched_term"), "rank": r["rank"],
                                      "ativo": r.get("is_active"), "anc": [str(x) for x in r.get("ancestor_ids", [])]} for r in res]
        for r in cache["busca"][chave]:
            if not r["ativo"]:
                continue
            if normaliza(r["nome"]) != chave and normaliza(r["match"]) != chave:
                continue
            t = {"id": r["id"], "anc": r["anc"]}
            if aceita is None or grupo_do_taxon(t) in aceita:
                return r["id"]
    # secções («Taraxacum sect. Taraxacum»): serve o género
    m = re.match(r"^(\w+) sect\.", nome or "")
    if m:
        return resolver_por_api(grupo, m.group(1), cache)
    return None


def foto_para_taxon(cache):
    """foto → conjunto de táxons em cujas fotos ela aparece (a mesma foto pode servir ao género e à espécie)."""
    mapa = defaultdict(set)
    for tid, e in cache["taxa"].items():
        for f in ([e["default"]] if e["default"] else []) + [p for p in e["fotos"] if p]:
            mapa[f["id"]].add(int(tid))
    for tid, lista in cache["obs"].items():
        for f in lista:
            mapa[f["id"]].add(int(tid))
    return mapa


def analisar(master, todos, por_nome, cache):
    mapa = foto_para_taxon(cache)
    relatorio = {}
    for chave, reg in master.items():
        m = lf.URL_FOTO.match(reg.get("imagem") or "")
        if not m:
            continue
        pid = int(m.group(1))
        certo, estado = resolver(reg.get("grupo"), reg.get("nome_cientifico"), por_nome)
        if estado == "sem-taxon":  # sinónimo antigo: pergunta ao iNaturalist (correspondência exacta)
            tid_api = resolver_por_api(reg.get("grupo"), reg.get("nome_cientifico"), cache)
            if tid_api:
                certo, estado = {"id": tid_api, "anc": [], "nivel": 10}, "ok-sinonimo"
        origem = mapa.get(pid, set())
        atual = sorted(origem)[0] if origem else None
        if estado in ("sem-taxon", "grupo-incoerente"):
            veredito = estado
        elif not origem:
            veredito = "foto-sem-origem"
        elif certo["id"] in origem:
            veredito = "ok"
        elif estado == "ok-sinonimo":
            veredito = "ERRADA-sinonimo"  # a foto não é do táxon que o nome resolve
        elif all(grupo_do_taxon(todos[t]) != grupo_do_taxon(certo) for t in origem):
            veredito = "ERRADA-outro-grupo"
        else:
            veredito = "outro-taxon-do-mesmo-grupo"
        relatorio[chave] = {"nome": reg.get("nome"), "cientifico": reg.get("nome_cientifico"), "grupo": reg.get("grupo"),
                            "estado": estado, "veredito": veredito, "taxon_certo": certo["id"] if certo else None,
                            "taxon_da_foto": atual}
    return relatorio


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cache", default=str(RAIZ / "scripts" / "catalogo" / ".cache-fotos.json"))
    ap.add_argument("--relatorio", default="")
    ap.add_argument("--corrigir", action="store_true")
    a = ap.parse_args()
    cache_path = Path(a.cache)
    cache = json.loads(cache_path.read_text(encoding="utf-8"))
    master = json.loads((RAIZ / "data" / "especies_master.json").read_text(encoding="utf-8"))
    print("A ler a lista de táxons…", flush=True)
    todos, por_nome = ler_taxa()
    rel = analisar(master, todos, por_nome, cache)
    cont = Counter(r["veredito"] for r in rel.values())
    print("Veredito:", dict(cont.most_common()))
    if a.relatorio:
        Path(a.relatorio).write_text(json.dumps(rel, ensure_ascii=False, indent=1), encoding="utf-8")
    if not a.corrigir:
        return
    # Corrigir: fotos que não são do táxon certo → foto do táxon certo (ou sem foto).
    alvos = {k: r for k, r in rel.items() if r["veredito"] != "ok"}
    for k, r in alvos.items():
        if r["veredito"] == "sem-taxon":
            r["taxon_certo"] = resolver_por_api(r["grupo"], r["cientifico"], cache)
    cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
    ids = {r["taxon_certo"] for r in alvos.values() if r["taxon_certo"]}
    em_falta = sorted(ids - {int(k) for k in cache["taxa"]})
    for i in range(0, len(em_falta), 30):
        for r in lf.api("taxa/" + ",".join(map(str, em_falta[i:i + 30])))["results"]:
            cache["taxa"][str(r["id"])] = {"nome": r["name"], "default": lf.tratar_foto(r.get("default_photo")),
                                           "fotos": [lf.tratar_foto(p["photo"]) for p in r.get("taxon_photos", [])]}
    cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
    for k, r in alvos.items():
        tid = r["taxon_certo"]
        if not tid:
            master[k]["imagem"] = ""
            master[k].pop("foto", None)
            continue
        entrada = cache["taxa"].get(str(tid), {"default": None, "fotos": []})
        fotos = ([entrada["default"]] if entrada["default"] else []) + [p for p in entrada["fotos"] if p]
        boas = [f for f in fotos if f["lic"] in lf.PERMISSIVAS] or lf.procurar_observacoes(tid, cache, cache_path)
        if not boas:
            master[k]["imagem"] = ""
            master[k].pop("foto", None)
            continue
        f = boas[0]
        lic = lf.LICENCAS[f["lic"]]
        master[k]["imagem"] = f["url"]
        master[k]["foto"] = {"autor": lf.autor_de(f["attr"], f["lic"]) or "iNaturalist", "licenca": lic[0], "licenca_url": lic[1],
                             "pagina": f"https://www.inaturalist.org/photos/{f['id']}"}
        if re.search(r"['‘’]|\bcv\.|\bsubsp\.|\bvar\.", master[k].get("nome_cientifico", "")):
            master[k]["foto"]["da_especie"] = True
    cache_path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
    (RAIZ / "data" / "especies_master.json").write_text(json.dumps(master, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(alvos)} fichas corrigidas ou sem foto; corre node scripts/gerar-especies.mjs.")


if __name__ == "__main__":
    main()

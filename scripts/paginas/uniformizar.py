#!/usr/bin/env python3
"""Aplica a estrutura «Em Portugal → Dos dados a… → No mundo → blocos de fecho → Atualidade» a uma página
e gera a barra fixa a partir dos blocos (eyebrow de cada bloco).

  python3 scripts/paginas/uniformizar.py recursos/agua.html "Na prática"
O segundo argumento é o eyebrow do primeiro bloco de fecho (prática / ação); o terceiro, opcional, dá nomes por índice a blocos sem título.
"""
import json, re, sys, unicodedata
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from estrutura import outline

ROOT = Path(__file__).resolve().parents[2]
EN = ROOT / "assets/lang/auto/en.json"
ESCOPO = "Continente, Açores e Madeira, sempre que a fonte os inclui."
ESCOPO_EN = "Mainland, Azores and Madeira, wherever the source includes them."


def slug(t):
    t = unicodedata.normalize("NFD", t).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def eyebrow(src):
    m = re.search(r'class="eyebrow"[^>]*>(.*?)</span>', src, re.S)
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else ""


def main(path, closing_from, nomes=None):
    p = ROOT / path
    src, items = outline(str(p))
    by_id = {x[4].get("id"): x for x in items if x[4].get("id")}
    div = by_id["leitura-local"]
    # o separador pode estar dentro de um contentor (foto ao lado): usa o contentor
    par = next((x for x in items if x[0] == div[0] - 1 and x[2] <= div[2] and x[3] >= div[3]), None)
    if par and "foto-ao-lado" in (par[4].get("class") or ""):
        div = par
    if "atualidade" in by_id:
        atual = by_id["atualidade"]
    else:  # página com marcação desequilibrada: localiza a secção pelo texto
        i = src.index('id="atualidade"')
        atual = (0, "section", src.rindex("<section", 0, i), len(src), {"id": "atualidade"})
    kids = sorted([x for x in items if x[0] == div[0] and div[3] <= x[2] and x[3] <= atual[2]], key=lambda x: x[2])
    gl = by_id["panorama-global"]
    fat = by_id.get("fatores")
    span = by_id["portugal"]
    blocos = [k for k in kids if k[1] in ("div", "aside", "section") and k[4].get("class") not in ("fatores-wrap",) and k[4].get("id") not in ("fatores", "panorama-global")]
    labels = [eyebrow(src[b[2]:b[3]]).replace("&amp;", "&") for b in blocos]
    for k, v in (nomes or {}).items():
        labels[int(k)] = v
    if closing_from not in labels:
        sys.exit(f"eyebrow de fecho «{closing_from}» não encontrado em {labels}")
    ci = labels.index(closing_from)
    pt, fecho = blocos[:ci], blocos[ci:]
    ids_existentes = set(re.findall(r'\bid="([^"]+)"', src))
    inserts = []  # (posição, texto)
    nav = []
    def ident(b, label):
        # id já existente no bloco (no próprio elemento ou num descendente)?
        interno = re.search(r'\bid="([^"]+)"', src[b[2]:b[3]])
        if b[4].get("id"):
            return b[4]["id"]
        if interno and interno.group(1) in ("casos", "aplicacao-pratica", "instalacoes", "catalogo", "consultas"):
            return interno.group(1)
        i = slug(label) or "bloco"
        if i in ids_existentes:
            i += "-bloco"
        ids_existentes.add(i)
        inserts.append((b[2] + 1 + len(b[1]), f' id="{i}"'))
        return i
    for k, b in enumerate(pt):
        nav.append((ident(b, labels[k]), labels[k]) if k else (None, None))
    fechos = [(ident(b, labels[ci + k]), labels[ci + k]) for k, b in enumerate(fecho)]
    # nova ordem
    txt = lambda x: src[x[2]:x[3]]
    sep = "\n"
    divisor = src[span[2]:div[3]] if span[3] <= div[2] else src[div[2]:div[3]]
    divisor = divisor.replace("Portugal continental, Açores e Madeira", "Em Portugal")
    divisor += f'\n<p class="reading-scope">{ESCOPO}</p>'
    partes = [divisor, sep.join(txt(b) for b in pt)]
    if fat: partes.append(txt(fat))
    partes.append(txt(gl))
    partes.append(sep.join(txt(b) for b in fecho))
    inicio = min(gl[2], fat[2] if fat else gl[2], span[2])
    fim = atual[2]
    if inserts:  # ids nos blocos: aplicar ao texto antes de montar
        pass
    # aplicar inserções ids sobre src (posições do original) construindo partes a partir do src já editado
    ed = src
    for pos, t in sorted(inserts, reverse=True):
        ed = ed[:pos] + t + ed[pos:]
    # recalcular: reconstruir a região original com as inserções aplicadas
    def aplica(x):
        a, b = x[2], x[3]
        s = src[a:b]
        for pos, t in sorted(inserts, reverse=True):
            if a <= pos < b: s = s[:pos - a] + t + s[pos - a:]
        return s
    divisor_s = divisor
    partes = [divisor_s, sep.join(aplica(b) for b in pt)]
    if fat: partes.append(aplica(fat))
    partes.append(aplica(gl))
    partes.append(sep.join(aplica(b) for b in fecho))
    novo = src[:inicio] + sep.join(partes) + sep + src[fim:]
    # barra fixa
    m = re.search(r'(<nav aria-label="Nesta página" class="reading-nav">)(.*?)(</nav>)', novo, re.S)
    antigos = re.findall(r'<a ([^>]*)href="([^"]+)"([^>]*)>(.*?)</a>', m.group(2), re.S)
    voltar = next((a for a in antigos if "hub-back" in a[0] + a[2] or not a[1].startswith("#")), None)
    externos = [a for a in antigos if not a[1].startswith("#") and a is not voltar]
    rot = {a[1]: re.sub(r"<[^>]+>", "", a[3]).strip() for a in antigos}
    def link(h, t): return f'<a href="{h}">{t}</a>'
    nova = []
    if voltar: nova.append(f'<a {voltar[0]}href="{voltar[1]}"{voltar[2]}>{voltar[3]}</a>')
    nova.append(link("#leitura-local", "Em Portugal ↓"))
    for k, b in enumerate(pt[1:], 1):
        nova.append(link("#" + nav[k][0], nav[k][1] + " ↓"))
    if fat: nova.append(link("#fatores", rot.get("#fatores", "Dos dados ↓")))
    nova.append(link("#panorama-global", "No mundo ↓"))
    # entradas antigas que apontam para blocos dentro do «No mundo» mantêm-se logo a seguir
    for a in antigos:
        alvo = by_id.get(a[1][1:]) if a[1].startswith("#") else None
        if alvo and gl[2] < alvo[2] < gl[3] and a[1] != "#panorama-global":
            nova.append(link(a[1], re.sub(r"<[^>]+>", "", a[3]).strip()))
    for i, l in fechos: nova.append(link("#" + i, l + " ↓"))
    nova.append(link("#atualidade", rot.get("#atualidade", "Atualidade ↓")))
    for a in externos: nova.append(f'<a {a[0]}href="{a[1]}"{a[2]}>{a[3]}</a>')
    novo = novo[:m.start(2)] + "".join(nova) + novo[m.end(2):]
    p.write_text(novo, encoding="utf-8")
    # dicionário EN
    en = json.loads(EN.read_text(encoding="utf-8"))
    falta = []
    for l in [x[1] for x in nav[1:]] + [x[1] for x in fechos]:
        k = l + " ↓"
        if k in en: continue
        if l in en: en[k] = en[l] + " ↓"
        else: falta.append(l)
    en.setdefault(ESCOPO, ESCOPO_EN)
    EN.write_text(json.dumps(en, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(path, "PT:", labels[:ci], "fecho:", labels[ci:], "sem EN:", falta)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2], json.loads(sys.argv[3]) if len(sys.argv) > 3 else None)

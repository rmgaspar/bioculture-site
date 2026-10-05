#!/usr/bin/env python3
"""Fase B: componentes de estrutura repetidos nos CSS de página passam para ficheiros partilhados.

Regra de segurança: um componente só é carregado nas páginas cujo CSS próprio já continha TODAS as suas
regras (idênticas). Assim nenhuma página ganha estilos novos — só deixa de os repetir. O ficheiro do
componente é carregado imediatamente antes do CSS da página, que continua a poder sobrepor-se.
Uso: python3 scripts/css/extract-components.py [--apply]"""
import glob, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from cssunits import units, key, render, dedupe_keep_last

ROOT = Path(__file__).resolve().parents[2]
COMPONENTS = {
    "footer-wordmark": [((), ".footer-wordmark"), ((), ".bio-wordmark"), ((), ".bio-wordmark strong"), ((), ".bio-wordmark small")],
    "sidebar-fixed": [((), "#sidebar"), ((), "#wrapper")],
    "sidebar-fixed-small": [(("@media (max-width: 1280px)",), "#sidebar"), (("@media (max-width: 1280px)",), "#wrapper")],
    "content-width": [((), ".inner"), (("@media (max-width: 760px)",), ".inner")],
    "base-reset": [((), "body, input, select, textarea"), ((), "section, #header, hr, .major"), ((), ".footer")],
}
DESCR = {
    "footer-wordmark": "Rodapé com a marca bioCulture em marca de água.",
    "sidebar-fixed": "Menu lateral fixo de 18em e conteúdo deslocado à direita (ecrãs largos).",
    "sidebar-fixed-small": "Menu lateral e conteúdo em ecrãs até 1280 px.",
    "content-width": "Largura máxima e margens do conteúdo.",
    "base-reset": "Letra base e remoção das linhas e margens do tema nas secções e no rodapé.",
}
pages = ["index.html", "contactos.html", "manifesto.html", "privacidade.html", "404.html"] + sum(
    (glob.glob(f"{d}/*.html") for d in ("calendario", "ecossistemas", "energia", "observatorio", "recursos", "services")), [])
page_css = {}
for p in pages:
    s = (ROOT / p).read_text()
    if len(s) < 2000:
        continue
    css = ["assets/css/pages/" + c for c in re.findall(r'/assets/css/pages/([^"?]+)', s)
           if "unified-" not in c and "global-reading-base" not in c]
    if css:
        page_css[p] = css[0]   # o primeiro CSS de página é o próprio da página
files = sorted(set(page_css.values()))
parsed = {f: dedupe_keep_last(units((ROOT / f).read_text())) for f in files}
by_sel = {f: {(u[0], u[1]): u for u in us} for f, us in parsed.items()}

plan = {}
for name, wanted in COMPONENTS.items():
    # versão canónica de cada regra = a mais frequente
    canon = []
    for w in wanted:
        variants = {}
        for f in files:
            u = by_sel[f].get(w)
            if u:
                variants.setdefault(key(u), []).append(u)
        if variants:
            k, us = max(variants.items(), key=lambda kv: len(kv[1]))
            canon.append(us[0])
    keys = {key(u) for u in canon}
    users = [f for f in files if keys <= {key(u) for u in parsed[f]}]
    plan[name] = (canon, users)
    print(f"{name}: {len(canon)} regras, {len(users)} ficheiros: {', '.join(Path(f).name for f in users)}")

# Ordem: ao sair da página, a regra passa a vir antes de todas as que lá ficam. Só é seguro se nenhuma regra
# que fica, com o mesmo seletor, vinha antes dela (essa passaria a ganhar). Repete até estabilizar.
order = {f: [key(u) for u in units((ROOT / f).read_text())] for f in files}
changed = True
while changed:
    changed = False
    for f in files:
        moving = {key(u) for n, (canon, users) in plan.items() if f in users for u in canon}
        seq = order[f]
        for n, (canon, users) in plan.items():
            if f not in users:
                continue
            for u in canon:
                k = key(u)
                if k not in seq:
                    continue
                first = seq.index(k)
                if any(other[1] == k[1] and other not in moving for other in seq[:first]):
                    users.remove(f); changed = True
                    print(f"  ordem: {Path(f).name} fica com '{n}' (há '{k[1]}' antes)")
                    break
for name, (canon, users) in plan.items():
    print(f"=> {name}: {len(users)} ficheiros")

if "--apply" in sys.argv:
    removed = {}
    for name, (canon, users) in plan.items():
        if not users:
            continue
        (ROOT / f"assets/css/components/{name}.css").parent.mkdir(parents=True, exist_ok=True)
        (ROOT / f"assets/css/components/{name}.css").write_text(f"/* {DESCR[name]} Partilhado pelas páginas que usavam exatamente estas regras. */\n" + render(canon))
        for f in users:
            removed.setdefault(f, set()).update(key(u) for u in canon)
    for f, keys in removed.items():
        original = (ROOT / f).read_text()
        header = re.match(r"\s*(/\*[\s\S]*?\*/)", original)
        kept = [u for u in units(original) if key(u) not in keys]
        (ROOT / f).write_text((header.group(1) + "\n" if header else "") + render(kept))
    for p, f in page_css.items():
        names = [n for n, (_, users) in plan.items() if f in users]
        if not names:
            continue
        s = (ROOT / p).read_text()
        tag = re.search(r'<link[^>]*href="/assets/css/' + re.escape(f[len("assets/css/"):]) + r'(\?[^"]*)?"[^>]*>', s).group(0)
        links = "".join(re.sub(r'href="[^"]+"', f'href="/assets/css/components/{n}.css?v=1"', tag) for n in names)
        (ROOT / p).write_text(s.replace(tag, links + tag, 1))

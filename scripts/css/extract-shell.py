#!/usr/bin/env python3
"""Fase B: regras de estrutura repetidas nos CSS de página passam para assets/css/biocultura-shell.css."""
import glob, re, sys, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from cssunits import units, key, render, dedupe_keep_last

ROOT = Path(__file__).resolve().parents[2]
MIN_FILES = int(sys.argv[1]) if len(sys.argv) > 1 else 7
SKIP = set(sys.argv[2].split(",")) if len(sys.argv) > 2 and sys.argv[2] else set()
pages = ["index.html", "contactos.html", "manifesto.html", "privacidade.html", "404.html"] + sum(
    (glob.glob(f"{d}/*.html") for d in ("calendario", "ecossistemas", "energia", "observatorio", "recursos", "services")), [])
page_css = {}
for p in pages:
    s = (ROOT / p).read_text()
    if len(s) < 2000:
        continue
    page_css[p] = ["assets/css/pages/" + c for c in re.findall(r'/assets/css/pages/([^"?]+)', s)
                   if "unified-" not in c and "global-reading-base" not in c]
files = sorted({c for cs in page_css.values() for c in cs})
parsed = {f: dedupe_keep_last(units((ROOT / f).read_text())) for f in files}
where = {}
for f, us in parsed.items():
    for u in us:
        where.setdefault(key(u), set()).add(f)
SHELL_SEL = re.compile(r"^(#wrapper|#sidebar|\.inner|\.footer|\.footer-wordmark|\.bio-wordmark( strong| small)?|section, #header, hr, \.major|body, input, select, textarea)$")
shared = [k for k, fs in where.items() if len(fs) >= MIN_FILES and SHELL_SEL.match(k[1]) and f"{k[0]}|{k[1]}" not in SKIP]
# Variantes da mesma regra (mesmo seletor e mesmo media query): fica só a mais comum; as páginas com a
# outra variante mantêm-na no seu CSS, que carrega depois deste ficheiro e por isso prevalece.
norm = lambda ctx: tuple(c.replace("screen and ", "") for c in ctx)
best = {}
for k in shared:
    g = (norm(k[0]), k[1])
    if g not in best or len(where[k]) > len(where[best[g]]):
        best[g] = k
shared = list(best.values())
# ordem: a da primeira ocorrência num ficheiro que as tenha quase todas
ref = max(files, key=lambda f: sum(1 for u in parsed[f] if key(u) in shared))
ordered = [u for u in parsed[ref] if key(u) in shared]
missing = [k for k in shared if k not in {key(u) for u in ordered}]
for f in files:
    for u in parsed[f]:
        if key(u) in missing and key(u) not in {key(x) for x in ordered}:
            ordered.append(u)
print(json.dumps({"min_files": MIN_FILES, "shared_units": len(ordered), "ref": ref}))
for u in ordered:
    print("  ", " ".join(u[0]), u[1], len(where[key(u)]), "ficheiros")
if "--apply" in sys.argv:
    (ROOT / "assets/css/biocultura-shell.css").write_text(
        "/* Estrutura comum das páginas (largura do conteúdo, menu lateral fixo, rodapé com marca, letra base).\n"
        "   Carregado imediatamente antes do CSS próprio de cada página, que pode sobrepor-se. */\n" + render(ordered))
    keys = {key(u) for u in ordered}
    for f in files:
        original = (ROOT / f).read_text()
        kept = [u for u in units(original) if key(u) not in keys]
        if len(kept) != len(units(original)):
            header = re.match(r"\s*(/\*[\s\S]*?\*/)", original)
            (ROOT / f).write_text((header.group(1) + "\n" if header else "") + render(kept))

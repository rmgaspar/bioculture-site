#!/usr/bin/env python3
"""Separa as regras comuns aos 8 painéis globais (unified-*.css) num ficheiro base partilhado."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from cssunits import units, key, render, dedupe_keep_last

ROOT = Path(__file__).resolve().parents[2]
TOPICS = ("water", "air", "soil", "biodiversity", "renewables-territory", "ai-data-centres", "mining", "livestock")
files = {t: ROOT / f"assets/css/pages/unified-{t}.css" for t in TOPICS}
parsed = {t: dedupe_keep_last(units(p.read_text())) for t, p in files.items()}
common = set.intersection(*({key(u) for u in us} for us in parsed.values()))
base = [u for u in parsed["water"] if key(u) in common]
(ROOT / "assets/css/pages/global-reading-base.css").write_text(
    "/* Painel «No mundo» das páginas temáticas (água, ar, solo, biodiversidade, renováveis, digital,\n"
    "   mineração, pecuária): regras comuns a todos. O que é próprio de cada tema fica em unified-<tema>.css,\n"
    "   carregado logo a seguir. */\n" + render(base))
for t, us in parsed.items():
    own = [u for u in us if key(u) not in common]
    files[t].write_text(f"/* Painel «No mundo» — regras próprias deste tema; as comuns estão em global-reading-base.css. */\n" + render(own))
    print(f"{t:22} {len(us):4} regras -> {len(own):3} próprias")
print("base comum:", len(base), "regras")

#!/usr/bin/env python3
"""Reordena as secções das páginas-relatório (Aviação, Moda, Construção), geradas por JavaScript:
Sumário → Em Portugal → No mundo → ação (calculadora) → Limites e fontes, com separadores e numeração sequencial.

  python3 scripts/paginas/uniformizar_relatorio.py assets/js/pages/energia-aviacao.js
"""
import re, sys
from pathlib import Path

ESC_PT = "Continente, Açores e Madeira, sempre que a fonte os inclui."
ESC_EN = "Mainland, Azores and Madeira, wherever the source includes them."
DIV_PT = '<div class="reading-head"><h2 class="reading-divider" id="leitura-local">${tr("Em Portugal", "In Portugal")}</h2>\n<p class="reading-scope">${tr("%s", "%s")}</p></div>' % (ESC_PT, ESC_EN)
DIV_MUNDO = '<header class="reading-divider" id="panorama-global"><h2>${tr("No mundo", "Worldwide")}</h2></header>'

# grupos por página (ids das secções): portugal, mundo, ação; o resto (sumário no início e limites no fim) mantém-se
PLANO = {
    "aviacao": dict(portugal=["voos", "portugal"], mundo=["recursos", "rotas", "classes", "tempo"], acao=["calcular"]),
    "materiais": dict(portugal=["portugal"], mundo=["recursos", "materiais"], acao=["calcular"]),
}


def processa(texto, plano):
    out, pos = [], 0
    for m in re.finditer(r'<section id="sumario">', texto):
        ini = m.start()
        fim_m = re.compile(r'<section id="limites">.*?</section>', re.S).search(texto, ini)
        fim = fim_m.end()
        bloco = texto[ini:fim]
        partes = re.split(r'(?=<section id=")', bloco)
        partes = [p for p in partes if p.strip()]
        por_id = {re.match(r'<section id="([a-z]+)"', p).group(1): p.strip("\n") for p in partes}
        ordem = ["sumario"] + plano["portugal"] + plano["mundo"] + plano["acao"] + ["limites"]
        faltam = [i for i in por_id if i not in ordem]
        if faltam: sys.exit(f"secções fora do plano: {faltam}")
        n = 0
        novas = []
        for i in ordem:
            s = por_id[i]
            if i == "sumario":
                novas.append(s); continue
            n += 1
            # numeração sequencial no eyebrow (PT e EN)
            s = re.sub(r'(<span class="eyebrow">\$\{tr\(")\d+( · [^"]*", ")\d+( · )', lambda k: f'{k.group(1)}{n}{k.group(2)}{n}{k.group(3)}', s, count=1)
            novas.append(s)
            if i == plano["portugal"][0] and False: pass
        # separadores
        res = [novas[0], DIV_PT] + novas[1:1 + len(plano["portugal"])] + [DIV_MUNDO] + novas[1 + len(plano["portugal"]):]
        out.append(texto[pos:ini] + "\n".join(res)); pos = fim
    out.append(texto[pos:])
    return "".join(out)


if __name__ == "__main__":
    p = Path(sys.argv[1]); t = p.read_text(encoding="utf-8")
    plano = PLANO["aviacao"] if "aviacao" in p.name else PLANO["materiais"]
    p.write_text(processa(t, plano), encoding="utf-8")
    print("ok", p)

#!/usr/bin/env python3
"""Carrossel «O que está a correr bem em Portugal» (5 imagens 1080x1350), no estilo de dados de molduras2.py.

Todos os números vêm de data/observatorio-terra-relatorio.json (séries do Banco Mundial/OMS, as mesmas do Observatório da
Terra) e de data/bioweb.json (aves agrícolas, Eurostat). Cada cartão diz o ano do último valor.

Uso:
    python3 scripts/social/carrossel_correr_bem.py PASTA_DESTINO
"""
from __future__ import annotations

import datetime as dt
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gerar  # noqa: E402
import molduras2 as m2  # noqa: E402
from carrossel_participacoes import capa  # noqa: E402

LINK = "bioculture.pt/terra"
PIL = "PORTUGAL · INDICADORES"


def serie(ind, pais):
    x = ind["series"][pais]
    return {x["a"] + i: v for i, v in enumerate(x["v"]) if v is not None}


def pt(v, casas=1):
    return f"{v:.{casas}f}".replace(".", ",")


def main(destino):
    destino.mkdir(parents=True, exist_ok=True)
    ind = gerar.dados("observatorio-terra-relatorio.json")["indicadores"]
    el, mar, terra, pm, mort = (ind[k] for k in ("eletricidade_renovavel", "area_protegida_mar", "area_protegida_terra", "pm25", "mortalidade_ar"))
    elp, elw = serie(el, "PRT"), serie(el, "WLD")
    mp, mw = serie(mar, "PRT"), serie(mar, "WLD")
    tp, tw = serie(terra, "PRT"), serie(terra, "WLD")
    pp, pw = serie(pm, "PRT"), serie(pm, "WLD")
    mo_p, mo_w = serie(mort, "PRT")[2019], serie(mort, "WLD")[2019]
    ave = gerar.dados("bioweb.json")["aves"]
    aves_ag = ave["agricolas"]["v"][-1]
    ano_aves = ave["agricolas"]["a"] + len(ave["agricolas"]["v"]) - 1

    ye, ym, ya = max(elp), max(mp), max(pp)
    assert ye == max(elw) and ym == max(mw) and ya == max(pw), "anos diferentes entre Portugal e mundo: rever os cartões"
    y0m = min(mp)
    pct = lambda v: pt(v) + " %"

    capa(destino, "correr-bem-1.png", [(pt(elp[ye], 0) + " %", f"da eletricidade é renovável ({ye}); em 1990 era {pt(elp[1990], 0)} %", m2.SAND),
                                       (pt(mp[ym]) + " %", f"do mar está protegido ({ym}); em {y0m} era {pt(mp[y0m])} %", m2.SKY),
                                       (pt(pp[ya]), f"µg/m³ de partículas finas no ar ({ya}); em 1990 eram {pt(pp[1990])}", m2.MINT)],
         pilula=PIL, titulo="O que está a correr bem em Portugal", sub="Três indicadores que melhoraram, cada um com o ano e a fonte.", tam=100, link=LINK,
         fonte="Fonte: Banco Mundial, OMS e IHME (Observatório da Terra do bioCulture)")

    m2.dados_barras(destino, "correr-bem-2.png", PIL, f"{pt(elp[ye], 0)} % da eletricidade é renovável",
                    [(f"Portugal, 1990", elp[1990], m2.SKY), (f"Portugal, {ye}", elp[ye], m2.SAND), (f"Mundo, {ye}", elw[ye], (120, 140, 156))],
                    f"Fonte: Banco Mundial (EG.ELC.RNEW.ZS) · último ano disponível: {ye}", LINK, fmt=pct,
                    sub="Parte da eletricidade produzida que vem de fontes renováveis.",
                    nota=f"Quase duplicou desde 1990 e é mais do dobro da média mundial. O valor varia de ano para ano.", tam=78)

    sobe = max((b, a) for a, b in zip(sorted(mp)[:-1], sorted(mp)[1:]) if True)  # ano de maior subida abaixo
    anos = sorted(mp)
    salto = max(range(1, len(anos)), key=lambda i: mp[anos[i]] - mp[anos[i - 1]])
    m2.dados_barras(destino, "correr-bem-3.png", PIL, "Mais do dobro do mar protegido",
                    [(f"Portugal, {y0m}", mp[y0m], m2.SKY), (f"Portugal, {ym}", mp[ym], m2.SAND), (f"Mundo, {ym}", mw[ym], (120, 140, 156))],
                    f"Fonte: Banco Mundial (ER.MRN.PTMR.ZS, ER.LND.PTLD.ZS) · {ym}", LINK, fmt=pct,
                    sub="Parte das águas territoriais que é área marinha protegida.",
                    nota=f"A maior subida foi de {anos[salto - 1]} para {anos[salto]} ({pt(mp[anos[salto - 1]])} % para {pt(mp[anos[salto]])} %). Ainda um pouco abaixo da média mundial. Em terra, {pt(tp[max(tp)])} % está protegido, contra {pt(tw[max(tw)])} % no mundo.", tam=80)

    queda = round((pp[1990] - pp[ya]) / pp[1990] * 100)
    m2.dados_barras(destino, "correr-bem-4.png", PIL, "Menos partículas finas no ar",
                    [("Portugal, 1990", pp[1990], m2.SKY), (f"Portugal, {ya}", pp[ya], m2.MINT), (f"Mundo, {ya}", pw[ya], (120, 140, 156))],
                    f"Fonte: Banco Mundial (EN.ATM.PM25.MC.M3) · OMS · {ya}", LINK, fmt=lambda v: pt(v) + " µg/m³",
                    sub="Concentração média anual de partículas PM2,5.",
                    nota=f"Menos {queda} % desde 1990, sobretudo até 2013. A média mundial é {pt(pw[ya] / pp[ya])} vezes mais alta. Em 2019, as mortes atribuídas à poluição do ar foram {pt(mo_p, 0)} por 100 000 habitantes em Portugal e {pt(mo_w, 0)} no mundo (OMS).", tam=80)

    m2.dados_lista(destino, "correr-bem-5.png", "O QUE NÃO DIZ", "Melhorar não é resolver",
                   [("Médias nacionais", "Cada número esconde diferenças entre regiões e entre anos."),
                    ("Nem tudo melhora", f"As aves de zonas agrícolas da UE27 estão a {pt(aves_ag, 0)} % do nível de 1990 ({ano_aves}, Eurostat)."),
                    ("Anos diferentes", f"Cada série vai até ao último ano que a fonte publica: {ye}, {ya} e {ym}.")],
                   "Fonte: Banco Mundial, OMS, IHME, Eurostat · Observatório da Terra", LINK, tam=84, corpo=44)


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd() / "social" / f"pack-{dt.date.today().isoformat()}")

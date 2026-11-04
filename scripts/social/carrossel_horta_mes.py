#!/usr/bin/env python3
"""Carrossel «A tua horta em <mês>» (5 imagens 1080x1350), no estilo de dados de molduras2.py.

As épocas vêm de horta_mes.mjs (mesmo código e mesmos dados do Planeador de horta: fichas de data/horticolas_master.json), e as
técnicas de data/dicas.json. Nada é inventado: a colheita «estimada» é a que o planeador calcula a partir do prazo da ficha.

Uso:
    python3 scripts/social/carrossel_horta_mes.py PASTA_DESTINO [MES 1-12]
"""
from __future__ import annotations

import datetime as dt
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gerar  # noqa: E402
import molduras2 as m2  # noqa: E402
from carrossel_participacoes import capa  # noqa: E402
from molduras import W, H, f, quebrar  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
LINK = "bioculture.pt/planeador"
FONTE = "Fonte: fichas de cultivo do bioCulture · épocas orientativas para Portugal continental"
MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]
SEMEAR, PLANTAR, COLHER = m2.MINT, m2.SKY, m2.SAND
NOTA = "As épocas são orientativas: antecipa ou atrasa conforme a região, a altitude, a geada, a exposição e a variedade."


def tabela(destino, nome, pilula, titulo, sub, blocos, nota=None, tam=84):
    """blocos: [(rótulo, cor, [(cultura, janela), ...])]; cada linha tem a cultura à esquerda e a janela numa pílula à direita."""
    im, d = m2.fundo(m2.NAVY)
    m2.cabecalho_dados(d, im, pilula)
    y = m2.titulo_dados(d, 180, titulo, tam)
    for l in quebrar(d, sub, f("avenir", "medium", 32), W - 2 * m2.M):
        d.text((m2.M, y), l, font=f("avenir", "medium", 32), fill=m2.MUDO)
        y += 42
    y += 24
    n = sum(len(r) for _, _, r in blocos)
    linha = min(78, max(54, (H - 150 - y - (160 if nota else 60) - 70 * len(blocos)) // max(n, 1)))
    alto = sum(64 + len(r) * linha for _, _, r in blocos) + 22 * (len(blocos) - 1) + 44
    d.rounded_rectangle((m2.M - 20, y, W - m2.M + 20, y + alto), radius=30, fill=m2.CARD)
    y += 18
    for k, (rot, cor, linhas) in enumerate(blocos):
        if k:
            y += 22
        d.ellipse((m2.M + 6, y + 16, m2.M + 26, y + 36), fill=cor)
        d.text((m2.M + 42, y + 8), rot.upper(), font=f("avenir", "heavy", 26), fill=cor)
        y += 64
        for cultura, janela in linhas:
            d.text((m2.M + 10, y + 12), cultura, font=f("avenir", "demi", 33), fill=m2.BRANCO)
            fj = f("avenir", "medium", 27)
            wj = int(d.textlength(janela, font=fj))
            x1 = W - m2.M - 10
            d.rounded_rectangle((x1 - wj - 36, y + 8, x1, y + linha - 8), radius=22, fill=(34, 64, 88))
            d.text((x1 - wj - 18, y + linha / 2), janela, font=fj, fill=(214, 226, 236), anchor="lm")
            y += linha
    y += 36
    if nota:
        for l in quebrar(d, nota, f("avenir", "medium", 28), W - 2 * m2.M):
            d.text((m2.M, y), l, font=f("avenir", "medium", 28), fill=(220, 230, 238))
            y += 38
    m2.rodape_dados(d, LINK, FONTE)
    im.save(destino / nome)


def prazo(ficha):
    m = re.search(r"(\d+\s*[–-]\s*\d+)\s*(dias|semanas)", ficha)
    return f"{m.group(1).replace(' ', '')} {m.group(2)}" if m else ""


def main(destino, mes):
    destino.mkdir(parents=True, exist_ok=True)
    dados = json.loads(subprocess.run(["node", str(ROOT / "scripts" / "social" / "horta_mes.mjs"), str(mes)], capture_output=True, text=True, check=True).stdout)
    nm = MESES[mes - 1]
    sem, pla, col, est = ([(c["nome"], c["janela"]) for c in dados[k]] for k in ("semear", "plantar", "colher", "colher_estimado"))
    tecn = {x["id"]: x for x in gerar.dados("dicas.json")}
    assert sem or pla or col or est, "mês sem dados"

    capa(destino, "horta-1.png",
         [(str(len(sem)), "culturas para semear", SEMEAR), (str(len(pla)), "culturas para plantar", PLANTAR), (str(len(col) + len(est)), f"para colher: {len(col)} pela ficha e {len(est)} por estimativa", COLHER)],
         pilula=f"HORTA · {nm.upper()}", titulo=f"A tua horta em {nm}", sub="O que semear, plantar e colher agora, segundo as fichas do bioCulture.", tam=104, link=LINK, fonte=FONTE)

    tabela(destino, "horta-2.png", f"HORTA · {nm.upper()}", "Semear agora", f"{len(sem)} culturas com sementeira em {nm}, e a janela completa de cada ficha.", [("Semear", SEMEAR, sem)],
           nota=NOTA)
    tabela(destino, "horta-3.png", f"HORTA · {nm.upper()}", "Plantar e colher", "Plantas para pôr no canteiro e colheitas que a ficha dá para este mês.", [("Plantar", PLANTAR, pla), ("Colher (pela ficha)", COLHER, col)])
    tabela(destino, "horta-4.png", f"HORTA · {nm.upper()}", "Já pode estar pronto", "Se semeaste há algumas semanas, a ficha dá estes prazos de colheita.", [("Colher (por estimativa)", COLHER, [(c["nome"], prazo(c["ficha"])) for c in dados["colher_estimado"]])],
           nota="É uma estimativa a partir da sementeira: confirma sempre na horta antes de colher.")

    q = lambda i: tecn[i]["quando"].lower()
    assert "outono" in q("folhas-molde") and "outono" in q("no-dig") and "chuvos" in q("adubo-verde") and "chuvos" in q("captacao-chuva")
    m2.dados_lista(destino, "horta-5.png", f"HORTA · {nm.upper()}", "E o solo, no outono",
                   [("Húmus de folhas", "Recolhe as folhas no outono e deixa-as maturar 1–2 anos."),
                    ("Canteiro sem cava", "No outono, ou 3–6 semanas antes de plantar."),
                    ("Adubo verde", "Entre culturas ou durante a estação chuvosa."),
                    ("Água da chuva", "Instala a captação antes da época chuvosa.")],
                   "Fonte: fichas de técnicas do bioCulture · " + "Planeador de horta", LINK, tam=84, corpo=42)


if __name__ == "__main__":
    mes = int(sys.argv[2]) if len(sys.argv) > 2 else dt.date.today().month
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd() / "social" / f"pack-{dt.date.today().isoformat()}", mes)

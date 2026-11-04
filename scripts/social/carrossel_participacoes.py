#!/usr/bin/env python3
"""Carrossel «8 151 participações é muito?» (4 imagens 1080x1350), no estilo de dados de molduras2.py.

Os números vêm de data/zaer_critico.json (factos_participacao, consultas e exemplos do relatório da APA); o que não está lá
(prazo da consulta e nº de utilizadores a seguir) lê-se da própria consulta, em consultas_participa.em_analise.

Uso:
    python3 scripts/social/carrossel_participacoes.py PASTA_DESTINO
"""
from __future__ import annotations

import datetime as dt
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gerar  # noqa: E402
import molduras2 as m2  # noqa: E402
from molduras import W, H, f, quebrar  # noqa: E402

LINK = "bioculture.pt/consultas"
FONTE = "Fonte: consultas de projetos de renováveis, 2026 · Participa.pt"


def dias(i, fim):
    a, b = dt.date.fromisoformat(i), dt.date.fromisoformat(fim)
    return (b - a).days + 1


def capa(destino, nome, factos):
    im, d = m2.fundo(m2.NAVY)
    m2.cabecalho_dados(d, im, "PARTICIPA.PT · 2026")
    y = m2.titulo_dados(d, 220, "8 151 participações é muito?", 112)
    for l in quebrar(d, "A consulta da central solar de Sophia, comparada com as outras de 2026.", f("avenir", "medium", 36), W - 2 * m2.M):
        d.text((m2.M, y + 10), l, font=f("avenir", "medium", 36), fill=m2.MUDO)
        y += 48
    y += 110
    gap = 24
    w = (W - 2 * m2.M - gap * (len(factos) - 1)) // len(factos)
    for i, (v, l, cor) in enumerate(factos):
        x = m2.M + i * (w + gap)
        d.rounded_rectangle((x, y, x + w, y + 300), radius=26, fill=m2.CARD, outline=m2.LINE, width=2)
        d.rounded_rectangle((x + 26, y + 26, x + 26 + 54, y + 34), radius=4, fill=cor)
        d.text((x + 26, y + 60), v, font=f("bodoni", "bold", 66), fill=m2.BRANCO)
        for k, ln in enumerate(quebrar(d, l, f("avenir", "medium", 25), w - 50)):
            d.text((x + 26, y + 150 + k * 32), ln, font=f("avenir", "medium", 25), fill=m2.MUDO)
    d.text((m2.M, H - 220), "Desliza", font=f("avenir", "heavy", 38), fill=m2.SKY)
    x0 = m2.M + int(d.textlength("Desliza", font=f("avenir", "heavy", 38))) + 22  # seta desenhada (a fonte não tem o glifo)
    d.line((x0, H - 199, x0 + 48, H - 199), fill=m2.SKY, width=6)
    d.polygon([(x0 + 52, H - 199), (x0 + 36, H - 213), (x0 + 36, H - 185)], fill=m2.SKY)
    m2.rodape_dados(d, LINK, FONTE)
    im.save(destino / nome)


def main(destino):
    destino.mkdir(parents=True, exist_ok=True)
    z = gerar.dados("zaer_critico.json")["consultas_participa"]
    fa = z["factos_participacao"]
    sophia = next(x for x in z["em_analise"] if "sophia" in x["id"])
    pszaer = next(x for x in z["em_analise"] if x["id"] == "participa-pszaer")
    exemplos = {e["id"]: e for e in z["leitura_participacoes"]["exemplos"]}
    n, med = sophia["participacoes"], fa["participacoes_mediana"]
    assert n == fa["participacoes_maxima"], "a Sophia deixou de ser o máximo: rever o texto"
    vezes = round(n / med)
    peso = round(n / fa["participacoes_total"] * 100)
    num = gerar.num

    capa(destino, "participacoes-1.png", [(num(n), "participações na central solar de Sophia", m2.CORAL), (str(med), "mediana das consultas de projetos de 2026", m2.MINT), (f"{vezes}×", "cerca de, face ao caso típico", m2.SAND)])

    m2.dados_barras(destino, "participacoes-2.png", "PARTICIPA.PT · 2026", f"Cerca de {vezes} vezes o caso típico",
                    [("Mediana dos projetos de 2026", med, m2.MINT), ("Média dos projetos", fa["participacoes_media"], m2.SAND), ("Central solar de Sophia", n, m2.CORAL)],
                    FONTE, LINK, sub=f"{fa['consultas_projetos']} consultas de projetos com avaliação ambiental, em 2026.",
                    nota=f"Sozinha pesa {peso}% de todas as participações ({num(n)} de {num(fa['participacoes_total'])}). Sem ela, a média desce de {fa['participacoes_media']} para {fa['participacoes_media_sem_maxima']}: para o caso típico, a mediana descreve melhor.", tam=80)

    prazo = dias(sophia["inicio"], sophia["fim"])
    mes = lambda s: dt.date.fromisoformat(s).strftime("%d/%m")
    s25 = exemplos["sophia-2025"]
    m2.dados_lista(destino, "participacoes-3.png", "PARTICIPA.PT · 2026", f"{num(n)} em {prazo} dias",
                   [(f"{prazo} dias", f"A consulta decorreu de {int(sophia['inicio'][8:])} a {int(sophia['fim'][8:])} de outubro de 2026 e está agora em análise."),
                    ("Não é a primeira", f"Na 1.ª consulta, em 2025, o relatório da APA contou {s25['numero']} participações: cidadãos, câmaras, juntas, associações e empresas."),
                    ("Só um programa teve mais", f"Em 2026, o PSZAER, que é um programa nacional e não um projeto, teve {num(pszaer['participacoes'])}.")],
                   FONTE.replace("consultas de projetos de renováveis, 2026 · ", "") + " · Relatório da APA (2025)", LINK, tam=84, corpo=44)

    m2.dados_lista(destino, "participacoes-4.png", "O QUE NÃO DIZ", "Participações não são votos",
                   [("Mobilização, não resultado", "Cada participação é um comentário submetido no portal. Mede o interesse, não decide o que se faz."),
                    ("A favor ou contra?", "Só o relatório final da APA, depois da consulta, diz que posições dominam."),
                    ("Quantas pessoas?", "O Participa não indica se as participações vêm de pessoas diferentes.")],
                   f"Fonte: Participa.pt · dados de {dt.date.fromisoformat(z['metadados']['instantaneo_em']).strftime('%d/%m/%Y')} · bioCulture", LINK, tam=84, corpo=44)


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd() / "social" / f"pack-{dt.date.today().isoformat()}")

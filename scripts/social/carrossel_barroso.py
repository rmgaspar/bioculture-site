#!/usr/bin/env python3
"""Carrossel «Mina do Barroso: o que está em disputa» (6 imagens 1080x1350), no estilo de dados de molduras2.py.

Estrutura: o que a empresa estima / o que está em causa no terreno / o que disse a ONU / os processos / o que ainda não se sabe.
Cada afirmação está atribuída e datada; não toma partido. Fontes (consultadas a 4/11/2026):
  - Estimativas da empresa: Jornal Económico, 13 e 17/ago/2026 (também em data/noticias.json).
  - Território, água, rejeitados e lacunas: dossier bioCulture em data/mineracao.json (litio-barroso, verificado a 22/10/2026) e
    relatório da consulta pública da APA (2021) em data/zaer_critico.json (leitura_participacoes, «barroso-2021»).
  - ONU: Comité de Conformidade da Convenção de Aarhus, 3/set/2025 (Reuters, via Kitco).
  - Processos: Público (5/fev/2026, 1/jun/2026), Observador (9/jun/2026), ECO/Lusa (29/jun/2026), RTP (ação sobre o contrato).

Uso:
    python3 scripts/social/carrossel_barroso.py PASTA_DESTINO
"""
from __future__ import annotations

import datetime as dt
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gerar  # noqa: E402
import molduras2 as m2  # noqa: E402
from carrossel_participacoes import capa  # noqa: E402

LINK = "bioculture.pt/barroso"
PIL = "LÍTIO · BOTICAS"


def main(destino):
    destino.mkdir(parents=True, exist_ok=True)
    b = next(x for x in gerar.dados("mineracao.json") if x["id"] == "litio-barroso")
    exemplo = next(e for e in gerar.dados("zaer_critico.json")["consultas_participa"]["leitura_participacoes"]["exemplos"] if e["id"] == "barroso-2021")
    assert "sem extração industrial" in b["detalhe"].lower() or "sem extra" in b["etapas"][-1]["nota"].lower(), "o estado do dossier mudou: rever o texto"
    assert exemplo["numero"] == "168", "o número de exposições mudou: rever o texto"

    capa(destino, "barroso-1.png",
         [("2023", "Declaração de impacte ambiental favorável condicionada (APA)", m2.MINT),
          ("2025", "Comité da ONU: Portugal violou a Convenção de Aarhus", m2.SKY),
          ("2026", "Servidão suspensa em tribunal; Governo reafirma o interesse público", m2.SAND)],
         pilula=PIL, titulo="Mina do Barroso: o que está em disputa", sub="Ainda não há extração. O que está confirmado, com fonte e data.", tam=96, link=LINK,
         fonte="Fonte: APA, ONU (Aarhus), Público, Observador, ECO/Lusa · dossier bioCulture")

    m2.dados_lista(destino, "barroso-2.png", "ESTIMATIVAS DA EMPRESA", "O que a empresa estima",
                   [("Produção em 2028", "Construção em 2027 e vida útil inicial de 14 anos."),
                    ("7 milhões de baterias", "Lítio para baterias de carros elétricos."),
                    ("500 empregos diretos", "Mais de mil indiretos e induzidos."),
                    ("720 milhões de euros", "Em impostos, taxas e royalties para Portugal. Mais pelo menos 500 mil € por ano para uma fundação local, a partir do 1.º ano de exploração.")],
                   "Fonte: Savannah, via Jornal Económico e Observador (2026). Estimativas, não resultados.", LINK, tam=84, corpo=38)

    m2.dados_lista(destino, "barroso-3.png", "O QUE ESTÁ EM CAUSA", "No terreno e na água",
                   [("Baldios e lameiros", "Conflito territorial elevado com lameiros, baldios e pastoreio. Covas do Barroso integra o sistema agrícola reconhecido pela FAO, o que por si só não é proibição legal."),
                    ("Água e rejeitados", "Captação, alteração de drenagens, qualidade das águas, estéreis e rejeitados do processamento."),
                    ("Poeiras, ruído e camiões", "Detonações, britagem e tráfego, conforme o vento, a distância e as medidas de controlo."),
                    ("2021: 168 exposições", f"Na consulta pública, a APA concluiu que a maioria mostra «discordância e forte oposição». O projeto foi depois reformulado.")],
                   "Fonte: dossier bioCulture (Mineração) e relatório da consulta pública da APA (2021).", LINK, tam=84, corpo=31)

    m2.dados_lista(destino, "barroso-4.png", "ONU · AARHUS", "O que disse a ONU",
                   [("3 de setembro de 2025", "O Comité de Conformidade da Convenção de Aarhus concluiu que Portugal violou a Convenção no licenciamento do projeto."),
                    ("Informação e participação", "A APA não respondeu aos pedidos de informação nos prazos legais e, ao recusar, não explicou como recorrer."),
                    ("A resposta", "A APA diz ter uma interpretação divergente da Convenção e que cumpriu sempre os procedimentos. A queixa é de 2021 (Fundação Montescola).")],
                   "Fonte: Reuters, via Kitco (3/set/2025).", LINK, tam=84, corpo=36)

    m2.dados_lista(destino, "barroso-5.png", "OS PROCESSOS", "Em tribunal e em Bruxelas",
                   [("Fev. 2026 · UE", "Uma associação local e a ClientEarth pediram ao Tribunal de Justiça da UE que anule o estatuto de «projeto estratégico». Não visa a licença em Portugal."),
                    ("Mai.–jun. 2026 · Mirandela", "O tribunal admitiu a providência dos baldios contra a 2.ª servidão e os trabalhos de geotecnia pararam a 9 de junho."),
                    ("Fim de jun. 2026 · Governo", "O Ministério do Ambiente reafirmou o interesse público (servidão temporária, 24 parcelas) e a empresa planeou retomar os trabalhos."),
                    ("Concessão", "Segundo a empresa, o tribunal rejeitou a ação da junta para anular o contrato. Pode haver recurso.")],
                   "Fonte: Público, Observador, ECO/Lusa e RTP (fev.–jun. 2026).", LINK, tam=80, corpo=29)

    lac = b["lacunas"].rstrip(".")
    m2.dados_lista(destino, "barroso-6.png", "O QUE NÃO DIZ", "O que ainda não se sabe",
                   [("Sem extração autorizada", "O projeto de execução ainda depende da conformidade ambiental, da licença ambiental e de outras autorizações."),
                    ("O que falta divulgar", "Desenho definitivo, consumos efetivos de água, garantias financeiras e resultados de monitorização."),
                    ("Previsto não é medido", "Os impactos previstos não são impactos medidos, e os benefícios anunciados não são resultados."),
                    ("Os processos", "Não confirmámos decisão de mérito sobre a servidão nem sobre a validade da declaração de impacte ambiental.")],
                   f"Fonte: dossier bioCulture (verificado a {dt.date.fromisoformat(b['ultima_verificacao']).strftime('%d/%m/%Y')}) · notícias citadas", LINK, tam=84, corpo=33)


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd() / "social" / f"pack-{dt.date.today().isoformat()}")

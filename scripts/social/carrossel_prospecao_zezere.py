#!/usr/bin/env python3
"""Carrossel «Prospeção de ouro no Zêzere» (5 imagens 1080x1350), para Facebook e Instagram.

Estrutura: capa com a área e o prazo / o que é pedido / o que dizem as entidades / o que não se sabe / como participar.
Todos os números vêm dos documentos da consulta MNPPP518 «Vila de Rei», publicados no Participa.pt e lidos a 24/11/2026:
  - Área, blocos, minerais, prazos e investimento: memória técnica da Cazador Resources, outubro de 2026.
  - Exclusão de Pedrógão Grande e da Sertã: requerimento de reformulação da área.
  - Exclusões pedidas e espécies: parecer do ICNF; faixa de 1 km: parecer da Câmara de Ferreira do Zêzere (8/8/2025).
  - Prazo e retificação da data: ficha da consulta (DGEG), também em data/zaer_critico.json.

Uso:
    python3 scripts/social/carrossel_prospecao_zezere.py PASTA_DESTINO
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gerar  # noqa: E402
import molduras2 as m2  # noqa: E402

LINK = "bioculture.pt"
PIL = "OURO · FERREIRA DO ZÊZERE E VILA DE REI"
ID = "participa-pedido-de-prospecao-e-pesquisa-vila-de-rei"


def main(destino):
    destino.mkdir(parents=True, exist_ok=True)
    # Os números da capa saem dos dados do site: se a consulta mudar de estado ou de prazo, o carrossel não sai calado.
    z = gerar.dados("zaer_critico.json")["consultas_participa"]
    consulta = next(r for k in ("abertas", "em_analise", "encerradas") for r in z[k] if r["id"] == ID)
    assert consulta["estado_consulta"] == "Aberta", "a consulta já não está aberta: rever o texto antes de publicar"
    assert consulta["fim"] == "2027-01-04", f"o prazo mudou para {consulta['fim']}: rever o texto"

    m2.em_foco(destino, "01-prospecao-zezere.png", PIL,
               "Querem procurar ouro em 297 km² do Zêzere.",
               "Consulta pública aberta até 4 de janeiro. O que o pedido diz, com a fonte de cada número.",
               [("297 km²", "a área pedida, em dois blocos"),
                ("5 concelhos", "eram doze no pedido inicial"),
                ("4 jan.", "fecho da consulta, às 23h59")],
               "prospecao-vila-de-rei/hero.webp",
               "Foto: Vitor Oliveira · CC BY-SA 2.0 · Wikimedia Commons", LINK, enq=(0.5, 0.55), tam=86)

    m2.dados_lista(destino, "02-prospecao-zezere.png", "O QUE É PEDIDO", "Uma licença para procurar, não para explorar",
                   [("Sete metais", "Ouro, cobre, chumbo, zinco, prata, estanho e tungsténio."),
                    ("Três anos, mais dois", "Prorrogáveis, com 500 mil euros de investimento mínimo previsto."),
                    ("Trincheiras e sondagens", "Cartografia, amostragem, geofísica e sondagens. A área nunca foi sondada."),
                    ("Quem pede", "Cazador Resources Ltd., de Peachland, Colúmbia Britânica, Canadá.")],
                   "Fonte: memória técnica do pedido (Cazador Resources, outubro de 2026), no Participa.pt", LINK, tam=76, corpo=34)

    m2.dados_lista(destino, "03-prospecao-zezere.png", "O QUE DIZEM AS ENTIDADES", "O que já está escrito no processo",
                   [("Dois concelhos saíram", "Pedrógão Grande e a Sertã deram parecer negativo; a área foi reformulada."),
                    ("1 km à volta das casas", "A Câmara de Ferreira do Zêzere pede essa faixa em redor dos aglomerados."),
                    ("O ICNF quer exclusões", "Perímetro Florestal do Castro, dois geossítios nacionais, três árvores."),
                    ("Água e solo", "Captações, Reserva Agrícola e Ecológica Nacional, perímetros a respeitar.")],
                   "Fonte: pareceres das entidades consultadas, na ficha da consulta (DGEG)", LINK, tam=76, corpo=34)

    m2.dados_lista(destino, "04-prospecao-zezere.png", "O QUE NÃO SE SABE", "Três coisas que os documentos não dizem",
                   [("Onde", "O pedido delimita a área, não os locais dos trabalhos nem o número de sondagens."),
                    ("Com que condições", "Se a faixa de 1 km e as exclusões do ICNF entram no título, decide a DGEG."),
                    ("E depois", "O pedido não diz o que acontece se confirmarem depósitos com valor económico.")],
                   "Fonte: memória técnica e pareceres da consulta MNPPP518 «Vila de Rei»", LINK, tam=76, corpo=34)

    m2.dados_lista(destino, "05-prospecao-zezere.png", "COMO PARTICIPAR", "Até às 23h59 de 4 de janeiro",
                   [("Onde", "Na ficha da consulta no Participa.pt, com conta criada no portal."),
                    ("O que pesa", "Factos verificáveis: uma captação, uma casa perto, um habitat, um caminho."),
                    ("Para ler primeiro", "O pedido, os pareceres e o que falta saber, em bioculture.pt.")],
                   "Fonte: ficha da consulta no Participa.pt (DGEG) · leitura bioCulture", LINK, tam=76, corpo=34)

    print(f"5 imagens em {destino}")


if __name__ == "__main__":
    main(Path(sys.argv[1]) if len(sys.argv) > 1 else Path("social") / "prospecao-zezere")

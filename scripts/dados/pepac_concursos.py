#!/usr/bin/env python3
"""Lista os concursos (avisos) do PEPAC no Continente, a partir do site oficial da Autoridade de Gestão.

Fonte: https://pepacc.pt/concursos/ (API pública do próprio site, tipo «competition»). Cada concurso traz, na
primeira linha do texto, o período oficial: «Candidaturas abertas de 16 de setembro a 9 de outubro de 2026» ou
«De 7 de outubro de 2026 a 9 de dezembro de 2026». Guardamos essa linha tal como está e, quando o período é
legível, as datas de início e de fim em ISO; o site mostra «aberto», «a abrir» ou «encerrado» comparando essas
datas com o dia da visita, e dá sempre a linha oficial e a ligação ao aviso.

Segurança: se o formato mudar e as datas não forem legíveis, o concurso fica sem datas (o site mostra só a linha
oficial); se a API devolver muito menos concursos do que já temos, não se escreve nada.

Uso: python3 scripts/dados/pepac_concursos.py [--dry-run]
"""
import argparse
import html
import re
import sys
from datetime import date

import comum
from comum import ErroDados, escrever_se_mudou, hoje, obter_json

BASE = "https://pepacc.pt/wp-json/wp/v2"
MESES = {m: i for i, m in enumerate(
    ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"], 1)}
PERIODO = re.compile(r"(\d{1,2}) de ([a-zç]+)(?: (?:de )?(\d{4}))? a (\d{1,2}) de ([a-zç]+)(?: (?:de )?(\d{4}))?", re.I)


def primeira_linha(conteudo):
    texto = html.unescape(re.sub(r"<[^>]+>", "\n", conteudo))
    for linha in texto.split("\n"):
        linha = re.sub(r"\s+", " ", linha).strip()
        if linha:
            return linha
    return ""


def periodo(linha, modificado):
    """(início, fim) em ISO ou (None, None) se a linha não for legível; os anos em falta deduzem-se pela ordem dos meses."""
    m = PERIODO.search(linha)
    if not m:
        return None, None
    d1, m1, y1, d2, m2, y2 = m.groups()
    m1, m2 = MESES.get(m1.lower()), MESES.get(m2.lower())
    if not m1 or not m2:
        return None, None
    d1, d2 = int(d1), int(d2)
    y1, y2 = int(y1) if y1 else None, int(y2) if y2 else None
    if y1 is None and y2 is None:
        y2 = int(modificado[:4])
    if y1 is None:
        y1 = y2 if m1 <= m2 else y2 - 1
    if y2 is None:
        y2 = y1 if m2 >= m1 else y1 + 1
    try:
        inicio, fim = date(y1, m1, d1), date(y2, m2, d2)
    except ValueError:
        return None, None
    return (inicio.isoformat(), fim.isoformat()) if fim >= inicio else (None, None)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    comum.SECO = ap.parse_args().dry_run

    temas = {t["id"]: html.unescape(t["name"]).replace("\u200e", "").strip() for t in obter_json(f"{BASE}/competition_topic?per_page=100&_fields=id,name")}
    concursos, pagina = [], 1
    while True:
        lote = obter_json(f"{BASE}/competition?per_page=100&page={pagina}&orderby=date&order=desc&_fields=id,modified,link,title,content,competition_topic")
        if not lote:
            break
        concursos += lote
        if len(lote) < 100:
            break
        pagina += 1
    if len(concursos) < 20:
        raise ErroDados(f"Só {len(concursos)} concursos: formato ou API mudou, não se escreve nada.")

    saida = []
    for c in concursos:
        linha = primeira_linha(c["content"]["rendered"])
        inicio, fim = periodo(linha, c["modified"])
        saida.append({
            "titulo": html.unescape(c["title"]["rendered"]).strip(),
            "link": c["link"],
            "linha": linha[:160],
            "inicio": inicio,
            "fim": fim,
            "tema": [temas[t] for t in c.get("competition_topic", []) if t in temas],
            "atualizado": c["modified"][:10],
        })
    saida.sort(key=lambda x: (x["inicio"] or "", x["atualizado"]), reverse=True)

    antigo = None
    try:
        antigo = comum.ler("apoios-concursos.json")
    except FileNotFoundError:
        pass
    if antigo and len(saida) < 0.7 * len(antigo["concursos"]):
        raise ErroDados(f"A fonte devolveu {len(saida)} concursos e já tínhamos {len(antigo['concursos'])}: não se escreve nada.")

    novo = {
        "fonte": "PEPAC no Continente · Concursos (Autoridade de Gestão)",
        "url": "https://pepacc.pt/concursos/",
        "gerado": hoje(),
        "concursos": saida,
    }
    mudou = escrever_se_mudou("apoios-concursos.json", novo, compacto=False, campos_data=("gerado",))
    sem_datas = sum(1 for s in saida if not s["inicio"])
    print(f"apoios-concursos.json: {len(saida)} concursos ({sem_datas} sem datas legíveis){' — atualizado' if mudou else ' — sem mudanças'}")


if __name__ == "__main__":
    try:
        main()
    except ErroDados as erro:
        print(f"ERRO: {erro}", file=sys.stderr)
        sys.exit(1)

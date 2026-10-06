#!/usr/bin/env python3
"""Atualiza indicadores de Portugal a partir das fichas temáticas do Relatório do Estado do Ambiente (APA).

Fichas lidas (frases-modelo da própria APA, com números):
- «Emissões de gases com efeito de estufa»: emissões do ano, sem uso do solo e florestas (Mt CO₂e);
- «Linha de costa em situação de erosão»: percentagem e extensão do litoral baixo e arenoso em erosão e
  perda de território costeiro;
- «Suscetibilidade à desertificação»: classes do Índice de Suscetibilidade à Desertificação (ISD), a
  metodologia adotada pelo REA 2025 (substitui o índice de aridez; as duas não são comparáveis).

O que NÃO se automatiza: a qualidade do ar, cujos textos interpretativos pedem revisão humana.
Para esta, ver vigia_fontes.py.

Segurança: só se escreve se as frases forem encontradas e os valores plausíveis. Se o texto mudar de
formato ou o período da erosão deixar de ser 1958–2023 (nomes de campos e textos fixos), avisa e não escreve.

Uso: python3 scripts/dados/apa_rea.py [--dry-run]
"""
import argparse
import html
import re
import sys
import urllib.error
import urllib.request
from urllib.parse import quote

import comum
from comum import USER_AGENT, ErroDados, escrever_se_mudou, hoje, ler

BASE = "https://rea.apambiente.pt/content/"
FICHA_GEE = BASE + quote("emissões-de-gases-com-efeito-de-estufa")
FICHA_EROSAO = BASE + quote("linha-de-costa-em-situação-de-erosão")
FICHA_DESERT = BASE + quote("suscetibilidade-à-desertificação")
NOME_FONTE_GEE = "APA — Relatório do Estado do Ambiente: emissões de gases com efeito de estufa"
NOME_FONTE_EROSAO = "APA — Relatório do Estado do Ambiente: linha de costa em situação de erosão"
NOME_FONTE_DESERT = "APA — Relatório do Estado do Ambiente: suscetibilidade à desertificação"
PERIODO_EROSAO = (1958, 2023)  # os nomes dos campos e os textos da página usam estes anos


def ler_ficha(url):
    pedido = urllib.request.Request(url + "?language=pt-pt", headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(pedido, timeout=60) as resposta:
            bruto = resposta.read().decode("utf-8", errors="ignore")
    except (urllib.error.URLError, OSError) as erro:
        raise ErroDados(f"Não foi possível ler {url}: {erro}")
    bruto = re.sub(r"<script.*?</script>|<style.*?</style>", "", bruto, flags=re.S)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", bruto))).replace("\xa0", " ")


def decimal(texto):
    return float(texto.replace(" ", "").replace(",", "."))


def extrair_gee(t):
    m = re.search(
        r"Em (\d{4}), as emiss[õo]es de GEE, sem contabiliza[cç][aã]o das emiss[õo]es do [“\"]Uso do solo, altera[cç][õo]es de uso do solo e florestas[”\"] \(LULUCF\), foram estimadas em ([\d.,]+) Mt CO\s*2\s*eq",
        t,
    )
    if not m:
        raise ErroDados("GEE: frase das emissões não encontrada (a ficha mudou de formato?)")
    ano, valor = int(m.group(1)), decimal(m.group(2))
    if not (2020 <= ano <= 2100 and 20 <= valor <= 120):
        raise ErroDados(f"GEE: valores implausíveis ({ano}: {valor} Mt)")
    return ano, valor


def extrair_erosao(t):
    a = re.search(
        r"(\d+) ?% do litoral baixo e arenoso de Portugal continental \(com cerca de ([\d ]+) km de comprimento de um total de ([\d ]+) km\) apresenta tend[êe]ncia erosiva de longo prazo \((\d{4})-(\d{4})\)",
        t,
    )
    b = re.search(r"Entre (\d{4}) e (\d{4}) estima-se uma perda de territ[óo]rio costeiro de Portugal continental de aproximadamente [\d.,]+ km 2 \(([\d ]+) ha\)", t)
    if not a or not b:
        raise ErroDados(f"Erosão costeira: frases não encontradas (percentagem/extensão: {bool(a)}, perda de área: {bool(b)})")
    percentagem, em_erosao, total = int(a.group(1)), int(a.group(2).replace(" ", "")), int(a.group(3).replace(" ", ""))
    periodo = (int(a.group(4)), int(a.group(5)))
    perda = int(b.group(3).replace(" ", ""))
    if periodo != PERIODO_EROSAO or (int(b.group(1)), int(b.group(2))) != PERIODO_EROSAO:
        raise ErroDados(
            f"Erosão costeira: o período mudou para {periodo[0]}–{periodo[1]}; é preciso renomear os campos «perda_area_1958_2023_ha» e rever os textos. Nada foi escrito."
        )
    if not (0 < percentagem <= 100 and 0 < em_erosao <= total <= 3000 and 0 < perda < 100000):
        raise ErroDados(f"Erosão costeira: valores implausíveis ({percentagem}%, {em_erosao}/{total} km, {perda} ha)")
    return percentagem, em_erosao, total, perda


def extrair_desertificacao(t):
    """Classes do ISD (percentagem do território continental) e ano; variação da área semiárida, se existir."""
    m = re.search(
        r"indica que ([\d.,]+)% do territ[óo]rio continental apresenta muito elevada suscetibilidade, ([\d.,]+)% alta suscetibilidade, ([\d.,]+)% suscetibilidade moderada e ([\d.,]+)% suscetibilidade ligeira",
        t,
    )
    a = re.search(r"Suscetibilidade à Desertifica[cç][aã]o \(ISD\) no territ[óo]rio de Portugal continental para o ano de (\d{4})", t)
    if not m or not a:
        raise ErroDados(f"Desertificação: frases do ISD não encontradas (classes: {bool(m)}, ano: {bool(a)})")
    classes = {"muito_elevada": decimal(m.group(1)), "alta": decimal(m.group(2)), "moderada": decimal(m.group(3)), "ligeira": decimal(m.group(4))}
    ano = int(a.group(1))
    if sum(classes.values()) > 100.5 or not 2020 <= ano <= 2100:
        raise ErroDados(f"Desertificação: valores implausíveis ({classes}, {ano})")
    semiarida = re.search(r"superf[ií]cie ocupada por [áa]reas semi[áa]ridas aumentado (\d+)% entre os per[ií]odos de observa[cç][aã]o (\d{4}-\d{4}) e (\d{4}-\d{4}), segundo o ([^()]+?) \(([^)]*\d{4})\)", t)
    extra = None
    if semiarida:
        extra = {"variacao_percent": int(semiarida.group(1)), "de": semiarida.group(2).replace("-", "–"),
                 "ate": semiarida.group(3).replace("-", "–"), "fonte": f"{semiarida.group(4).strip()}, {semiarida.group(5).split()[-1]}"}
    return ano, classes, extra


def pt(valor, casas=1):
    return f"{valor:.{casas}f}".replace(".", ",")


def textos_desertificacao(ano, classes, extra):
    alta_ou_mais = round(classes["alta"] + classes["muito_elevada"], 1)
    frase_semiarida = ""
    if extra:
        frase_semiarida = (f" A superfície ocupada por áreas semiáridas aumentou {extra['variacao_percent']}% entre "
                           f"{extra['de']} e {extra['ate']} ({extra['fonte']}).")
    descricao = (
        f"Percentagem do território continental com suscetibilidade alta ({pt(classes['alta'], 2)}%) ou muito elevada "
        f"({pt(classes['muito_elevada'], 2)}%) à desertificação, segundo o Índice de Suscetibilidade à Desertificação (ISD) de {ano}; "
        f"a suscetibilidade moderada abrange {pt(classes['moderada'], 2)}% e a ligeira {pt(classes['ligeira'], 2)}%."
        f"{frase_semiarida} O REA 2025 passou a usar este índice, em vez do índice de aridez; os valores não são comparáveis com os de edições anteriores."
    )
    leitura = (
        f"Índice de Suscetibilidade à Desertificação (ISD) {ano}: {pt(classes['muito_elevada'], 2)}% do território continental com "
        f"suscetibilidade muito elevada e {pt(classes['alta'], 2)}% alta. Suscetibilidade não significa área já desertificada: combina "
        f"solo, clima, vegetação e gestão das terras. Metodologia nova no REA 2025, não comparável com a das edições anteriores."
    )
    return alta_ou_mais, descricao, leitura


def atualizar_desertificacao(dados_terra):
    ano, classes, extra = extrair_desertificacao(ler_ficha(FICHA_DESERT))
    valor, descricao, leitura = textos_desertificacao(ano, classes, extra)
    periodo = f"Índice de Suscetibilidade à Desertificação (ISD), {ano}"
    unidade = "% do território continental com suscetibilidade alta ou muito elevada"
    ind = dados_terra["indicadores_territoriais"]["suscetibilidade_desertificacao"]
    ind.clear()
    ind.update({
        "valor": valor, "unidade": unidade, "periodo": periodo, "ambito": "Portugal continental",
        "classes_percent": classes, "descricao": descricao,
        "fontes": [{"nome": NOME_FONTE_DESERT, "url": FICHA_DESERT}],
    })
    if extra:
        ind["area_semiarida"] = extra

    for relatorio in dados_terra.get("relatorios", []):
        if relatorio.get("id") == "solo":  # só a primeira frase fala da desertificação
            resto = relatorio["resumo"].split(". ", 1)[1] if ". " in relatorio["resumo"] else ""
            relatorio["resumo"] = f"A suscetibilidade alta ou muito elevada à desertificação abrange {pt(valor)}% do Continente (ISD {ano}). {resto}".strip()

    solo = ler("solo_stats.json")
    destaque = next(x for x in solo["destaques"] if x["id"] == "desertificacao")
    destaque.clear()
    destaque.update({
        "id": "desertificacao", "titulo": "Suscetibilidade à desertificação", "valor": valor, "unidade": unidade,
        "periodo": periodo, "leitura": leitura, "fonte_id": "REA_DESERTIFICACAO",
    })
    # A série antiga (índice de aridez, normais 1960–2010) fica guardada, mas claramente separada.
    series = solo["series"]
    antiga = series.pop("susceptibilidade_desertificacao", None) or series.get("susceptibilidade_desertificacao_metodologia_anterior")
    if antiga is not None and not antiga.get("nota", "").startswith("Metodologia anterior"):
        antiga["nota"] = ("Metodologia anterior (índice de aridez, normais climáticas), descontinuada no REA 2025. "
                          "Não comparar com o ISD. " + antiga.get("nota", "").replace("Não interpolar anos intermédios.", "").strip()).strip()
    if antiga is not None:
        series["susceptibilidade_desertificacao_metodologia_anterior"] = antiga
    series["suscetibilidade_desertificacao_isd"] = {
        "unidade": "% do território continental", "tipo_periodo": "índice anual (ISD)", "ano": ano,
        "classes": classes, "nota": "Classes do ISD, metodologia do REA 2025. Não comparável com a série anterior.",
        "fonte_id": "REA_DESERTIFICACAO",
    }
    for fonte in solo["fontes"]:
        if fonte["id"] == "REA_DESERTIFICACAO":
            fonte.update({"titulo": "Relatório do Estado do Ambiente — Suscetibilidade à desertificação", "url": FICHA_DESERT, "consultado_em": hoje()})
    solo["metadados"]["atualizado_em"] = hoje()
    mudou = escrever_se_mudou("solo_stats.json", solo, None, ("atualizado_em", "consultado_em"))
    return ano, valor, mudou


FICHA_AR = BASE + "qualidade-do-ar-0"


def ler_qualidade_ar():
    """Valores da ficha «Qualidade do ar» do REA, para ajudar na revisão manual (não escreve dados).

    Devolve um dicionário com o que foi encontrado; campos em falta ficam de fora.
    """
    t = ler_ficha(FICHA_AR)
    achados = {}
    m = re.search(r"Em (\d{4}), a classe dominante do [ÍI]ndice de Qualidade do Ar \(IQAr\) foi [“\"]([^”\"]+)[”\"]", t)
    if m:
        achados["ano"], achados["classe_dominante_iqar"] = int(m.group(1)), m.group(2)
    m = re.search(r"um valor de ([\d,]+)% em (\d{4})", t)
    if m:
        achados["dias_fraco_ou_mau_percent"] = decimal(m.group(1))
    m = re.search(r"nas (\d+) esta[cç][õo]es que monitorizam o ozono troposf[ée]rico \(O 3 \), (\d+) ocorr[êe]ncias com exced[êe]ncia ao limiar de informa[cç][aã]o", t)
    if m:
        achados["estacoes_ozono"], achados["ocorrencias_limiar_informacao"] = int(m.group(1)), int(m.group(2))
    return achados


def definir_fonte(fontes, nome, url):
    """Passa a citar a ficha concreta (antes citava a página geral da última edição)."""
    fontes[:] = [{"nome": nome, "url": url}] + [f for f in fontes if f.get("nome") != nome]


def main():
    argumentos = argparse.ArgumentParser()
    argumentos.add_argument("--dry-run", action="store_true")
    comum.SECO = argumentos.parse_args().dry_run
    dados = ler("observatorio_terra.json")
    falhas, alterou = [], False

    try:
        ano, valor = extrair_gee(ler_ficha(FICHA_GEE))
        serie = dados["series_temporais"]["emissoes_gases_efeito_estufa"]
        anterior = serie["valores"].get(str(ano))
        serie["valores"][str(ano)] = valor
        serie["valores"] = dict(sorted(serie["valores"].items()))
        if len(serie["valores"]) > 1:
            serie["nota"] = (
                "Pontos de edições diferentes do REA: o inventário nacional é revisto todos os anos, por isso "
                "diferenças entre pontos podem incluir revisões. Para um gráfico histórico, importar a série completa "
                "do inventário nacional e manter separado o setor uso do solo, alteração do uso do solo e florestas."
            )
        definir_fonte(serie["fontes"], NOME_FONTE_GEE, FICHA_GEE)
        print(f"GEE {ano}: {valor} Mt CO₂e" + (" (já estava)" if anterior == valor else ""))
        alterou = True
    except ErroDados as erro:
        print(f"::warning::{erro}")
        falhas.append("gee")

    try:
        percentagem, em_erosao, total, perda = extrair_erosao(ler_ficha(FICHA_EROSAO))
        costa = dados["indicadores_territoriais"]["erosao_costeira"]
        costa["costa_baixa_arenosa_em_erosao_percent"] = percentagem
        costa["extensao_monitorizada_km"] = total
        costa["extensao_em_erosao_aproximada_km"] = em_erosao
        costa["perda_area_1958_2023_ha"] = perda
        definir_fonte(costa["fontes"], NOME_FONTE_EROSAO, FICHA_EROSAO)
        print(f"Erosão costeira: {percentagem}% ({em_erosao} de {total} km), perda {perda} ha")
        alterou = True
    except ErroDados as erro:
        print(f"::warning::{erro}")
        falhas.append("erosao")

    try:
        ano, valor, mudou_solo = atualizar_desertificacao(dados)
        print(f"Desertificação (ISD {ano}): {valor}% com suscetibilidade alta ou muito elevada; solo_stats.json: {'atualizado' if mudou_solo else 'sem alterações'}")
        alterou = True
    except ErroDados as erro:
        print(f"::warning::{erro}")
        falhas.append("desertificacao")

    if alterou:
        dados["metadados"]["ultima_atualizacao"] = hoje()
        mudou = escrever_se_mudou("observatorio_terra.json", dados, None, ("ultima_atualizacao",))
        print("observatorio_terra.json:", "atualizado" if mudou else "sem alterações")
    if falhas:
        sys.exit(2)


if __name__ == "__main__":
    main()

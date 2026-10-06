#!/usr/bin/env python3
"""Acrescenta o ano novo de temperatura e precipitação (Portugal continental) quando o IPMA publica o
Boletim Climatológico Anual.

Fonte: https://www.ipma.pt (notícia «Boletim Climatológico Anual»), onde uma frase fixa traz
«Em AAAA, o valor médio anual da temperatura média do ar, X °C foi superior/inferior em Y °C ao valor
normal 1991-2020» e «O total de precipitação anual foi Z mm».

Segurança: só se escreve se as duas frases forem encontradas com o ano certo e valores plausíveis; se o
texto mudar de formato não se escreve nada e o aviso fica nos registos. O desvio (anomalia) só é
guardado quando a normal é 1991-2020, a mesma dos pontos anteriores, para não misturar normais.

Uso: python3 scripts/dados/ipma_clima.py [--dry-run] [--ano AAAA]
"""
import argparse
import html
import re
import sys
import urllib.error
import urllib.request

import comum
from comum import USER_AGENT, ErroDados, escrever_se_mudou, hoje, ler

URL = "https://www.ipma.pt/pt/media/noticias/news.detail.jsp?f=boletim-climatologico-anual-{ano}.html&y={seguinte}"
NORMAL = "1991-2020"


def descarregar(url):
    pedido = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(pedido, timeout=60) as resposta:
            return resposta.read().decode("utf-8", errors="ignore")
    except urllib.error.HTTPError as erro:
        if erro.code == 404:
            return ""
        raise ErroDados(f"IPMA respondeu {erro.code}")
    except OSError as erro:
        raise ErroDados(f"Não foi possível ler o IPMA: {erro}")


def texto(pagina):
    pagina = re.sub(r"<script.*?</script>|<style.*?</style>", "", pagina, flags=re.S)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", pagina)))


def numero(valor):
    return float(valor.replace(",", ".").replace("+", "").replace(" ", ""))


def extrair(conteudo, ano):
    """Devolve (temperatura, desvio, normal, precipitação) ou None se o boletim ainda não existe."""
    t = texto(conteudo)
    frase = re.search(
        rf"Em {ano}, o valor m[eé]dio anual da temperatura m[eé]dia do ar,? ([\d.,]+) ?°C foi (superior|inferior) em ([+-]?[\d.,]+) ?°C ao valor normal (\d{{4}}-\d{{4}})",
        t,
    )
    chuva = re.search(r"total de precipita[cç][aã]o anual foi ([\d.,]+) ?mm", t)
    if not frase and not chuva:
        return None
    if not frase or not chuva:
        raise ErroDados(f"Boletim {ano} encontrado, mas o formato mudou (temperatura: {bool(frase)}, precipitação: {bool(chuva)}).")
    temperatura = numero(frase.group(1))
    desvio = abs(numero(frase.group(3)))
    if frase.group(2) == "inferior":
        desvio = -desvio
    precipitacao = numero(chuva.group(1))
    if not (10 <= temperatura <= 22 and -4 <= desvio <= 4 and 100 <= precipitacao <= 3000):
        raise ErroDados(f"Valores implausíveis no boletim {ano}: {temperatura} °C, {desvio:+} °C, {precipitacao} mm. Nada foi escrito.")
    return temperatura, desvio, frase.group(4), precipitacao


def adicionar_fonte(serie, ano, url):
    nome = f"IPMA — Boletim climatológico anual de {ano}"
    fontes = serie.setdefault("fontes", [])
    if not any(f.get("nome") == nome for f in fontes):
        # fica antes do «Portal DataClima», que é a ligação geral
        posicao = next((i for i, f in enumerate(fontes) if "DataClima" in f.get("nome", "")), len(fontes))
        fontes.insert(posicao, {"nome": nome, "url": url})


def main():
    argumentos = argparse.ArgumentParser()
    argumentos.add_argument("--dry-run", action="store_true")
    argumentos.add_argument("--ano", type=int, help="ano do boletim (por omissão, o seguinte ao último guardado)")
    opcoes = argumentos.parse_args()
    comum.SECO = opcoes.dry_run
    try:
        dados = ler("observatorio_terra.json")
        series = dados["series_temporais"]
        temperatura_serie = series["temperatura_media_anual_continente"]
        ultimo = max(int(a) for a in temperatura_serie["valores"])
        ano = opcoes.ano or ultimo + 1
        if str(ano) in temperatura_serie["valores"]:
            print(f"IPMA: {ano} já está nos dados — sem alterações.")
            return
        url = URL.format(ano=ano, seguinte=ano + 1)
        resultado = extrair(descarregar(url), ano)
        if resultado is None:
            print(f"IPMA: boletim climatológico anual de {ano} ainda não publicado — sem alterações.")
            return
        temperatura, desvio, normal, precipitacao = resultado
        chave = str(ano)
        temperatura_serie["valores"][chave] = temperatura
        series["precipitacao_anual_continente"]["valores"][chave] = precipitacao
        dados["esferas"]["atmosfera"]["temp_media"][chave] = temperatura
        for nome in ("temperatura_media_anual_continente", "precipitacao_anual_continente"):
            adicionar_fonte(series[nome], ano, url)
        if normal == NORMAL:
            series["anomalia_temperatura_continente"]["valores"][chave] = desvio
            adicionar_fonte(series["anomalia_temperatura_continente"], ano, url)
        else:
            print(f"::warning::IPMA {ano}: o desvio usa a normal {normal} (não {NORMAL}); só se guardaram temperatura e precipitação.")
        dados["metadados"]["ultima_atualizacao"] = hoje()
        mudou = escrever_se_mudou("observatorio_terra.json", dados, False, ("ultima_atualizacao",))
        print(f"IPMA {ano}: {temperatura} °C, desvio {desvio:+} °C ({normal}), {precipitacao} mm — {'atualizado' if mudou else 'sem alterações'}")
    except ErroDados as erro:
        comum.sair_com_erro(erro)


if __name__ == "__main__":
    main()

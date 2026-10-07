#!/usr/bin/env python3
"""Valida os dados mundiais atualizados antes de os publicar.

Verifica estrutura, intervalos plausíveis por indicador, presença do valor mundial e coerência entre
séries, países e síntese. Sai com código 1 se algo falhar (o fluxo automático então não publica).
"""
import math
import sys

import comum

INTERVALOS = {  # indicador -> (mínimo, máximo) plausíveis
    "sdg_6_1_1_safely_managed_drinking_water": (0, 100),
    "sdg_6_4_2_water_stress": (0, 5000),
    "sdg_15_3_1_degraded_land": (0, 100),
    "sdg_15_5_1_red_list_index": (0, 1),
    "pm25_mean_annual_exposure": (0, 500),
    "air_pollution_mortality_rate": (0, 2000),
    "electricity_access_pct": (0, 100),
    "renewable_final_energy_pct": (0, 100),
    "energy_intensity_mj_per_usd": (0, 1000),
    "renewable_electricity_pct": (0, 100),
    "terrestrial_protected_pct": (0, 100),
    "marine_protected_pct": (0, 100),
}
CONJUNTOS = {
    # nome: (série, países, síntese, chave do indicador na observação, chave da geografia)
    "water": ("indicator_id", "m49", "001"),
    "soil": ("indicator_id", "m49", "001"),
    "biodiversity": ("indicator_id", "m49", "001"),
    "air": ("indicator_id", "iso3", "WLD"),
    "energy": ("key", "code", "WLD"),
    "renewables-territory": ("key", "code", "WLD"),
}
erros = []


def falha(mensagem):
    erros.append(mensagem)


def valido(valor):
    return isinstance(valor, (int, float)) and not isinstance(valor, bool) and math.isfinite(valor)


def validar(nome, chave_indicador, chave_geo, codigo_mundo):
    serie = comum.ler(f"{nome}-timeseries.json")["observations"]
    paises = comum.ler(f"{nome}-countries.json")["entities"]
    visao = comum.ler(f"{nome}-overview.json")
    if len(serie) < 200:
        falha(f"{nome}: só {len(serie)} observações")
    vistos = set()
    for o in serie:
        indicador = o[chave_indicador]
        valor = o.get("value")
        geo = o.get("geography", {})
        if chave_geo not in geo or not geo.get("name"):
            falha(f"{nome}: geografia sem {chave_geo}/nome: {o}")
            break
        if valor is not None and not valido(valor):
            falha(f"{nome}: valor inválido em {indicador} {geo} {o.get('year')}: {valor!r}")
            break
        limites = INTERVALOS.get(o.get("indicator_id") or o.get("key") or indicador)
        if valor is not None and limites and not (limites[0] <= valor <= limites[1]):
            falha(f"{nome}: {indicador} fora do intervalo {limites}: {valor} ({geo.get('name')} {o.get('year')})")
            break
        if not (1900 <= int(o.get("year", 0)) <= 2100):
            falha(f"{nome}: ano inválido {o.get('year')}")
            break
        chave = (indicador, geo.get(chave_geo), geo["name"], o["year"], str(o.get("disaggregation")))
        if chave in vistos:
            falha(f"{nome}: observação repetida {chave}")
            break
        vistos.add(chave)
    if len(paises) < 100:
        falha(f"{nome}: só {len(paises)} geografias")
    for e in paises:
        if not e.get("latest"):
            falha(f"{nome}: geografia sem último valor: {e['geography']}")
            break
    # Síntese mundial presente e igual ao último valor da série mundial.
    metricas = visao["headline_metrics"]
    metricas = list(metricas.values()) if isinstance(metricas, dict) else metricas
    if not metricas:
        falha(f"{nome}: síntese sem valores mundiais")
    for m in metricas:
        if not valido(m.get("value")):
            falha(f"{nome}: valor mundial inválido: {m}")
    mundo = [o for o in serie if o["geography"].get(chave_geo) == codigo_mundo and valido(o.get("value"))]
    if not mundo:
        falha(f"{nome}: não há série do Mundo ({codigo_mundo})")


def validar_relatorio_terra():
    """O ficheiro de séries por país do relatório «Observatório da Terra» tem de estar completo e dentro dos intervalos."""
    import relatorio_terra

    dados = comum.ler("observatorio-terra-relatorio.json")
    for chave, (_f, _ci, _cg, indicador, _un, _fonte) in relatorio_terra.INDICADORES.items():
        bloco = dados["indicadores"].get(chave)
        if not bloco:
            falha(f"relatório da Terra: falta o indicador {chave}")
            continue
        series = bloco["series"]
        for obrigatorio in ("WLD", "PRT"):
            if obrigatorio not in series:
                falha(f"relatório da Terra: {chave} sem {obrigatorio}")
        if len(series) < 120:
            falha(f"relatório da Terra: {chave} só tem {len(series)} geografias")
        limites = INTERVALOS.get(indicador)
        for codigo, serie in series.items():
            for i, valor in enumerate(serie["v"]):
                if valor is None:
                    continue
                if not valido(valor) or (limites and not (limites[0] <= valor <= limites[1])):
                    falha(f"relatório da Terra: {chave} {codigo} {serie['a'] + i}: {valor!r}")
                    break
    for codigo in dados["paises"]:
        if codigo not in comum.ler("paises-iso.json")["paises"]:
            falha(f"relatório da Terra: país desconhecido {codigo}")


def main():
    for nome, (indicador, geo, mundo) in CONJUNTOS.items():
        try:
            validar(nome, indicador, geo, mundo)
        except (KeyError, ValueError, TypeError) as erro:
            falha(f"{nome}: estrutura inesperada ({erro!r})")
    try:
        validar_relatorio_terra()
    except (KeyError, ValueError, TypeError) as erro:
        falha(f"relatório da Terra: estrutura inesperada ({erro!r})")
    if erros:
        for erro in erros:
            print(f"ERRO: {erro}", file=sys.stderr)
        sys.exit(1)
    print("Dados mundiais válidos (água, solo, biodiversidade, ar, energia, renováveis e território).")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Gera data/observatorio-terra-relatorio.json: séries compactas por país para o relatório «Observatório da Terra».

Lê os ficheiros de dados já atualizados (energia, renováveis, ar, água, solo, biodiversidade), junta
as séries por país (ISO3) e por agregado (mundo, UE, grupos de rendimento) e escreve cada série como
{"a": primeiro ano, "v": [valores por ano, null nas lacunas]}. Não inventa, não interpola e não
calcula médias: só reorganiza valores oficiais. Executar depois de banco_mundial.py e ods_onu.py.
"""
import comum

ISO = comum.ler("paises-iso.json")["paises"]
M49_PARA_ISO3 = {p["m49"]: iso3 for iso3, p in ISO.items() if p["m49"]}
AGREGADOS_WB = {"WLD": "WLD", "EUU": "EUU", "HIC": "HIC", "UMC": "UMC", "LMC": "LMC", "LIC": "LIC"}
AGREGADOS_ONU = {"001": "WLD", "150": "EUR"}  # Mundo e Europa (código M49)

# id no relatório -> (ficheiro, campo do indicador, campo da geografia, unidade, fonte)
INDICADORES = {
    "acesso_eletricidade": ("energy-timeseries", "key", "code", "electricity_access_pct", "%", "Banco Mundial EG.ELC.ACCS.ZS (ODS 7.1.1)"),
    "renovavel_final": ("energy-timeseries", "key", "code", "renewable_final_energy_pct", "%", "Banco Mundial EG.FEC.RNEW.ZS (ODS 7.2.1)"),
    "intensidade_energetica": ("energy-timeseries", "key", "code", "energy_intensity_mj_per_usd", "MJ/USD", "Banco Mundial EG.EGY.PRIM.PP.KD (ODS 7.3.1)"),
    "eletricidade_renovavel": ("renewables-territory-timeseries", "key", "code", "renewable_electricity_pct", "%", "Banco Mundial EG.ELC.RNEW.ZS"),
    "area_protegida_terra": ("renewables-territory-timeseries", "key", "code", "terrestrial_protected_pct", "%", "Banco Mundial ER.LND.PTLD.ZS"),
    "area_protegida_mar": ("renewables-territory-timeseries", "key", "code", "marine_protected_pct", "%", "Banco Mundial ER.MRN.PTMR.ZS"),
    "pm25": ("air-timeseries", "indicator_id", "iso3", "pm25_mean_annual_exposure", "µg/m³", "Banco Mundial EN.ATM.PM25.MC.M3 (OMS/IHME)"),
    "mortalidade_ar": ("air-timeseries", "indicator_id", "iso3", "air_pollution_mortality_rate", "por 100 000", "Banco Mundial SH.STA.AIRP.P5 (OMS)"),
    "stress_hidrico": ("water-timeseries", "indicator_id", "m49", "sdg_6_4_2_water_stress", "%", "FAO AQUASTAT, ODS 6.4.2"),
    "agua_potavel": ("water-timeseries", "indicator_id", "m49", "sdg_6_1_1_safely_managed_drinking_water", "%", "OMS/UNICEF JMP, ODS 6.1.1"),
    "terra_degradada": ("soil-timeseries", "indicator_id", "m49", "sdg_15_3_1_degraded_land", "%", "UNCCD, ODS 15.3.1"),
    "lista_vermelha": ("biodiversity-timeseries", "indicator_id", "m49", "sdg_15_5_1_red_list_index", "índice", "IUCN e BirdLife International, ODS 15.5.1"),
}


GRUPOS_RENDIMENTO = {"High income": "HIC", "Upper middle income": "UMC", "Lower middle income": "LMC", "Low income": "LIC"}


def codigo(geo, campo):
    valor = geo.get(campo)
    if not valor and geo.get("name") in GRUPOS_RENDIMENTO:  # o Banco Mundial não dá código aos grupos de rendimento
        return GRUPOS_RENDIMENTO[geo["name"]]
    if campo == "m49":
        return M49_PARA_ISO3.get(valor) or AGREGADOS_ONU.get(valor)
    return valor if (valor in ISO or valor in AGREGADOS_WB or valor in AGREGADOS_ONU.values()) else None


def denso(pontos):
    anos = sorted(pontos)
    a0, a1 = anos[0], anos[-1]
    return {"a": a0, "v": [None if pontos.get(a) is None else round(pontos[a], 4) for a in range(a0, a1 + 1)]}


def main():
    cache = {}
    saida = {"gerado": comum.hoje(), "indicadores": {}}
    usados = set()
    for chave, (ficheiro, campo_ind, campo_geo, ind, unidade, fonte) in INDICADORES.items():
        if ficheiro not in cache:
            cache[ficheiro] = comum.ler(ficheiro + ".json")["observations"]
        series = {}
        for o in cache[ficheiro]:
            if o[campo_ind] != ind or o.get("value") is None:
                continue
            cod = codigo(o["geography"], campo_geo)
            if cod:
                series.setdefault(cod, {})[o["year"]] = o["value"]
        if "WLD" not in series:
            raise comum.ErroDados(f"{chave}: sem valor mundial")
        usados.update(c for c in series if c in ISO)
        saida["indicadores"][chave] = {"un": unidade, "fonte": fonte, "series": {c: denso(p) for c, p in sorted(series.items())}}
        print(f"  {chave}: {len(series)} geografias")
    saida["paises"] = {c: [ISO[c]["iso2"], ISO[c]["nome"], ISO[c]["regiao"], ISO[c]["rendimento"], 1 if ISO[c]["soberano"] else 0] for c in sorted(usados)}
    anterior = comum.DADOS / "observatorio-terra-relatorio.json"
    comum.escrever_se_mudou("observatorio-terra-relatorio.json", saida, compacto=True, campos_data=("gerado",))
    print(f"  {len(usados)} países; {anterior.stat().st_size // 1024} KB")


if __name__ == "__main__":
    try:
        main()
    except comum.ErroDados as erro:
        comum.sair_com_erro(erro)

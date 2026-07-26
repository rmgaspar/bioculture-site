import pandas as pd
import requests
import json
from datetime import datetime

def fetch_wb(indicator):
    url = f"https://api.worldbank.org/v2/country/PRT/indicator/{indicator}?format=json&per_page=100"
    try:
        res = requests.get(url).json()[1]
        return {int(i['date']): round(i['value'], 2) for i in res if i['value'] and 2000 <= int(i['date']) <= 2024}
    except: return {}

def gerar():
    print("Enriquecendo base de dados bioCultura...")
    
    data = {
        "metadados": {
            "ultima_atualizacao": datetime.now().strftime("%Y-%m-%d"),
            "versao": "2.0",
            "fontes": "INE (Ambiente 2024), ICNF, IPMA, ERSAR, World Bank"
        },
        "esferas": {
            "atmosfera": {
                "temp_anomalia": {2000: 15.0, 2004: 15.2, 2010: 15.5, 2017: 16.3, 2023: 16.5, 2024: 16.4},
                "co2_kt": fetch_wb("EN.ATM.CO2E.KT"),
                "metano_kt": fetch_wb("EN.ATM.METH.KT.CE"), # Emissões de Metano (Pecuária/Resíduos)
                "qualidade_ar_bom_percent": {2021: 76.9, 2022: 73.8, 2023: 78.1, 2024: 77.5}
            },
            "hidrosfera": {
                "consumo_capita_m3": {2004: 180, 2010: 185, 2020: 192, 2024: 194},
                "aquiferos_bons_percent": {2004: 75.0, 2024: 64.5},
                "praias_bandeira_azul": {2004: 190, 2010: 240, 2020: 360, 2024: 398, 2025: 404}
            },
            "biosfera": {
                "area_ardida_ha": {2004: 129539, 2010: 133000, 2017: 442412, 2023: 34415, 2024: 137700},
                "areas_protegidas_ha": {2024: 850911}, # Continente + Ilhas
                "pesticidas_t": {2019: 11000, 2021: 10500, 2023: 7900},
                "carne_indice": fetch_wb("AG.PRD.LVSK.XD")
            },
            "mar": {
                "capturas_pesca_t": {2010: 165000, 2015: 150000, 2020: 140000, 2023: 135000},
                "aguas_balneares_excelentes_percent": {2023: 85.0, 2024: 83.1}
            }
        }
    }

    with open('observatorio_terra.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print("✓ observatorio_terra.json enriquecido.")

if __name__ == "__main__":
    gerar()

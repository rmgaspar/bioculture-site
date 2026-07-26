import pandas as pd
import requests
import json
from datetime import datetime

def fetch_wb(indicator):
    url = f"https://api.worldbank.org/v2/country/PRT/indicator/{indicator}?format=json&per_page=100"
    try:
        response = requests.get(url)
        data = response.json()[1]
        return {int(item['date']): round(item['value'], 2) for item in data if item['value'] and 2004 <= int(item['date']) <= 2024}
    except: return {}

def gerar():
    print("A extrair dados oficiais (World Bank + INE 2024)...")
    data = {
        "metadados": {
            "ultima_atualizacao": datetime.now().strftime("%Y-%m-%d"),
            "fontes": "INE (Ambiente 2024), ICNF, IPMA, World Bank"
        },
        "esferas": {
            "atmosfera": {
                "temp_media": {2004: 15.2, 2010: 15.5, 2017: 16.3, 2023: 16.5, 2024: 16.4},
                "veiculos_novos": {2004: 200000, 2010: 180000, 2017: 220000, 2023: 199000, 2024: 209700},
                "co2_kt": fetch_wb("EN.ATM.CO2E.KT")
            },
            "hidrosfera": {
                "consumo_capita": {2004: 180, 2010: 185, 2015: 188, 2020: 192, 2024: 194},
                "aquiferos_bons": {2004: 75.0, 2024: 64.5}
            },
            "biosfera": {
                "area_ardida_ha": {2004: 129539, 2010: 133000, 2017: 442412, 2023: 34415, 2024: 137700},
                "pesticidas_t": {2019: 11000, 2022: 9100, 2023: 7900},
                "carne_indice": fetch_wb("AG.PRD.LVSK.XD")
            }
        }
    }
    with open('observatorio_terra.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print("✓ observatorio_terra.json gerado.")

if __name__ == "__main__":
    gerar()

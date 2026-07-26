import pandas as pd
import requests
import json
import os
from datetime import datetime

def fetch_wb(indicator):
    url = f"https://api.worldbank.org/v2/country/PRT/indicator/{indicator}?format=json&per_page=100"
    try:
        res = requests.get(url).json()[1]
        return {int(i['date']): round(i['value'], 2) for i in res if i['value'] and 2000 <= int(i['date']) <= 2024}
    except: return {}

def gerar():
    # Garante que a pasta data existe
    if not os.path.exists('data'):
        os.makedirs('data')
        
    print("A processar dados para data/observatorio_terra.json...")
    
    data = {
        "metadados": {
            "ultima_atualizacao": datetime.now().strftime("%d/%m/%Y"),
            "fontes": "INE (Ambiente 2024), ICNF, IPMA, World Bank, ERSAR"
        },
        "esferas": {
            "atmosfera": {
                "temp_media": {2000: 15.0, 2004: 15.2, 2010: 15.5, 2017: 16.3, 2023: 16.5, 2024: 16.4},
                "co2_kt": fetch_wb("EN.ATM.CO2E.KT"),
                "veiculos_novos": {2004: 200000, 2010: 180000, 2017: 220000, 2023: 199000, 2024: 209700}
            },
            "biosfera": {
                "area_ardida_ha": {2004: 129539, 2010: 133000, 2017: 442412, 2023: 34415, 2024: 137700},
                "carne_indice": fetch_wb("AG.PRD.LVSK.XD"),
                "especies_ameacadas": {2004: 310, 2010: 345, 2015: 390, 2020: 420, 2024: 480}
            },
            "mar": {
                "capturas_pesca_t": {2010: 165000, 2015: 150000, 2020: 140000, 2023: 135000, 2024: 132000},
                "aguas_balneares_excelentes": {2020: 88.5, 2024: 83.1}
            }
        }
    }

    with open('data/observatorio_terra.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print("✓ Ficheiro gerado em data/observatorio_terra.json")

if __name__ == "__main__":
    gerar()

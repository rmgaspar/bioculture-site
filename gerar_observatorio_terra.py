import json
import os
from datetime import datetime

def gerar():
    if not os.path.exists('data'):
        os.makedirs('data')
        
    data = {
        "metadados": {
            "ultima_atualizacao": datetime.now().strftime("%d/%m/%Y"),
            "fontes": "INE (Contas Económicas 2025), ICNF (Risco 2030), World Bank"
        },
        "esferas": {
            "atmosfera": {
                "temp_media": {2004: 15.2, 2010: 15.5, 2017: 16.3, 2024: 16.4, 2025: 16.6},
                "veiculos_novos": {2004: 200000, 2017: 220000, 2024: 209700}
            },
            "biosfera": {
                "area_ardida_ha": {2017: 442412, 2023: 34415, 2024: 137700, 2025: 270700},
                "especies_ameacadas": {2004: 310, 2024: 480},
                "risco_incendio_alta_percent": 30.6,
                "gado_aves_suino_t": {2024: 946000, 2025: 976000}
            },
            "mar": {
                "capturas_pesca_t": {2024: 165700, 2025: 166872},
                "praias_bandeira_azul": {2024: 398, 2025: 404}
            },
            "economia_recursos": {
                "rendimento_agricola_var_percent": {2023: 17.3, 2024: 15.2, 2025: -10.7},
                "stock_madeira_m3_milhoes": {2015: 188.8, 2023: 169.9},
                "vab_florestal_milhoes_eur": {2015: 850, 2023: 1142}
            }
        }
    }

    with open('data/observatorio_terra.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)
    print("✓ data/observatorio_terra.json atualizado com dados 2025.")

if __name__ == "__main__":
    gerar()

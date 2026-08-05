import requests
import json
import os
import urllib3

# Silenciar avisos de SSL (LibreSSL no macOS)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def download_paer_json():
    # Endpoint de Query do LNEG (Layer 0 = PAER)
    base_url = "https://sig.lneg.pt/server/rest/services/AreasAceleracaoEnergiasRenovaveis/MapServer/0/query"
    output_path = 'data/paer.json'
    
    if not os.path.exists('data'):
        os.makedirs('data')

    all_features = []
    offset = 0
    record_count = 1000 # Pedir 1000 de cada vez (paginação)
    
    print("-> A iniciar extração exaustiva via API LNEG...")

    while True:
        params = {
            'where': '1=1',
            'outFields': '*',
            'f': 'geojson',
            'resultOffset': offset,
            'resultRecordCount': record_count,
            'returnGeometry': 'true'
        }

        try:
            # verify=False resolve o erro de LibreSSL que viste no terminal
            res = requests.get(base_url, params=params, verify=False, timeout=30)
            res.raise_for_status()
            data = res.json()
            
            features = data.get('features', [])
            if not features:
                break
                
            all_features.extend(features)
            print(f"   + Recolhidas {len(all_features)} áreas...")
            
            # Se vierem menos do que o record_count, chegámos ao fim
            if len(features) < record_count:
                break
                
            offset += record_count

        except Exception as e:
            print(f"! Erro no offset {offset}: {e}")
            break

    if all_features:
        geojson_final = {
            "type": "FeatureCollection",
            "features": all_features
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(geojson_final, f, ensure_ascii=False, indent=2)
            
        print(f"-> Sucesso: {output_path} gerado com {len(all_features)} polígonos.")
    else:
        print("! Falha: Não foi possível extrair dados da API.")

if __name__ == "__main__":
    download_paer_json()

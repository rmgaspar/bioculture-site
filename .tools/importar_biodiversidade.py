import json
import requests
import time
import os

# Configurações
JSON_PATH = 'data/freguesias_portugal.json'
RADIUS = 15
PER_PAGE = 50

def get_inaturalist_data(lat, lon):
    url = "https://api.inaturalist.org/v1/observations/species_counts"
    params = {
        'lat': lat,
        'lng': lon,
        'radius': RADIUS,
        'quality_grade': 'research',
        'locale': 'pt-PT',
        'per_page': PER_PAGE
    }
    try:
        response = requests.get(url, params=params, timeout=15)
        if response.status_code == 200:
            results = response.json().get('results', [])
            return [{
                "nome": item.get('taxon', {}).get('preferred_common_name') or item.get('taxon', {}).get('name'),
                "grupo": item.get('taxon', {}).get('iconic_taxon_name'),
                "imagem": item.get('taxon', {}).get('default_photo', {}).get('medium_url')
            } for item in results]
    except Exception as e:
        print(f"Erro na API: {e}")
    return []

def update_json():
    if not os.path.exists(JSON_PATH):
        print("Erro: Ficheiro JSON não encontrado.")
        return

    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    for entry in data:
        lat, lon, nome = entry.get('lat'), entry.get('lon'), entry.get('titulo')
        if lat and lon and lat != 0:
            print(f"A importar: {nome}...")
            especies = get_inaturalist_data(lat, lon)
            if especies:
                if 'biomas' not in entry: entry['biomas'] = {}
                entry['biomas']['fauna_comum'] = especies
                print(f"  -> {len(especies)} espécies adicionadas.")
            time.sleep(1.2)

    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("\nSucesso! JSON atualizado.")

if __name__ == "__main__":
    update_json()


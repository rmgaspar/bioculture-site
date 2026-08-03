import requests
import json
import re
import time
import os

# Configurações
RADIUS = 50 
LOCALE = "pt-PT"
TARGET_REGION = "macao-cardigos-info-v2"

# IDs de Taxonomia do iNaturalist
TAXONS = {
    "Mammalia": 40151, "Aves": 3, "Reptilia": 26036, "Amphibia": 20978,
    "Actinopterygii": 47178, "Insecta": 47158, "Fungi": 47170, "Plantae": 47126
}

# Garante que os caminhos funcionam independentemente de onde o script é lançado
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BIO_PATH = os.path.join(BASE_DIR, 'data', 'bioregioes.json')
MASTER_PATH = os.path.join(BASE_DIR, 'data', 'especies_master.json')

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    return re.sub(r'[-\s]+', '-', text).strip('-')

def get_detailed_info(taxon_id):
    url = f"https://api.inaturalist.org/v1/taxa/{taxon_id}"
    params = {"locale": LOCALE, "preferred_place_id": 7122}
    try:
        r = requests.get(url, params=params, timeout=10).json()
        if r['results']:
            t = r['results'][0]
            return {
                "wiki": t.get('wikipedia_summary'),
                "ancestors": [a['name'] for a in t.get('ancestors', [])],
                "conservation": t.get('conservation_status', {}).get('status_name', 'Segura')
            }
    except: return None

def processar():
    if not os.path.exists(BIO_PATH):
        print(f"Erro: Ficheiro não encontrado em {BIO_PATH}")
        return

    with open(BIO_PATH, 'r', encoding='utf-8') as f:
        regioes = json.load(f)
    with open(MASTER_PATH, 'r', encoding='utf-8') as f:
        master = json.load(f)

    reg = next((r for r in regioes if r['id'] == TARGET_REGION), None)
    if not reg:
        print(f"Erro: Região '{TARGET_REGION}' não encontrada no JSON.")
        return

    print(f"--- Iniciando Enriquecimento para {reg['titulo']} (Raio: {RADIUS}km) ---")
    
    if "especies_ids" not in reg["biomas"]: reg["biomas"]["especies_ids"] = []

    for grupo, t_id in TAXONS.items():
        print(f"Buscando {grupo}...")
        url = "https://api.inaturalist.org/v1/observations/species_counts"
        params = {"lat": reg['lat'], "lng": reg['lon'], "radius": RADIUS, "taxon_id": t_id, "quality_grade": "research", "locale": LOCALE}
        
        try:
            res = requests.get(url, params=params).json().get('results', [])
            for item in res:
                t = item['taxon']
                nome_pt = t.get('preferred_common_name') or t['name']
                esp_id = slugify(nome_pt)

                if esp_id not in master:
                    details = get_detailed_info(t['id'])
                    master[esp_id] = {
                        "nome": nome_pt,
                        "nome_cientifico": t['name'],
                        "grupo": grupo,
                        "imagem": t.get('default_photo', {}).get('medium_url', ''),
                        "sintese": details['wiki'] if details and details['wiki'] else "Informação em atualização.",
                        "taxonomia_completa": details['ancestors'] if details else [grupo],
                        "estatuto": details['conservation'] if details else "Nativa",
                        "sazonalidade": "Observada em Portugal"
                    }
                
                if esp_id not in reg["biomas"]["especies_ids"]:
                    reg["biomas"]["especies_ids"].append(esp_id)
            print(f"  > {len(res)} espécies de {grupo} processadas.")
        except Exception as e:
            print(f"Erro ao buscar {grupo}: {e}")
        
        time.sleep(1)

    with open(MASTER_PATH, 'w', encoding='utf-8') as f:
        json.dump(master, f, ensure_ascii=False, indent=2)
    with open(BIO_PATH, 'w', encoding='utf-8') as f:
        json.dump(regioes, f, ensure_ascii=False, separators=(',', ':'))

    print(f"\nSucesso! Master agora tem {len(master)} espécies.")

if __name__ == "__main__":
    processar()

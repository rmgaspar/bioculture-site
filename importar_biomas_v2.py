import requests
import json
import re
import time

# IDs de Taxonomia do iNaturalist
TAXONS = {
    "Mammalia": 40151,
    "Aves": 3,
    "Reptilia": 26036,
    "Amphibia": 20978,
    "Actinopterygii": 47178, # Peixes
    "Insecta": 47158,
    "Arachnida": 47119,
    "Fungi": 47170
}

def slugify(text):
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    return re.sub(r'[-\s]+', '-', text).strip('-')

def fetch_inaturalist(lat, lon, taxon_id, limit=20):
    url = f"https://api.inaturalist.org/v1/observations/species_counts"
    params = {
        "lat": lat,
        "lng": lon,
        "radius": 30, # Raio de 30km
        "taxon_id": taxon_id,
        "quality_grade": "research",
        "per_page": limit
    }
    try:
        r = requests.get(url, params=params, timeout=10)
        return r.json().get('results', [])
    except:
        return []

def completar_inventario():
    # 1. Carregar ficheiros atuais
    with open('data/bioregioes.json', 'r', encoding='utf-8') as f:
        regioes = json.load(f)
    with open('data/especies_master.json', 'r', encoding='utf-8') as f:
        master = json.load(f)

    print(f"Iniciando atualização. Master atual: {len(master)} espécies.")

    # 2. Iterar apenas nas regiões que queres completar (ou todas)
    for reg in regioes:
        # Exemplo: focar em Cardigos ou processar todas
        # if reg['id'] != 'cardigos': continue 

        print(f"A processar: {reg['titulo']}...")
        
        if "especies_ids" not in reg["biomas"]:
            reg["biomas"]["especies_ids"] = []

        for grupo_nome, taxon_id in TAXONS.items():
            results = fetch_inaturalist(reg['lat'], reg['lon'], taxon_id)
            
            for item in results:
                taxon = item['taxon']
                nome_comum = taxon.get('preferred_common_name') or taxon['name']
                esp_id = slugify(nome_comum)

                # Adicionar ao Master se for nova
                if esp_id not in master:
                    master[esp_id] = {
                        "nome": nome_comum,
                        "nome_cientifico": taxon['name'],
                        "grupo": grupo_nome,
                        "imagem": taxon.get('default_photo', {}).get('medium_url', ''),
                        "taxonomia": taxon.get('ancestry', ''),
                        "sintese": "Espécie observada na região via iNaturalist."
                    }

                # Associar à região se ainda não estiver lá
                if esp_id not in reg["biomas"]["especies_ids"]:
                    reg["biomas"]["especies_ids"].append(esp_id)
            
            time.sleep(0.5) # Evitar bloqueio da API

    # 3. Gravar resultados
    with open('data/especies_master.json', 'w', encoding='utf-8') as f:
        json.dump(master, f, ensure_ascii=False, indent=2)

    with open('data/bioregioes.json', 'w', encoding='utf-8') as f:
        json.dump(regioes, f, ensure_ascii=False, separators=(',', ':'))

    print(f"Concluído! Master agora tem {len(master)} espécies.")

if __name__ == "__main__":
    completar_inventario()

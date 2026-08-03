import requests
import json
import time

def enriquecer_especies():
    with open('data/especies_master.json', 'r', encoding='utf-8') as f:
        master = json.load(f)

    print(f"Enriquecendo {len(master)} espécies. Isto pode demorar...")
    
    headers = {'User-Agent': 'bioCultura-Enrichment-Bot'}
    count = 0

    for esp_id, info in master.items():
        # Só processa se não tiver síntese real ou se o nome científico estiver em falta
        if info.get('sintese') == "Espécie observada via iNaturalist." or not info.get('taxonomia_completa'):
            
            # Pesquisa pelo nome científico ou comum
            search_url = f"https://api.inaturalist.org/v1/taxa?q={info['nome']}&locale=pt-PT"
            try:
                res = requests.get(search_url, headers=headers).json()
                if res['results']:
                    taxon = res['results'][0]
                    
                    # 1. Nome Científico real
                    info['nome_cientifico'] = taxon.get('name', info.get('nome_cientifico'))
                    
                    # 2. Síntese (Wikipedia summary se disponível)
                    if taxon.get('wikipedia_summary'):
                        # Limpa tags HTML simples do sumário
                        summary = taxon['wikipedia_summary'].split('<p>')[1].split('</p>')[0] if '<p>' in taxon['wikipedia_summary'] else taxon['wikipedia_summary']
                        info['sintese'] = summary
                    
                    # 3. Taxonomia detalhada
                    info['taxonomia_completa'] = [t['name'] for f in taxon.get('ancestors', [])]
                    
                    # 4. Estado de Conservação
                    status = taxon.get('conservation_status', {})
                    if status:
                        info['estatuto'] = f"{status.get('status_name')} ({status.get('authority')})"
                    else:
                        info['estatuto'] = "Nativa / Residente"

                    count += 1
                    print(f"[{count}] Atualizado: {info['nome']}")
                
                time.sleep(1) # Delay para evitar ban da API
            except Exception as e:
                print(f"Erro em {esp_id}: {e}")

    with open('data/especies_master.json', 'w', encoding='utf-8') as f:
        json.dump(master, f, ensure_ascii=False, indent=2)

    print("Enriquecimento concluído.")

if __name__ == "__main__":
    enriquecer_especies()

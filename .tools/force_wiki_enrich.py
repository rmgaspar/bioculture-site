import requests
import json
import time
import urllib.parse

def get_wiki_summary(scientific_name):
    # Tenta pela API da Wikipedia em Português
    encoded = urllib.parse.quote(scientific_name)
    url = f"https://pt.wikipedia.org/api/rest_v1/page/summary/{encoded}"
    headers = {'User-Agent': 'bioCulturaBot/1.0'}
    try:
        r = requests.get(url, headers=headers, timeout=5)
        if r.status_code == 200:
            return r.json().get('extract')
    except: return None
    return None

def force_enrich():
    with open('data/especies_master.json', 'r', encoding='utf-8') as f:
        master = json.load(f)

    print(f"A analisar {len(master)} espécies...")
    count = 0

    for esp_id, info in master.items():
        # Se a síntese for curta ou a genérica, tenta atualizar
        sintese = info.get('sintese', '')
        if len(sintese) < 100 or "faz parte do inventário" in sintese:
            
            # Tenta pelo nome científico primeiro
            resumo = get_wiki_summary(info.get('nome_cientifico', ''))
            
            # Se falhar, tenta pelo nome comum
            if not resumo:
                resumo = get_wiki_summary(info.get('nome', ''))

            if resumo:
                info['sintese'] = resumo
                count += 1
                print(f"[{count}] Sucesso: {info['nome']}")
            
            time.sleep(0.1) # Rápido mas seguro

    with open('data/especies_master.json', 'w', encoding='utf-8') as f:
        json.dump(master, f, ensure_ascii=False, indent=2)

    print(f"\nConcluído! {count} espécies enriquecidas.")

if __name__ == "__main__":
    force_enrich()

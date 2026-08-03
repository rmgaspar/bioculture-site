import requests
import json
import time
import urllib.parse

def get_wiki_clean(scientific_name):
    headers = {'User-Agent': 'bioCulturaBot/1.0'}
    url = f"https://pt.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(scientific_name)}"
    try:
        r = requests.get(url, headers=headers, timeout=5)
        if r.status_code == 200:
            return r.json().get('extract')
    except: return None
    return None

def enriquecer_vazios():
    path = 'data/especies_master.json'
    with open(path, 'r', encoding='utf-8') as f:
        master = json.load(f)

    count = 0
    for esp_id, info in master.items():
        sintese = info.get('sintese', '')
        if not sintese or "processamento" in sintese or len(sintese) < 100:
            # Tenta pelo nome científico
            sc_name = info.get('nome_cientifico')
            if sc_name and sc_name != "undefined":
                resumo = get_wiki_clean(sc_name)
                if resumo:
                    info['sintese'] = resumo
                    count += 1
                    print(f"[{count}] Recuperado: {info['nome']}")
                    time.sleep(0.2)

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(master, f, ensure_ascii=False, indent=2)
    print(f"Fim. {count} espécies enriquecidas.")

if __name__ == "__main__":
    enriquecer_vazios()

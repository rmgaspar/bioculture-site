import requests
import json
import time
import urllib.parse

# Lista de produtos para o Observatório bioCultura
HORTICOLAS_LISTA = [
    "Tomate", "Alface", "Cenoura", "Batata", "Couve-galega", "Brócolis", 
    "Espinafre", "Pimento", "Pepino", "Curgete", "Abóbora", "Alho", 
    "Cebola", "Feijão-verde", "Ervilha", "Grão-de-bico", "Fava", 
    "Coentro", "Salsa", "Manjericão", "Hortelã", "Alecrim", "Tomilho"
]

def get_wiki_data(item):
    url = f"https://pt.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(item)}"
    headers = {'User-Agent': 'bioCulturaBot/1.0 (contato@biocultura.net)'}
    try:
        r = requests.get(url, headers=headers, timeout=5)
        if r.status_code == 200:
            data = r.json()
            return {
                "nome": item,
                "nome_cientifico": data.get('description', 'Espécie cultivada'),
                "imagem": data.get('thumbnail', {}).get('source', '').replace('200px', '800px'),
                "sintese": data.get('extract', ''),
                "grupo": "Hortícola",
                "fonte": "Wikipedia"
            }
    except: return None
    return None

def gerar_master_horticolas():
    master_horticolas = {}
    print(f"A importar {len(HORTICOLAS_LISTA)} produtos hortícolas...")
    
    for item in HORTICOLAS_LISTA:
        data = get_wiki_data(item)
        if data:
            # Criar ID amigável (slug)
            esp_id = item.lower().replace(" ", "-").replace("-", "")
            master_horticolas[esp_id] = data
            print(f"OK: {item}")
        time.sleep(0.2)

    with open('data/horticolas_master.json', 'w', encoding='utf-8') as f:
        json.dump(master_horticolas, f, ensure_ascii=False, indent=2)
    
    print("\nFicheiro data/horticolas_master.json gerado com sucesso.")

if __name__ == "__main__":
    gerar_master_horticolas()

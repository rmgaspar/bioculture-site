import requests
import json
import urllib.parse
import time

# Lista de produtos para garantir que nenhum fica de fora
PRODUTOS_REPARAR = [
    ("Tomate", "Tomate"), ("Alface", "Alface"), ("Cenoura", "Cenoura"), 
    ("Couve-galega", "Couve-galega"), ("Batata", "Batata"), ("Mirtilo", "Mirtilo"), 
    ("Castanha", "Castanha"), ("Morango", "Morango"), ("Azeitona", "Azeitona"), 
    ("Alfarroba", "Alfarroba"), ("Fava", "Fava"), ("Grão-de-bico", "Grão-de-bico"),
    ("Melancia", "Melancia"), ("Pepino", "Pepino"), ("Pimento", "Pimento"),
    ("Beringela", "Beringela"), ("Cebola", "Cebola"), ("Salsa", "Salsa (planta)")
]

def get_wiki_image(search_term):
    url = f"https://pt.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(search_term)}"
    headers = {'User-Agent': 'bioCulturaBot/1.0 (contato@biocultura.net)'}
    try:
        r = requests.get(url, headers=headers, timeout=5)
        if r.status_code == 200:
            data = r.json()
            # Prioriza a imagem original (grande), senão usa a thumbnail
            img_url = data.get('originalimage', {}).get('source') or data.get('thumbnail', {}).get('source')
            return img_url, data.get('extract'), data.get('description')
    except:
        return None, None, None
    return None, None, None

def reparar_json():
    # Carrega o master atual se existir, senão cria um novo
    try:
        with open('data/horticolas_master.json', 'r', encoding='utf-8') as f:
            master = json.load(f)
    except:
        master = {}

    print("Iniciando reparação de imagens e dados...")

    for nome_exibicao, termo_wiki in PRODUTOS_REPARAR:
        esp_id = nome_exibicao.lower().replace(" ", "-").replace("ç", "c").replace("ã", "a").replace("-de-", "-")
        
        img, extract, desc = get_wiki_image(termo_wiki)
        
        if img:
            master[esp_id] = {
                "nome": nome_exibicao,
                "nome_cientifico": desc or "Espécie cultivada",
                "imagem": img,
                "sintese": extract or f"Informação sobre {nome_exibicao} em atualização.",
                "grupo": "Hortícola / Pomar",
                "fonte": "Wikipedia"
            }
            print(f"✓ {nome_exibicao}: Imagem encontrada.")
        else:
            print(f"✗ {nome_exibicao}: Sem imagem na Wikipedia.")
        
        time.sleep(0.2)

    with open('data/horticolas_master.json', 'w', encoding='utf-8') as f:
        json.dump(master, f, ensure_ascii=False, indent=2)

    print("\nFicheiro data/horticolas_master.json atualizado.")

if __name__ == "__main__":
    reparar_json()

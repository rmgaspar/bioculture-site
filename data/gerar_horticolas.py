import requests
import json
import time
import urllib.parse
import re

# Lista curada: Portugal Continental e Ilhas (Frutas, Legumes, Hortícolas, Frutos Secos)
PRODUTOS_LISTA = [
    # Hortícolas e Legumes
    "Abóbora", "Agrião", "Aipo", "Alcachofra", "Alface", "Alho", "Alho-francês", "Batata", 
    "Batata-doce", "Beterraba", "Beringela", "Brócolos", "Cebola", "Cenoura", "Chuchu", 
    "Couve-flor", "Couve-galega", "Couve-lombarda", "Couve-portuguesa", "Curgete", "Ervilha", 
    "Espargo", "Espinafre", "Fava", "Feijão", "Feijão-frade", "Feijão-verde", "Grão-de-bico", 
    "Lentilha", "Nabiça", "Nabo", "Pimento", "Rabanete", "Repolho", "Tomate",
    
    # Pomar e Frutas (Continente)
    "Ameixa", "Amora", "Cereja do Fundão", "Damasco", "Figo", "Framboesa", "Groselha", 
    "Kiwi", "Laranja do Algarve", "Limão", "Maçã Bravo de Esmolfe", "Maçã de Alcobaça", 
    "Marmelo", "Melancia", "Melão", "Meloa", "Mirtilo", "Morango", "Nêspera", 
    "Pêra Rocha", "Pêssego da Cova da Beira", "Romã", "Tangerina", "Uva-espim",
    
    # Produtos das Ilhas (Açores e Madeira)
    "Ananás dos Açores", "Anona", "Banana da Madeira", "Maracujá", "Inhame", "Cana-de-açúcar",
    
    # Frutos Secos e Oleaginosas
    "Amêndoa", "Avelã", "Castanha", "Noz", "Pinhão", "Pistácio", "Alfarroba", "Azeitona",
    
    # Ervas Aromáticas e Condimentos
    "Alecrim", "Coentro", "Hortelã", "Manjericão", "Oregão", "Salsa", "Tomilho", "Loureiro", "Chá"
]

def slugify(text):
    """Cria IDs limpos para o JSON."""
    text = text.lower()
    # Remove acentos
    text = text.replace('á', 'a').replace('ã', 'a').replace('â', 'a').replace('é', 'e').replace('ê', 'e')
    text = text.replace('í', 'i').replace('ó', 'o').replace('õ', 'o').replace('ô', 'o').replace('ú', 'u')
    text = text.replace('ç', 'c')
    return re.sub(r'[^a-z0-9]+', '-', text).strip('-')

def get_wiki_data(item):
    url = f"https://pt.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(item)}"
    headers = {'User-Agent': 'bioCulturaBot/1.0 (contato@biocultura.net)'}
    try:
        r = requests.get(url, headers=headers, timeout=5)
        if r.status_code == 200:
            data = r.json()
            # Tenta extrair o nome científico da descrição ou do texto
            desc = data.get('description', '')
            # Limpa a imagem para versão maior
            img = data.get('thumbnail', {}).get('source', '')
            if img: img = img.replace(re.search(r'\d+px', img).group(), '800px')
            
            return {
                "nome": item,
                "nome_cientifico": desc if "(" not in desc else desc.split('(')[1].split(')')[0],
                "imagem": img,
                "sintese": data.get('extract', ''),
                "grupo": "Hortícola/Pomar",
                "fonte": "Wikipedia"
            }
    except: return None
    return None

def gerar_json():
    master_horticolas = {}
    total = len(PRODUTOS_LISTA)
    print(f"Iniciando importação de {total} produtos...")

    for idx, item in enumerate(PRODUTOS_LISTA):
        data = get_wiki_data(item)
        if data:
            esp_id = slugify(item)
            master_horticolas[esp_id] = data
            print(f"[{idx+1}/{total}] OK: {item}")
        else:
            print(f"[{idx+1}/{total}] Falhou: {item}")
        time.sleep(0.2) # Evitar bloqueio

    with open('data/horticolas_master.json', 'w', encoding='utf-8') as f:
        json.dump(master_horticolas, f, ensure_ascii=False, indent=2)
    
    print(f"\nSucesso! {len(master_horticolas)} produtos guardados em data/horticolas_master.json")

if __name__ == "__main__":
    gerar_json()

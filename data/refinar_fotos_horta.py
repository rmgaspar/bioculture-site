import requests
import json
import urllib.parse
import time

# Mapeamento de termos específicos para evitar ambiguidades (ex: Cenoura planta vs Cor)
WIKI_FIX_MAP = [
    ("cenoura", "Cenoura"),
    ("tomate", "Tomate"),
    ("alface", "Alface"),
    ("batata", "Batata"),
    ("couve-galega", "Couve-galega"),
    ("mirtilo", "Vaccinium_myrtillus"),
    ("morango", "Morango"),
    ("azeitona", "Oliveira"),
    ("alfarroba", "Alfarrobeira"),
    ("fava", "Vicia_faba"),
    ("grao-de-bico", "Cicer_arietinum"),
    ("salsa", "Salsa_(planta)"),
    ("coentro", "Coentro"),
    ("pepino", "Cucumis_sativus"),
    ("pimento", "Pimento"),
    ("beringela", "Beringela"),
    ("cebola", "Cebola"),
    ("melancia", "Citrullus_lanatus")
]

def get_verified_image(wiki_title):
    url = f"https://pt.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(wiki_title)}"
    headers = {'User-Agent': 'bioCulturaBot/1.0 (contato@biocultura.net)'}
    try:
        r = requests.get(url, headers=headers, timeout=5)
        if r.status_code == 200:
            data = r.json()
            # originalimage é a foto em alta resolução
            return data.get('originalimage', {}).get('source')
    except:
        return None
    return None

def refinar_master():
    try:
        with open('data/horticolas_master.json', 'r', encoding='utf-8') as f:
            master = json.load(f)
    except:
        print("Erro: horticolas_master.json não encontrado.")
        return

    print("Refinando imagens para paridade biológica...")

    for esp_id, wiki_term in WIKI_FIX_MAP:
        if esp_id in master:
            nova_img = get_verified_image(wiki_term)
            if nova_img:
                master[esp_id]['imagem'] = nova_img
                print(f"✓ {esp_id}: Imagem botânica atualizada.")
            else:
                print(f"✗ {esp_id}: Não foi possível encontrar nova imagem.")
            time.sleep(0.2)

    with open('data/horticolas_master.json', 'w', encoding='utf-8') as f:
        json.dump(master, f, ensure_ascii=False, indent=2)

    print("\nRefinação concluída.")

if __name__ == "__main__":
    refinar_master()

import json
import re
import os

def slugify(text):
    if not text: return "n-a"
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    return re.sub(r'[-\s]+', '-', text).strip('-')

def optimizar_agressivo():
    input_path = 'data/freguesias_portugal.json'
    if not os.path.exists(input_path):
        print(f"Erro: {input_path} não encontrado!")
        return

    print(f"A carregar {input_path}...")
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    especies_master = {}
    count_especies = 0
    
    for regiao in data:
        # Tenta encontrar a lista de espécies (fauna_comum ou fauna)
        biomas = regiao.get("biomas", {})
        especies_origem = biomas.get("fauna_comum") or biomas.get("fauna")
        
        if isinstance(especies_origem, list):
            especies_ids = []
            for esp in especies_origem:
                # Trata se for objeto ou apenas string
                nome = esp['nome'] if isinstance(esp, dict) else esp
                esp_id = slugify(nome)
                
                if esp_id not in especies_master:
                    if isinstance(esp, dict):
                        especies_master[esp_id] = {
                            "nome": esp.get('nome'),
                            "grupo": esp.get('grupo', 'N/A'),
                            "imagem": esp.get('imagem', '')
                        }
                    else:
                        especies_master[esp_id] = {"nome": esp, "grupo": "N/A", "imagem": ""}
                    count_especies += 1
                
                especies_ids.append(esp_id)
            
            regiao["biomas"]["especies_ids"] = especies_ids
            # Remove as chaves pesadas
            if "fauna_comum" in regiao["biomas"]: del regiao["biomas"]["fauna_comum"]
            if "fauna" in regiao["biomas"]: del regiao["biomas"]["fauna"]

    # 1. Gravar Master
    with open('data/especies_master.json', 'w', encoding='utf-8') as f:
        json.dump(especies_master, f, ensure_ascii=False, indent=2)

    # 2. Gravar Bioregiões MINIFIED (Para caber nos 25MB do Cloudflare)
    with open('data/bioregioes.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

    print(f"Sucesso! Master com {count_especies} espécies.")
    print(f"Ficheiro data/bioregioes.json gerado (Minified).")

if __name__ == "__main__":
    optimizar_agressivo()

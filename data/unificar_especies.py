import json
import re
import os

def slugify(text):
    if not text: return "n-a"
    text = text.lower()
    text = text.replace('á', 'a').replace('ã', 'a').replace('â', 'a').replace('é', 'e').replace('ê', 'e')
    text = text.replace('í', 'i').replace('ó', 'o').replace('õ', 'o').replace('ô', 'o').replace('ú', 'u')
    text = text.replace('ç', 'c')
    text = re.sub(r'[^\w\s-]', '', text)
    return re.sub(r'[-\s]+', '-', text).strip('-')

def unificar():
    # Caminhos
    master_path = 'data/especies_master.json'
    flora_path = 'data/flora_invasora.json'
    pragas_path = 'data/pragas.json'

    # Carregar Master
    with open(master_path, 'r', encoding='utf-8') as f:
        master = json.load(f)

    # Migrar Flora Invasora
    if os.path.exists(flora_path):
        with open(flora_path, 'r', encoding='utf-8') as f:
            flora_data = json.load(f)
            for item in flora_data:
                esp_id = slugify(item['nome_comum'])
                master[esp_id] = {
                    "nome": item['nome_comum'],
                    "nome_cientifico": item['nome_cientifico'],
                    "grupo": "Flora Invasora",
                    "imagem": item.get('imagem', ''),
                    "sintese": f"{item.get('impacto', '')} Controlo: {item.get('solucao_biologica', {}).get('metodo', '')}",
                    "estatuto": "Invasora",
                    "fonte": "bioCultura / ICNF"
                }
        print(f"Flora Invasora migrada.")

    # Migrar Pragas (Sanidade Vegetal)
    if os.path.exists(pragas_path):
        with open(pragas_path, 'r', encoding='utf-8') as f:
            pragas_data = json.load(f)
            for item in pragas_data:
                esp_id = slugify(item['nome_comum'])
                master[esp_id] = {
                    "nome": item['nome_comum'],
                    "nome_cientifico": item['nome_cientifico'],
                    "grupo": "Sanidade Vegetal",
                    "imagem": item.get('imagem', ''),
                    "sintese": f"Sintomas: {item.get('sintomas', '')} Solução Biológica: {item.get('solucao_biologica', {}).get('metodo', '')}",
                    "estatuto": "Praga / Doença",
                    "fonte": "bioCultura / DGAV"
                }
        print(f"Pragas migradas.")

    # Gravar Master Unificado
    with open(master_path, 'w', encoding='utf-8') as f:
        json.dump(master, f, ensure_ascii=False, indent=2)

    print(f"Sucesso! Ficheiro {master_path} atualizado com {len(master)} entradas totais.")

if __name__ == "__main__":
    unificar()

import json
import os
import re

def slugify(text):
    # Converte "Abóbora, doce" em "abobora" para bater com as chaves do Wiki
    text = text.lower().split(',')[0].split('-')[0].strip()
    import unicodedata
    return "".join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn').replace(" ", "-")

def repair_and_merge():
    master_path = 'data/horticolas_master.json'
    koppert_path = 'data/koppert_culturas_hortalicas.json'
    
    # 1. Carregar o Master (Dicionário Wiki)
    with open(master_path, 'r', encoding='utf-8') as f:
        master = json.load(f)

    # 2. Carregar os novos dados (Lista Koppert)
    if os.path.exists(koppert_path):
        with open(koppert_path, 'r', encoding='utf-8') as f:
            koppert_list = json.load(f)
    else:
        print("Ficheiro Koppert não encontrado para fusão.")
        return

    # 3. Fusão Controlada
    for item in koppert_list:
        key = slugify(item['titulo'])
        
        # Mapeamento de sinónimos manuais se necessário
        if key == "alho-poro": key = "alho-frances"
        if key == "brocolis": key = "brocolos"

        if key in master:
            print(f"-> A enriquecer: {key}")
            master[key].update({
                "resumo_koppert": item.get('resumo'),
                "solucoes_biologicas": item.get('conteudo', '').split('Soluções biológicas')[0].strip(),
                "url_koppert": item.get('url'),
                "imagem_koppert": item.get('imagem')
            })
        else:
            # Se não existe no Wiki, cria nova entrada
            print(f"-> A criar nova entrada: {key}")
            master[key] = {
                "nome": item['titulo'],
                "sintese": item['resumo'],
                "grupo": "Hortícola/Pomar",
                "fonte": "Koppert",
                "imagem": item['imagem']
            }

    # 4. Gravar ficheiro reparado
    with open(master_path, 'w', encoding='utf-8') as f:
        json.dump(master, f, ensure_ascii=False, indent=2)
    
    print(f"\nSucesso: {master_path} reparado e fundido.")

if __name__ == "__main__":
    repair_and_merge()

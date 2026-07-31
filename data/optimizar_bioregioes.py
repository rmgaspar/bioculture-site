import json
import re
import os

def slugify(text):
    """Cria um ID limpo a partir do nome da espécie."""
    text = text.lower()
    text = re.sub(r'[^\w\s-]', '', text)
    return re.sub(r'[-\s]+', '-', text).strip('-')

def otimizar_bioregioes(input_file, output_regioes, output_master):
    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    especies_master = {}
    
    # Processar cada região/concelho
    for regiao in data:
        if "biomas" in regiao and "fauna_comum" in regiao["biomas"]:
            especies_ids = []
            
            for especie in regiao["biomas"]["fauna_comum"]:
                # Gerar ID único para a espécie
                esp_id = slugify(especie['nome'])
                
                # Adicionar ao master se ainda não existir
                if esp_id not in especies_master:
                    especies_master[esp_id] = {
                        "nome": especie['nome'],
                        "grupo": especie.get('grupo', 'N/A'),
                        "imagem": especie.get('imagem', '')
                    }
                
                especies_ids.append(esp_id)
            
            # Substituir a lista de objetos por lista de IDs
            regiao["biomas"]["especies_ids"] = especies_ids
            # Remover a chave antiga para poupar espaço
            del regiao["biomas"]["fauna_comum"]

    # Guardar o Master das Espécies
    with open(output_master, 'w', encoding='utf-8') as f:
        json.dump(especies_master, f, ensure_ascii=False, indent=2)

    # Guardar as Bioregiões otimizadas
    with open(output_regioes, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Sucesso!")
    print(f"Master criado com {len(especies_master)} espécies únicas.")
    print(f"Ficheiro {output_regioes} otimizado.")

# Execução
otimizar_bioregioes(
    'data/bioregioes.json', 
    'data/bioregioes_otimizado.json', 
    'data/especies_master.json'
)

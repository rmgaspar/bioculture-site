import json
import os

# Configura os caminhos assumindo que corres o script da raiz do projeto
FREGUESIAS_PATH = 'data/freguesias_portugal.json'
BIOREGIOES_PATH = 'data/bioregioes.json'

def integrar_dados():
    if not os.path.exists(FREGUESIAS_PATH) or not os.path.exists(BIOREGIOES_PATH):
        print(f"Erro: Ficheiros não encontrados em {FREGUESIAS_PATH} ou {BIOREGIOES_PATH}")
        return

    with open(FREGUESIAS_PATH, 'r', encoding='utf-8') as f:
        freguesias = json.load(f)
    
    with open(BIOREGIOES_PATH, 'r', encoding='utf-8') as f:
        bioregioes = json.load(f)

    # 1. Criar mapas de busca (por ID e por Título para garantir o match)
    mapa_por_id = {f['id'].split('-')[0]: f.get('biomas', {}) for f in freguesias}
    mapa_por_titulo = {f['titulo'].lower(): f.get('biomas', {}) for f in freguesias}

    atualizados = 0
    for bio in bioregioes:
        bio_id_base = bio.get('id', '').split('-')[0]
        bio_titulo = bio.get('titulo', '').lower()

        # 2. Tentar encontrar os dados de biodiversidade
        dados = mapa_por_id.get(bio_id_base) or mapa_por_id.get(bio.get('id')) or mapa_por_titulo.get(bio_titulo)

        if dados and 'fauna_comum' in dados:
            bio['biomas'] = bio.get('biomas', {})
            bio['biomas']['fauna_comum'] = dados['fauna_comum']
            atualizados += 1

    # 3. Gravar alterações
    with open(BIOREGIOES_PATH, 'w', encoding='utf-8') as f:
        json.dump(bioregioes, f, ensure_ascii=False, indent=2)

    print(f"Sucesso! {atualizados} biorregiões atualizadas no ficheiro mestre.")

if __name__ == "__main__":
    integrar_dados()

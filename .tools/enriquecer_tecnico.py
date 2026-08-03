import json

def enriquecer():
    path = 'data/especies_master.json'
    with open(path, 'r', encoding='utf-8') as f:
        master = json.load(f)

    # Dados Técnicos de Combate e Prevenção
    updates = {
        "mimosa": {
            "prevencao": "Evitar a perturbação do solo e a queima, que estimulam a germinação de milhares de sementes latentes.",
            "combate": "Descasque (ring barking) em árvores adultas durante o fluxo de seiva. Para plantas jovens, o arranque manual garantindo a remoção da raiz."
        },
        "aranhico-vermelho": {
            "prevencao": "Manter níveis de humidade relativa altos no coberto vegetal e evitar o excesso de adubação azotada.",
            "combate": "Introdução do ácaro predador Phytoseiulus persimilis ou aplicação de sabão potássico em focos iniciais."
        },
        "jacinto-de-agua": {
            "prevencao": "Controlo de nutrientes (azoto e fósforo) na água proveniente de escorrências agrícolas.",
            "combate": "Remoção mecânica imediata antes da floração. Em larga escala, controlo biológico com o gorgulho Neochetina eichhorniae."
        },
        "lince-iberico": {
            "prevencao": "Preservação do matagal mediterrânico denso e gestão de populações de coelho-bravo.",
            "combate": "Espécie protegida: Monitorização via GPS e corredores ecológicos para evitar atropelamentos."
        }
    }

    for id_esp, dados in updates.items():
        if id_esp in master:
            master[id_esp].update(dados)
            print(f"✓ {id_esp} enriquecida.")

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(master, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    enriquecer()

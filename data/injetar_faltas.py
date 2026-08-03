import json

def injetar_especies():
    master_path = 'data/especies_master.json'
    
    with open(master_path, 'r', encoding='utf-8') as f:
        master = json.load(f)

    novas = {
        "aranhico-vermelho": {
            "nome": "Aranhiço-vermelho",
            "nome_cientifico": "Tetranychus urticae",
            "grupo": "Sanidade Vegetal",
            "imagem": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/Tetranychus_urticae.jpg/800px-Tetranychus_urticae.jpg",
            "sintese": "Ácaro polífago que causa descoloração das folhas e teias finas. Ataca pomares e hortícolas sob stress hídrico.",
            "estatuto": "Praga Agrícola",
            "fonte": "bioCultura / DGAV"
        },
        "escolitideo-dos-pinheiros": {
            "nome": "Escolitídeo dos pinheiros",
            "nome_cientifico": "Tomicus piniperda",
            "grupo": "Sanidade Vegetal",
            "imagem": "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Tomicus_piniperda01.jpg/800px-Tomicus_piniperda01.jpg",
            "sintese": "Besouro perfurador que ataca o tronco e rebentos de pinheiros, podendo levar à morte da árvore em povoamentos fragilizados.",
            "estatuto": "Praga Florestal",
            "fonte": "bioCultura / ICNF"
        },
        "acacia-de-folhas-estreitas": {
            "nome": "Acácia-de-folhas-estreitas",
            "nome_cientifico": "Acacia retinodes",
            "grupo": "Flora Invasora",
            "imagem": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Acacia_retinodes_01.jpg/800px-Acacia_retinodes_01.jpg",
            "sintese": "Espécie invasora que compete com a flora nativa, alterando a composição do solo e o regime hídrico local.",
            "estatuto": "Invasora (Dec-Lei 92/2019)",
            "fonte": "bioCultura / ICNF"
        },
        "jacinto-de-agua": {
            "nome": "Jacinto-de-água",
            "nome_cientifico": "Eichhornia crassipes",
            "grupo": "Flora Invasora",
            "imagem": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Eichhornia_crassipes_3.jpg/800px-Eichhornia_crassipes_3.jpg",
            "sintese": "Uma das piores invasoras aquáticas do mundo. Bloqueia canais, reduz o oxigénio na água e destrói ecossistemas ribeirinhos.",
            "estatuto": "Invasora Preocupante",
            "fonte": "bioCultura / APA"
        },
        "pinheirinha-de-agua": {
            "nome": "Pinheirinha-de-água",
            "nome_cientifico": "Myriophyllum aquaticum",
            "grupo": "Flora Invasora",
            "imagem": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Myriophyllum_aquaticum_1.jpg/800px-Myriophyllum_aquaticum_1.jpg",
            "sintese": "Planta aquática que forma tapetes densos, impedindo a luz e a circulação de água em charcos e valas.",
            "estatuto": "Invasora Aquática",
            "fonte": "bioCultura / ICNF"
        },
        "acacia-bastarda": {
            "nome": "Acácia-bastarda",
            "nome_cientifico": "Robinia pseudoacacia",
            "grupo": "Flora Invasora",
            "imagem": "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Robinia_pseudoacacia_flowering.jpg/800px-Robinia_pseudoacacia_flowering.jpg",
            "sintese": "Árvore de crescimento rápido que invade terrenos agrícolas e florestais, fixando azoto em excesso e sufocando espécies nativas.",
            "estatuto": "Invasora Listada",
            "fonte": "bioCultura / ICNF"
        },
        "elodea": {
            "nome": "Elódea",
            "nome_cientifico": "Elodea canadensis",
            "grupo": "Flora Invasora",
            "imagem": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/77/Elodea_canadensis_2.jpg/800px-Elodea_canadensis_2.jpg",
            "sintese": "Planta aquática submersa que se propaga por fragmentação, alterando drasticamente a biodiversidade de ecossistemas lênticos.",
            "estatuto": "Invasora Aquática",
            "fonte": "bioCultura / ICNF"
        }
    }

    master.update(novas)

    with open(master_path, 'w', encoding='utf-8') as f:
        json.dump(master, f, ensure_ascii=False, indent=2)

    print(f"Sucesso! {len(novas)} espécies críticas injetadas no master.")

if __name__ == "__main__":
    injetar_especies()

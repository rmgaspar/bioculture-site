import json
import os

def enriquecer_ficheiros():
    caminho_pragas = 'data/pragas.json'
    caminho_flora = 'data/flora_invasora.json'

    # --- DADOS TÉCNICOS: PRAGAS ---
    dados_pragas = {
        "Bichado da Fruta": {
            "prevencao": "Instalação de abrigos para morcegos e aves insetívoras. Monitorização com armadilhas delta.",
            "combate": "Uso de feromonas para confusão sexual e aplicação do vírus da granulose (CpGV), específico para esta praga."
        },
        "Processionária do Pinheiro": {
            "prevencao": "Promoção de biodiversidade florestal (evitar monoculturas) e instalação de caixas-ninho para chapins.",
            "combate": "Remoção mecânica dos ninhos no inverno e uso de armadilhas de cinta com Bacillus thuringiensis na descida das lagartas."
        },
        "Aranhiço Vermelho": {
            "prevencao": "Manutenção do coberto vegetal para aumentar a humidade e evitar o stress hídrico das plantas.",
            "combate": "Largada de ácaros auxiliares (Phytoseiulus persimilis) e aplicação de extratos de urtiga ou sabão potássico."
        },
        "Nematodo da Madeira do Pinheiro": {
            "prevencao": "Controlo rigoroso do inseto vetor (Monochamus galloprovincialis) e eliminação de árvores enfraquecidas.",
            "combate": "Abate e destruição imediata de exemplares infetados. Não existe cura biológica direta após a infeção do lenho."
        },
        "Mosca Branca": {
            "prevencao": "Uso de redes mosquiteiras em estufas e plantação de calêndulas ou tagetes como repelentes.",
            "combate": "Introdução da vespa parasitoide Encarsia formosa e uso de armadilhas cromotrópicas amarelas."
        },
        "Pedrado da Macieira": {
            "prevencao": "Poda de arejamento rigorosa e remoção das folhas caídas no outono (onde o fungo inverna).",
            "combate": "Pulverização com caldas ricas em cobre (em doses baixas) ou extrato de cavalinha (Equisetum arvense)."
        },
        "Psila da Pereira": {
            "prevencao": "Equilíbrio da adubação azotada (evitar excessos que atraem o inseto) e preservação de sebes vivas.",
            "combate": "Promoção de antocorídeos (percevejos predadores) e lavagem da melada com sabão neutro."
        },
        "Escolitídeo dos Pinheiros": {
            "prevencao": "Gestão ativa do povoamento florestal, removendo material de corte e árvores tombadas.",
            "combate": "Instalação de armadilhas de agregação com feromonas e promoção de pica-paus."
        }
    }

    # --- DADOS TÉCNICOS: FLORA INVASORA ---
    dados_flora = {
        "Mimosa": {
            "prevencao": "Evitar a mobilização de terras em áreas próximas e não utilizar fogo, que estimula a germinação.",
            "combate": "Descasque circular (ring barking) em árvores adultas e arranque manual de plantas jovens com remoção total da raiz."
        },
        "Acácia-de-espigas": {
            "prevencao": "Monitorização de dunas e áreas costeiras. Manutenção da densidade de espécies nativas.",
            "combate": "Corte seguido de tratamento mecânico do cepo. Controlo biológico pontual com agentes específicos em estudo pelo ICNF."
        },
        "Acácia-de-folhas-estreitas": {
            "prevencao": "Controlo de clareiras em zonas florestais e jardins.",
            "combate": "Arranque manual e substituição imediata por espécies de crescimento rápido como o Carvalho ou o Sobreiro."
        },
        "Jacinto-de-água": {
            "prevencao": "Redução de nutrientes (eutrofização) nos cursos de água provenientes de descargas agrícolas.",
            "combate": "Remoção mecânica com barreiras físicas. Controlo biológico com o gorgulho Neochetina spp."
        },
        "Pinheirinha-de-água": {
            "prevencao": "Limpeza de equipamentos de pesca e barcos para evitar a propagação de fragmentos.",
            "combate": "Remoção manual cuidadosa e ensombramento das margens com vegetação ripícola nativa."
        },
        "Ailanto": {
            "prevencao": "Identificação precoce em áreas urbanas e margens de estradas.",
            "combate": "Corte repetido para esgotar as reservas da raiz ou descasque. Evitar cortes isolados que estimulam rebentação radicular."
        },
        "Haquea-picante": {
            "prevencao": "Vigilância após incêndios florestais, momento em que as sementes são libertadas massivamente.",
            "combate": "Corte das plantas antes da maturação dos frutos e queima controlada dos resíduos em local seguro."
        },
        "Baccharis": {
            "prevencao": "Manutenção da integridade de sapais e zonas húmidas.",
            "combate": "Arranque manual garantindo que não ficam fragmentos no solo húmido."
        },
        "Erva-das-pampas": {
            "prevencao": "Corte das inflorescências (plumas) antes da dispersão das sementes pelo vento.",
            "combate": "Arranque mecânico do torrão radicular. É fundamental remover a base da planta."
        },
        "Azedas": {
            "prevencao": "Evitar a importação de terras de jardim contaminadas com bolbilhos.",
            "combate": "Solarização do solo em pequenas áreas ou arranque manual persistente antes da formação de novos bolbilhos."
        },
        "Chora-das-praias": {
            "prevencao": "Proteção das dunas primárias e interdição do uso como planta ornamental.",
            "combate": "Arranque manual e inversão da planta sobre a areia para dessecação solar."
        },
        "Acácia-bastarda": {
            "prevencao": "Gestão de margens de linhas de água para evitar a colonização de solos aluvionares.",
            "combate": "Corte seletivo e promoção de ensombramento por galerias ripícolas de salgueiros e amieiros."
        },
        "Tintureira": {
            "prevencao": "Remoção de bagas antes da maturação para evitar a dispersão por aves.",
            "combate": "Arranque manual de toda a raiz tuberosa. O simples corte do caule não é eficaz."
        },
        "Elódea": {
            "prevencao": "Controlo de aquariofilia e despejos em águas públicas.",
            "combate": "Remoção manual com redes finas para não deixar fragmentos que regeneram novas plantas."
        }
    }

    # --- LÓGICA DE ATUALIZAÇÃO ---
    def update_file(path, tech_data):
        if os.path.exists(path):
            with open(path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            for item in data:
                nome = item.get('nome_comum')
                if nome in tech_data:
                    item['prevencao'] = tech_data[nome]['prevencao']
                    item['combate'] = tech_data[nome]['combate']
            
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"✓ {path} atualizado.")

    update_file(caminho_pragas, dados_pragas)
    update_file(caminho_flora, dados_flora)

if __name__ == "__main__":
    enriquecer_ficheiros()

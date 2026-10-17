#!/usr/bin/env python3
"""Blocos «fotografia + ligações» dos hubs Vida e recursos, Vetores de pressão e Soluções naturais.

Gera o HTML dos blocos (o mesmo molde do hub Conhecimento para cuidar), as fotografias (Wikimedia Commons, licença aberta)
em images/hubs/ e as entradas do dicionário EN. Uso: python3 scripts/hubs/blocos.py  (reescreve as secções nas três páginas).
As fotografias foram escolhidas à mão; o descarregamento usa as miniaturas de 1920 px da Commons.
"""
import html, json, re, subprocess, sys, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
IMG = ROOT / "images" / "hubs"
CACHE = Path(sys.argv[1]) if len(sys.argv) > 1 else None   # pasta com os .jpg já descarregados (opcional)

SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">%s</svg>'
ICO = {
    "pagina": '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    "grafico": '<path d="M4 20V5M4 20h16"/><path d="m7 15 4-5 3 3 5-7"/>',
    "mapa": '<path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/>',
    "calc": '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M12 12h2M16 12h0M8 16h2M12 16h2M16 16h0"/>',
    "livro": '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
    "ferramenta": '<path d="M14.5 6.5a4 4 0 0 0-5 5L4 17l3 3 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z"/>',
    "olho": '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    "folha": '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19c3-4 6-6 9-8"/>',
    "gota": '<path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11z"/>',
    "tempo": '<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
    "alerta": '<path d="M12 4 3 20h18z"/><path d="M12 10v4M12 17h0"/>',
}
LIC = {"CC BY-SA 2.0": "https://creativecommons.org/licenses/by-sa/2.0", "CC BY-SA 3.0": "https://creativecommons.org/licenses/by-sa/3.0",
       "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0", "CC BY 2.5": "https://creativecommons.org/licenses/by/2.5",
       "CC BY 3.0": "https://creativecommons.org/licenses/by/3.0", "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0",
       "CC BY 2.0": "https://creativecommons.org/licenses/by/2.0", "CC0": "https://creativecommons.org/publicdomain/zero/1.0", "Domínio público": None}

def foto(key, ficheiro, autor, lic, pt, en, alt_pt, alt_en, w=1000):
    return dict(key=key, ficheiro=ficheiro, autor=autor, lic=lic, pt=pt, en=en, alt_pt=alt_pt, alt_en=alt_en, w=w)

# ---------------------------------------------------------------- Vida e recursos
VIDA = [
 dict(id="agua", eyebrow=("Água", "Water"), h2=("Da chuva ao aquífero", "From rain to aquifer"),
  lead=("Disponibilidade, qualidade e desigualdade revelam a saúde de todo o sistema, da precipitação aos rios e aquíferos.", "Availability, quality and inequality reveal the health of the whole system, from rainfall to rivers and aquifers."),
  foto=foto("vida-agua", "Albufeira_do_Alqueva_-_Portugal_(48347214211).jpg", "Vitor Oliveira", "CC BY-SA 2.0", ("A albufeira do Alqueva.", "The Alqueva reservoir."), None, "Albufeira do Alqueva, com ilhas e uma ponte ao fundo", "The Alqueva reservoir, with islands and a bridge in the background"),
  rows=[("/recursos/agua.html", "Água", "Disponibilidade, qualidade e desigualdade, do mundo a Portugal.", "gota"),
        ("/recursos/agua.html#panorama-global", "Água potável segura e stress hídrico", "Dois indicadores cruzados desde 2000 (ODS 6.1.1 e 6.4.2), país a país.", "grafico"),
        ("/recursos/agua.html#aplicacao-pratica", "Biofossa e captação de chuva", "Esquemas, critérios de dimensionamento e notas técnicas, reunidos numa área própria.", "ferramenta"),
        ("/services/servicos.html?categoria=%C3%81gua%20e%20irriga%C3%A7%C3%A3o#catalogo-tecnicas", "Técnicas de água e rega", "O catálogo de técnicas de água e irrigação, uma a uma.", "livro")]),
 dict(id="ar", eyebrow=("Ar", "Air"), h2=("O ar que une lugares distantes", "The air that joins distant places"),
  lead=("Poluição, partículas, gases e clima cruzam fronteiras. O ar torna visíveis pressões que começam muito longe.", "Pollution, particles, gases and climate cross borders. Air makes visible pressures that start far away."),
  foto=foto("vida-ar", "Sky_Forest_Clouds.jpg", None, "CC0", ("Céu e floresta ao pôr do sol.", "Sky and forest at sunset."), None, "Pinhal contra um céu azul com nuvens finas, ao pôr do sol", "Pine forest against a blue sky with thin clouds, at sunset"),
  rows=[("/recursos/ar.html", "Ar", "Partículas, gases e clima: o que se respira e de onde vem.", "folha"),
        ("/recursos/ar.html#panorama-global", "Trinta anos de partículas finas", "A série de PM2,5 de 1990 a 2023 e a mortalidade atribuída à poluição do ar (ODS 3.9.1).", "grafico"),
        ("/recursos/ar.html#aplicacao-pratica", "Cobertura viva, ar mais limpo", "Árvores, sebes e sistemas perenes que reduzem poeiras e queimas.", "ferramenta"),
        ("/services/servicos.html?categoria=%C3%81rvores%20e%20sistemas%20perenes#catalogo-tecnicas", "Árvores e sistemas perenes", "As técnicas, uma a uma, no catálogo.", "livro")]),
 dict(id="solo", eyebrow=("Solo", "Soil"), h2=("A camada lenta de formar e rápida de perder", "The layer that is slow to form and quick to lose"),
  lead=("O solo guarda água, carbono, fertilidade e a memória das paisagens.", "Soil holds water, carbon, fertility and the memory of landscapes."),
  foto=foto("vida-solo", "Soil_Survey09_(39041768842).jpg", "USDA NRCS Montana", "Domínio público", ("Terra viva nas mãos.", "Living soil in the hands."), None, "Duas mãos a segurar terra escura e solta", "Two hands holding dark, loose soil"),
  rows=[("/recursos/solo.html", "Solo", "Cobertura, produtividade e carbono: como se perde e como se guarda.", "folha"),
        ("/recursos/solo.html#panorama-global", "Que proporção de terra está degradada", "O indicador ODS 15.3.1, com os períodos de 2015 e 2019.", "grafico"),
        ("/recursos/solo.html#aplicacao-pratica", "Cuidar do solo, passo a passo", "Guias de cobertura, compostagem e fertilidade, e insumos em estudo.", "ferramenta"),
        ("/services/servicos.html?categoria=Solo%20e%20cobertura#catalogo-tecnicas", "Técnicas de solo e cobertura", "O catálogo, uma técnica de cada vez.", "livro")]),
 dict(id="biodiversidade", eyebrow=("Biodiversidade", "Biodiversity"), h2=("Redes de vida, ligação a ligação", "Networks of life, link by link"),
  lead=("Genes, espécies e habitats formam redes de dependência. Perder uma ligação pode alterar muitas outras.", "Genes, species and habitats form networks of dependence. Losing one link can change many others."),
  foto=foto("vida-biodiversidade", "Halictus_bee_on_flower-2.jpg", "Alvesgaspar", "CC BY 2.5", ("Uma abelha numa flor.", "A bee on a flower."), None, "Abelha pousada no centro de uma flor laranja", "A bee resting at the centre of an orange flower"),
  rows=[("/ecossistemas/biodiversidade.html", "Biodiversidade", "Das espécies aos habitats, do mundo a Portugal e às ilhas.", "folha"),
        ("/ecossistemas/biodiversidade.html#panorama-global", "Índice da Lista Vermelha", "A série de 1993 a 2025 do risco de extinção global (ODS 15.5.1).", "grafico"),
        ("/ecossistemas/biodiversidade.html#catalogo", "Catálogo de espécies", "Pesquisa pelo nome comum ou científico, por grupo ou por estado.", "livro"),
        ("/ecossistemas/biodiversidade.html#aplicacao-pratica", "Cuidar sem desequilibrar", "Técnicas que reforçam habitat e soluções biológicas, quando a intervenção é mesmo necessária.", "ferramenta")]),
]

# ---------------------------------------------------------------- Vetores de pressão
VETORES = [
 dict(id="renovaveis", eyebrow=("Implantação", "Deployment"), h2=("A transição também ocupa território", "The transition also takes up land"),
  lead=("A transição é necessária, mas cada projeto ocupa solo, cruza habitats e altera relações locais.", "The transition is necessary, but every project takes up land, crosses habitats and changes local relationships."),
  foto=foto("vetor-renovaveis", "Paineis_solares_-_Bensafrim,_Lagos,_Algarve_-_Portugal_-_29.03.2023.jpg", "Bextrel", "CC BY-SA 4.0", ("Central solar em Bensafrim, Lagos.", "Solar plant in Bensafrim, Lagos."), None, "Vista aérea de uma grande central de painéis solares no Algarve", "Aerial view of a large solar panel plant in the Algarve"),
  rows=[("/energia/transicao-etica.html", "Renováveis e território", "Parques solares e eólicos: o que ocupam, o que cruzam e o que muda.", "pagina"),
        ("/energia/transicao-etica.html#casos-documentados", "Parque Solar Escalabis", "189 MWp e 568 ha de floresta: um caso documentado, com fontes.", "alerta"),
        ("/energia/transicao-etica.html#consultas", "Consultas públicas verificadas", "Um instantâneo do Participa.pt; abre sempre a ficha original.", "tempo"),
        ("/energia/transicao-etica.html#instalacoes", "Grandes instalações", "Exemplos operacionais, sem pretender ser o inventário nacional.", "mapa")]),
 dict(id="digital", eyebrow=("Infraestrutura", "Infrastructure"), h2=("A nuvem tem chão, água e eletricidade", "The cloud has ground, water and electricity"),
  lead=("A nuvem depende de edifícios, chips, redes, eletricidade, água e sistemas de refrigeração.", "The cloud depends on buildings, chips, networks, electricity, water and cooling systems."),
  foto=foto("vetor-digital", "BalticServers_data_center.jpg", "BalticServers.com", "CC BY-SA 3.0", ("Bastidores de servidores num centro de dados.", "Server racks in a data centre."), None, "Bastidores de servidores iluminados a azul num centro de dados", "Server racks lit in blue in a data centre"),
  rows=[("/energia/digital.html", "Impacto digital e IA", "O que há por trás de cada resposta, vídeo ou ficheiro.", "pagina"),
        ("/energia/digital.html#panorama-global", "O consumo dos centros de dados, 2020–2030", "A procura elétrica cresce mais depressa do que a restante procura mundial.", "grafico"),
        ("/energia/digital.html#leitura-local", "Quatro camadas por trás de cada serviço", "A infraestrutura local e global que uma resposta percorre.", "livro"),
        ("/energia/digital.html#casos", "O que é operacional e o que é futuro", "Cartões com as incertezas e as fontes do inventário.", "mapa")]),
 dict(id="mineracao", eyebrow=("Extração", "Extraction"), h2=("O que fica depois da cava", "What is left after the pit"),
  lead=("Da cava aos rejeitados, a pressão percorre água, energia, biodiversidade e décadas de recuperação.", "From the pit to the tailings, the pressure runs through water, energy, biodiversity and decades of recovery."),
  foto=foto("vetor-mineracao", "Nas_pedreiras_de_Estremoz_-_panoramio_(3).jpg", "MarcoMileu", "CC BY-SA 3.0", ("Uma pedreira em Estremoz, com água no fundo.", "A quarry in Estremoz, with water at the bottom."), None, "Pedreira de mármore em Estremoz com um lago no fundo da cava", "Marble quarry in Estremoz with a lake at the bottom of the pit"),
  rows=[("/energia/mineracao.html", "Mineração", "Direitos mineiros, minas e minerais, do mundo a Portugal.", "pagina"),
        ("/energia/mineracao.html#panorama-global", "No mundo", "A produção anual dá escala, mas não mede o impacto.", "grafico"),
        ("/energia/mineracao.html#leitura-local", "Um direito mineiro não é uma mina em atividade", "O que distingue a decisão administrativa da realidade operacional.", "livro"),
        ("/energia/mineracao.html#casos", "Estado, minerais e questões por responder", "Filtra por fase; cada cartão separa riscos, lacunas e fontes.", "mapa")]),
 dict(id="pecuaria", eyebrow=("Escala produtiva", "Scale of production"), h2=("Uma pressão que atravessa toda a cadeia", "A pressure that runs through the whole chain"),
  lead=("Animais, alimentação, água, metano, uso do solo e cadeias globais formam uma pressão sistémica.", "Animals, feed, water, methane, land use and global chains add up to a systemic pressure."),
  foto=foto("vetor-pecuaria", "Cattle_feedlot_south_of_Portales,_New_Mexico.jpg", "Quintin Soloviev", "CC BY 4.0", ("Um parque de engorda de gado, visto de cima.", "A cattle feedlot seen from above."), None, "Gado num grande parque de engorda de terra batida", "Cattle in a large dirt feedlot"),
  rows=[("/energia/pecuaria.html", "Pecuária industrial", "Emissões, efluentes e uso do solo, do mundo a Portugal.", "pagina"),
        ("/energia/pecuaria.html#panorama-global", "No mundo", "Metano entérico, estrume, alimento, energia e mudança de uso do solo.", "grafico"),
        ("/energia/pecuaria.html#leitura-local", "Não é apenas o edifício", "A cadeia inteira: alimento, alojamento, efluentes, transporte e destino final.", "livro"),
        ("/energia/pecuaria.html#instalacoes", "Ler cada caso com o seu contexto", "Capacidade, pressões e medidas, só quando documentadas.", "mapa")]),
 dict(id="aviacao", eyebrow=("Mobilidade", "Mobility"), h2=("Quanto pesa uma viagem de avião", "How much a flight weighs"),
  lead=("Quanto CO₂ cabe numa viagem de avião? Rotas de todo o mundo, fatores oficiais e o transporte aéreo português em 30 anos.", "How much CO₂ fits in a flight? Routes from all over the world, official factors and Portuguese air transport over 30 years."),
  foto=foto("vetor-aviacao", "Airliner_Contrail.jpg", "Noah Wulf", "CC BY-SA 4.0", ("O rasto de um avião num céu limpo.", "An aircraft’s trail in a clear sky."), None, "Rasto branco de um avião num céu azul sem nuvens", "White trail of an aircraft in a cloudless blue sky"),
  rows=[("/energia/aviacao.html", "Aviação", "Não é só carbono: combustível, óxidos de azoto e ruído.", "pagina"),
        ("/energia/aviacao.html#calcular", "A tua viagem", "Calcula o CO₂ de uma rota, com fatores oficiais.", "calc"),
        ("/energia/aviacao.html#portugal", "Portugal", "O transporte aéreo português em 30 anos.", "grafico"),
        ("/energia/aviacao.html#limites", "Limites", "O que a página mede e o que deixa de fora.", "olho")]),
 dict(id="construido", eyebrow=("Materiais", "Materials"), h2=("O carbono que está nas paredes", "The carbon in the walls"),
  lead=("Quanto carbono tem um material de construção? Fatores oficiais, o que muda ao reutilizar e a construção em Portugal.", "How much carbon does a building material hold? Official factors, what changes when you reuse it, and construction in Portugal."),
  foto=foto("vetor-construido", "Exshaw_Cement_Plant_(18880492940).jpg", "Jason Woodhead", "CC BY 2.0", ("Uma fábrica de cimento.", "A cement plant."), None, "Fábrica de cimento com torres e gruas, em frente a uma montanha", "Cement plant with towers and cranes in front of a mountain"),
  rows=[("/energia/ambiente-construido.html", "Ambiente construído", "Materiais, reutilização e construção em Portugal.", "pagina"),
        ("/energia/ambiente-construido.html#calcular", "Materiais", "Quanto carbono tem cada material, com fatores oficiais.", "calc"),
        ("/energia/ambiente-construido.html#materiais", "Comparar", "O que muda ao reutilizar em vez de produzir de novo.", "grafico"),
        ("/energia/ambiente-construido.html#portugal", "Portugal", "A construção em Portugal.", "mapa")]),
 dict(id="moda", eyebrow=("Consumo", "Consumption"), h2=("O carbono que cabe na roupa", "The carbon in clothes"),
  lead=("Quanto carbono cabe na roupa que compras? Fatores oficiais, reutilização e a indústria têxtil em Portugal.", "How much carbon is in the clothes you buy? Official factors, reuse and the textile industry in Portugal."),
  foto=foto("vetor-moda", "Rolls_of_fabric_of_multiple_colors_(181099191).jpg", "Daniel Aufgang", "CC BY 3.0", ("Rolos de tecido de várias cores.", "Rolls of fabric in many colours."), None, "Rolos de tecido de muitas cores numa banca de mercado", "Rolls of fabric in many colours at a market stall"),
  rows=[("/energia/moda-texteis.html", "Moda e têxteis", "Materiais, reutilização e a indústria têxtil em Portugal.", "pagina"),
        ("/energia/moda-texteis.html#calcular", "A tua roupa", "Quanto carbono cabe na roupa que compras.", "calc"),
        ("/energia/moda-texteis.html#materiais", "Comparar", "Fatores oficiais por material e o que muda ao reutilizar.", "grafico"),
        ("/energia/moda-texteis.html#portugal", "Portugal", "A indústria têxtil em Portugal.", "mapa")]),
]

# ---------------------------------------------------------------- Soluções naturais (usa data-en em vez do dicionário)
SOLUCOES = [
 dict(id="produtos", eyebrow=("Produtos", "Products"), h2=("O que pode ajudar a cuidar do lugar", "What can help care for a place"),
  lead=("Explora as famílias de produtos e práticas que estamos a estudar: fertilidade, bioestimulantes, microrganismos e proteção das culturas. Catálogo em preparação, sem venda nesta fase.", "Explore the product families and practices we are studying: fertility, biostimulants, microorganisms and crop protection. Catalogue in preparation, no sales at this stage."),
  foto=foto("sol-produtos", "Maintaining_a_5_gallon_vermicompost_bucket_that_is_buried_in_a_plot_at_the_Garfield_Neighborhood_Garden_in_Phoenix,_Arizona.jpg", "Matthew.kowal", "CC BY 4.0", ("Mãos a revolver vermicomposto, num jardim comunitário em Phoenix.", "Hands turning vermicompost in a community garden in Phoenix."), None, "Mãos a segurar vermicomposto escuro dentro de um balde enterrado na horta", "Hands holding dark vermicompost inside a bucket buried in the garden"),
  rows=[("/services/produtos.html", "Explorar produtos", "As famílias de produtos e práticas em estudo.", "pagina"),
        ("/services/servicos.html?categoria=Planeamento%20e%20fertilidade#catalogo-tecnicas", "Planeamento e fertilidade", "As técnicas de fertilidade do solo, uma a uma.", "folha"),
        ("/calendario/conhecimento-cuidar.html#problemas", "Problemas na horta", "Respostas curtas por sintoma, antes de escolher um produto.", "olho")]),
 dict(id="tecnicas", eyebrow=("Técnicas", "Techniques"), h2=("Do contexto à solução adequada", "From context to a suitable solution"),
  lead=("Conhece as áreas de água, energia e solo, os guias de apoio e as ferramentas para preparar o teu projeto.", "Discover water, energy and soil support areas, practical guides and tools to prepare your project."),
  foto=foto("sol-tecnicas", "Compost_bins_in_Brighthelm_Garden_2023-06-16.jpg", "Andy Li", "CC0", ("Compostores num jardim comunitário.", "Compost bins in a community garden."), None, "Fila de compostores de madeira num jardim, junto a sabugueiros", "A row of wooden compost bins in a garden, beside elder bushes"),
  rows=[("/services/servicos.html", "Explorar técnicas", "Água, energia e solo: guias de apoio e ferramentas.", "livro"),
        ("/services/servicos.html#biofossa", "Uma biofossa, passo a passo", "Separar sólidos, tratar o efluente e devolver água ao ciclo.", "gota"),
        ("/services/servicos.html#compostagem", "O ciclo completo da compostagem", "Do resíduo orgânico ao húmus, com as fases e os materiais.", "folha"),
        ("/calendario/planeador-horta.html", "Planeador de horta", "As épocas de cada cultura e a rotação por canteiro.", "calc")]),
 dict(id="problema", eyebrow=("Começar pelo problema", "Start with the problem"), h2=("Observar. Prevenir. Só depois intervir.", "Observe. Prevent. Then intervene."),
  lead=("As fichas de pragas e invasoras ajudam a reconhecer o problema e a avaliar as medidas antes de escolher um produto.", "Pest and invasive species guides help identify problems and assess measures before choosing a product."),
  foto=foto("sol-problema", "Ladybird_and_aphids.JPG", "Alehandra13", "CC BY-SA 4.0", ("Uma joaninha entre pulgões: o controlo biológico em ação.", "A ladybird among aphids: biological control at work."), None, "Joaninha vermelha num rebento coberto de pulgões", "A red ladybird on a shoot covered in aphids"),
  rows=[("/calendario/calendario.html#pragas-catalogo", "Pragas e invasoras", "O catálogo do que ataca a horta e do que a invade.", "olho"),
        ("/calendario/conhecimento-cuidar.html#problemas", "O que se passa na tua horta?", "Respostas curtas por sintoma.", "alerta")]),
]

EN_ROWS = {  # PT -> EN das linhas (títulos e descrições)
 "Água":"Water","Disponibilidade, qualidade e desigualdade, do mundo a Portugal.":"Availability, quality and inequality, from the world to Portugal.",
 "Água potável segura e stress hídrico":"Safe drinking water and water stress","Dois indicadores cruzados desde 2000 (ODS 6.1.1 e 6.4.2), país a país.":"Two indicators crossed since 2000 (SDG 6.1.1 and 6.4.2), country by country.",
 "Biofossa e captação de chuva":"Biofossa and rainwater harvesting","Esquemas, critérios de dimensionamento e notas técnicas, reunidos numa área própria.":"Diagrams, sizing criteria and technical notes, gathered in a section of their own.",
 "Técnicas de água e rega":"Water and irrigation techniques","O catálogo de técnicas de água e irrigação, uma a uma.":"The catalogue of water and irrigation techniques, one by one.",
 "Ar":"Air","Partículas, gases e clima: o que se respira e de onde vem.":"Particles, gases and climate: what we breathe and where it comes from.",
 "Trinta anos de partículas finas":"Thirty years of fine particles","A série de PM2,5 de 1990 a 2023 e a mortalidade atribuída à poluição do ar (ODS 3.9.1).":"The PM2.5 series from 1990 to 2023 and the deaths attributed to air pollution (SDG 3.9.1).",
 "Cobertura viva, ar mais limpo":"Living cover, cleaner air","Árvores, sebes e sistemas perenes que reduzem poeiras e queimas.":"Trees, hedges and perennial systems that reduce dust and burning.",
 "Árvores e sistemas perenes":"Trees and perennial systems","As técnicas, uma a uma, no catálogo.":"The techniques, one by one, in the catalogue.",
 "Solo":"Soil","Cobertura, produtividade e carbono: como se perde e como se guarda.":"Cover, productivity and carbon: how it is lost and how it is kept.",
 "Que proporção de terra está degradada":"What share of land is degraded","O indicador ODS 15.3.1, com os períodos de 2015 e 2019.":"The SDG 15.3.1 indicator, for the periods 2015 and 2019.",
 "Cuidar do solo, passo a passo":"Caring for soil, step by step","Guias de cobertura, compostagem e fertilidade, e insumos em estudo.":"Guides on cover, composting and fertility, and inputs under study.",
 "Técnicas de solo e cobertura":"Soil and cover techniques","O catálogo, uma técnica de cada vez.":"The catalogue, one technique at a time.",
 "Biodiversidade":"Biodiversity","Das espécies aos habitats, do mundo a Portugal e às ilhas.":"From species to habitats, from the world to Portugal and the islands.",
 "Índice da Lista Vermelha":"Red List Index","A série de 1993 a 2025 do risco de extinção global (ODS 15.5.1).":"The 1993–2025 series of global extinction risk (SDG 15.5.1).",
 "Catálogo de espécies":"Species catalogue","Pesquisa pelo nome comum ou científico, por grupo ou por estado.":"Search by common or scientific name, by group or by status.",
 "Cuidar sem desequilibrar":"Caring without unbalancing","Técnicas que reforçam habitat e soluções biológicas, quando a intervenção é mesmo necessária.":"Techniques that strengthen habitat and biological solutions, when intervention is really needed.",
 "Renováveis e território":"Renewables and territory","Parques solares e eólicos: o que ocupam, o que cruzam e o que muda.":"Solar and wind farms: what they take up, what they cross and what changes.",
 "Parque Solar Escalabis":"Escalabis Solar Park","189 MWp e 568 ha de floresta: um caso documentado, com fontes.":"189 MWp and 568 ha of forest: a documented case, with sources.",
 "Consultas públicas verificadas":"Verified public consultations","Um instantâneo do Participa.pt; abre sempre a ficha original.":"A snapshot of Participa.pt; always open the original record.",
 "Grandes instalações":"Large installations","Exemplos operacionais, sem pretender ser o inventário nacional.":"Operating examples, not meant as the national inventory.",
 "Impacto digital e IA":"Digital impact and AI","O que há por trás de cada resposta, vídeo ou ficheiro.":"What lies behind every answer, video or file.",
 "O consumo dos centros de dados, 2020–2030":"Data centre consumption, 2020–2030","A procura elétrica cresce mais depressa do que a restante procura mundial.":"Electricity demand is growing faster than the rest of world demand.",
 "Quatro camadas por trás de cada serviço":"Four layers behind every service","A infraestrutura local e global que uma resposta percorre.":"The local and global infrastructure an answer travels through.",
 "O que é operacional e o que é futuro":"What is operating and what is still future","Cartões com as incertezas e as fontes do inventário.":"Cards with the uncertainties and sources of the inventory.",
 "Mineração":"Mining","Direitos mineiros, minas e minerais, do mundo a Portugal.":"Mining rights, mines and minerals, from the world to Portugal.",
 "No mundo":"Worldwide","A produção anual dá escala, mas não mede o impacto.":"Annual output gives scale, but does not measure impact.",
 "Um direito mineiro não é uma mina em atividade":"A mining right is not a mine in operation","O que distingue a decisão administrativa da realidade operacional.":"What sets the administrative decision apart from operational reality.",
 "Estado, minerais e questões por responder":"Status, minerals and open questions","Filtra por fase; cada cartão separa riscos, lacunas e fontes.":"Filter by phase; each card separates risks, gaps and sources.",
 "Pecuária industrial":"Industrial livestock","Emissões, efluentes e uso do solo, do mundo a Portugal.":"Emissions, effluents and land use, from the world to Portugal.",
 "Metano entérico, estrume, alimento, energia e mudança de uso do solo.":"Enteric methane, manure, feed, energy and land-use change.",
 "Não é apenas o edifício":"It is not just the building","A cadeia inteira: alimento, alojamento, efluentes, transporte e destino final.":"The whole chain: feed, housing, effluents, transport and final destination.",
 "Ler cada caso com o seu contexto":"Reading each case in context","Capacidade, pressões e medidas, só quando documentadas.":"Capacity, pressures and measures, only when documented.",
 "Aviação":"Aviation","Não é só carbono: combustível, óxidos de azoto e ruído.":"Not only carbon: fuel, nitrogen oxides and noise.",
 "A tua viagem":"Your trip","Calcula o CO₂ de uma rota, com fatores oficiais.":"Work out the CO₂ of a route, with official factors.",
 "Portugal":"Portugal","O transporte aéreo português em 30 anos.":"Portuguese air transport over 30 years.",
 "Limites":"Limits","O que a página mede e o que deixa de fora.":"What the page measures and what it leaves out.",
 "Ambiente construído":"Built environment","Materiais, reutilização e construção em Portugal.":"Materials, reuse and construction in Portugal.",
 "Materiais":"Materials","Quanto carbono tem cada material, com fatores oficiais.":"How much carbon each material holds, with official factors.",
 "Comparar":"Compare","O que muda ao reutilizar em vez de produzir de novo.":"What changes when you reuse instead of producing anew.",
 "A construção em Portugal.":"Construction in Portugal.",
 "Moda e têxteis":"Fashion and textiles","Materiais, reutilização e a indústria têxtil em Portugal.":"Materials, reuse and the textile industry in Portugal.",
 "A tua roupa":"Your clothes","Quanto carbono cabe na roupa que compras.":"How much carbon is in the clothes you buy.",
 "Fatores oficiais por material e o que muda ao reutilizar.":"Official factors by material and what changes when you reuse.",
 "A indústria têxtil em Portugal.":"The textile industry in Portugal.",
 "Explorar produtos":"Explore products","As famílias de produtos e práticas em estudo.":"The product families and practices under study.",
 "Planeamento e fertilidade":"Planning and fertility","As técnicas de fertilidade do solo, uma a uma.":"The soil-fertility techniques, one by one.",
 "Problemas na horta":"Garden problems","Respostas curtas por sintoma, antes de escolher um produto.":"Short answers by symptom, before choosing a product.",
 "Explorar técnicas":"Explore techniques","Água, energia e solo: guias de apoio e ferramentas.":"Water, energy and soil: support guides and tools.",
 "Uma biofossa, passo a passo":"A biofossa, step by step","Separar sólidos, tratar o efluente e devolver água ao ciclo.":"Separate solids, treat the effluent and return water to the cycle.",
 "O ciclo completo da compostagem":"The full composting cycle","Do resíduo orgânico ao húmus, com as fases e os materiais.":"From organic waste to humus, with the stages and materials.",
 "Planeador de horta":"Garden planner","As épocas de cada cultura e a rotação por canteiro.":"The seasons of each crop and the rotation by bed.",
 "Pragas e invasoras":"Pests and invasive species","O catálogo do que ataca a horta e do que a invade.":"The catalogue of what attacks the garden and what invades it.",
 "O que se passa na tua horta?":"What is going on in your garden?","Respostas curtas por sintoma.":"Short answers by symptom.",
}

# ---------------------------------------------------------------- geração
def esc(s): return html.escape(s, quote=True)

def tr_en(pt):
    return EN_ROWS.get(pt)

def fig(f, en_attr=False):
    """<figure> com crédito; en_attr=True escreve data-en (páginas sem dicionário)."""
    ficha = "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(f["ficheiro"].replace(" ", "_"), safe="(),_-.!~*'")
    lic = f["lic"]; url = LIC.get(lic)
    lic_html = f'<a href="{url}" target="_blank" rel="noopener">{lic}</a>' if url else lic
    autor = f["autor"]
    credito = (f"Foto: {esc(autor)} · " if autor else "Foto: ") + f'{lic_html} · <a href="{ficha}" target="_blank" rel="noopener">Wikimedia Commons</a>'
    credito_en = credito.replace("Foto:", "Photo:", 1)
    cap_en = f["en"] if isinstance(f["en"], str) else f["pt"][1]
    cap_pt = f["pt"][0]; cap_en = f["pt"][1]
    alt_pt, alt_en = f["alt_pt"], f["alt_en"]
    if en_attr:
        return f'''                            <figure class="hub-tools-foto" data-no-signature>
                                <img src="/images/hubs/{f["key"]}.webp" width="{f["w"]}" height="{f["h"]}" loading="lazy" alt="{esc(alt_pt)}" data-en-alt="{esc(alt_en)}" />
                                <figcaption><span data-en="{esc(cap_en)}">{esc(cap_pt)}</span>
                                    <span data-en="{esc(credito_en)}">{credito}</span>
                                </figcaption>
                            </figure>
'''
    return f'''                            <figure class="hub-tools-foto" data-no-signature>
                                <img src="/images/hubs/{f["key"]}.webp" width="{f["w"]}" height="{f["h"]}" loading="lazy" alt="{esc(alt_pt)}" />
                                <figcaption>
                                    {esc(cap_pt)}
                                    <span>{credito}</span>
                                </figcaption>
                            </figure>
'''

def linha(href, tit, desc, ico, en_attr=False):
    en = tr_en(tit), tr_en(desc)
    assert all(en), f"falta EN: {tit!r} / {desc!r}"
    if en_attr:
        t = f'<strong data-en="{esc(en[0])}">{esc(tit)}</strong><small data-en="{esc(en[1])}">{esc(desc)}</small>'
    else:
        t = f"<strong>{esc(tit)}</strong><small>{esc(desc)}</small>"
    return f'''                                <li>
                                    <a href="{href}">
                                        <span class="hub-tools-ico">{SVG % ICO[ico]}</span>
                                        <span class="hub-tools-txt">{t}</span>
                                        <span class="hub-tools-seta" aria-hidden="true">→</span>
                                    </a>
                                </li>
'''

def bloco(b, i, en_attr=False):
    inv = i % 2 == 1
    ey, h2, lead = b["eyebrow"], b["h2"], b["lead"]
    if en_attr:
        cab = f'''<span class="eyebrow" data-en="{esc(ey[1])}">{esc(ey[0])}</span>
                            <h2 data-en="{esc(h2[1])}">{esc(h2[0])}</h2>
                            <p class="hub-tools-lead" data-en="{esc(lead[1])}">{esc(lead[0])}</p>'''
    else:
        cab = f'''<span class="eyebrow">{esc(ey[0])}</span>
                            <h2>{esc(h2[0])}</h2>
                            <p class="hub-tools-lead">
                                {esc(lead[0])}
                            </p>'''
    return f'''                    <section class="hub-section" id="{b["id"]}">
                        <div class="hub-section-head">
                            {cab}
                        </div>
                        <div class="hub-tools-grid{" hub-tools-grid--inv" if inv else ""}">
{fig(b["foto"], en_attr)}                            <ul class="hub-tools-lista">
{"".join(linha(*r, en_attr=en_attr) for r in b["rows"])}                            </ul>
                        </div>
                    </section>
'''

NAV_VIDA = [("agua", "Água", "Water"), ("ar", "Ar", "Air"), ("solo", "Solo", "Soil"), ("biodiversidade", "Biodiversidade", "Biodiversity"), ("atualidade", "Atualidade", None)]
NAV_VETORES = [("renovaveis", "Renováveis", "Renewables"), ("digital", "Digital", "Digital"), ("mineracao", "Mineração", "Mining"), ("pecuaria", "Pecuária", "Livestock"),
               ("aviacao", "Aviação", "Aviation"), ("construido", "Construção", "Construction"), ("moda", "Moda", "Fashion"), ("atualidade", "Atualidade", None)]
NAV_SOLUCOES = [("produtos", "Produtos", "Products"), ("tecnicas", "Técnicas", "Techniques"), ("problema", "Problemas", "Problems")]

def barra(pagina, itens, en_attr=False):
    """Barra fixa «Nesta página» (a mesma do hub Conhecimento para cuidar), antes do primeiro bloco; idempotente."""
    p = ROOT / pagina; t = p.read_text(encoding="utf-8")
    t = re.sub(r'\n *<nav aria-label="Nesta página" class="reading-nav">.*?</nav>', "", t, flags=re.S)
    if en_attr:
        links = "".join(f'<a href="#{i}" data-en="{esc(en)} ↓">{esc(pt)} ↓</a>' for i, pt, en in itens)
        nav = f'<nav aria-label="Nesta página" class="reading-nav"><a class="hub-back" id="hub-voltar" href="/" data-en="← Back">← Voltar</a>{links}</nav>'
    else:
        links = "".join(f'<a href="#{i}">{esc(pt)} ↓</a>' for i, pt, en in itens)
        nav = f'<nav aria-label="Nesta página" class="reading-nav"><a class="hub-back" id="hub-voltar" href="/">← Voltar</a>{links}</nav>'
    k = t.index('<section class="hub-section"')
    t = t[:k] + nav + "\n                    " + t[k:]
    t = t.replace('<section aria-labelledby="hub-latest-title" class="hub-latest">', '<section aria-labelledby="hub-latest-title" class="hub-latest" id="atualidade">')
    if "biocultura-sticky-nav.js" not in t:
        t = re.sub(r'(\n\s*<script src="/assets/js/pages/(?:hub-pages|solutions-hub)\.js\?v=\d+"></script>)', r'\1\n        <script src="/assets/js/biocultura-sticky-nav.js?v=17"></script>', t, count=1)
    p.write_text(t, encoding="utf-8")

def dicionario_nav(*listas):
    p = ROOT / "assets/lang/auto/en.json"; d = json.loads(p.read_text(encoding="utf-8"))
    for itens in listas:
        for i, pt, en in itens:
            if en: d.setdefault(f"{pt} ↓", f"{en} ↓")
    p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

def fotos(blocos):
    IMG.mkdir(parents=True, exist_ok=True)
    for b in blocos:
        f = b["foto"]; dest = IMG / (f["key"] + ".webp")
        if not dest.exists():
            src = None
            if CACHE:  # procura o .jpg descarregado pelo nome do ficheiro
                for p in CACHE.glob("*.jpg"):
                    pass
            raise SystemExit(f"falta {dest}: converter a fotografia {f['ficheiro']} para esse ficheiro")
        out = subprocess.run(["magick", "identify", "-format", "%wx%h", str(dest)], capture_output=True, text=True).stdout
        f["w"], f["h"] = map(int, out.split("x"))

def substituir(pagina, inicio, fim, novo, cabecalho=True):
    p = ROOT / pagina; t = p.read_text(encoding="utf-8")
    if inicio not in t:
        print(f"{pagina}: blocos já aplicados, nada a substituir"); return
    a = t.index(inicio); b = t.index(fim, a)
    t = t[:a] + novo + "\n" + " " * 20 + t[b:]
    if cabecalho and "hub-blocos.css" not in t:
        t = re.sub(r'(\n\s*<link[^>]*biocultura-alignment\.css[^>]*>)', r'\n        <link href="/assets/css/components/hub-blocos.css?v=1" rel="stylesheet" />\1', t, count=1)
    p.write_text(t, encoding="utf-8")

def dicionario(blocos):
    p = ROOT / "assets/lang/auto/en.json"; d = json.loads(p.read_text(encoding="utf-8")); novos = 0
    def add(pt, en):
        nonlocal novos
        if pt not in d: d[pt] = en; novos += 1
    for b in blocos:
        add(b["eyebrow"][0], b["eyebrow"][1]); add(b["h2"][0], b["h2"][1]); add(b["lead"][0], b["lead"][1])
        f = b["foto"]; add(f["pt"][0], f["pt"][1]); add(f["alt_pt"], f["alt_en"])
        if f["autor"] and LIC.get(f["lic"]) is None: add(f"Foto: {f['autor']} · {f['lic']} ·", f"Photo: {f['autor']} · Public domain ·")
        elif f["autor"]: add(f"Foto: {f['autor']} ·", f"Photo: {f['autor']} ·")
        else: add("Foto:", "Photo:")
        for href, t, desc, ic in b["rows"]: add(t, EN_ROWS[t]); add(desc, EN_ROWS[desc])
    add("Foto: Wikimedia Commons", "Photo: Wikimedia Commons")
    p.write_text(json.dumps(d, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return novos

if __name__ == "__main__":
    for lista in (VIDA, VETORES, SOLUCOES): fotos(lista)
    # Vida e recursos
    n = "".join(bloco(b, i) for i, b in enumerate(VIDA))
    substituir("recursos/vida-e-recursos.html", '<section aria-labelledby="systems-title" class="hub-section">', '<section aria-labelledby="hub-latest-title" class="hub-latest">', n.rstrip("\n"))
    # Vetores de pressão
    n = "".join(bloco(b, i) for i, b in enumerate(VETORES))
    substituir("observatorio/pressoes-humanas.html", '<section class="hub-section">', '<section aria-labelledby="hub-latest-title" class="hub-latest">', n.rstrip("\n"))
    # Soluções naturais
    n = "".join(bloco(b, i, en_attr=True) for i, b in enumerate(SOLUCOES))
    substituir("services/services.html", '<section class="hub-grid hub-paths" aria-label="Explorar soluções">', '<footer class="footer footer-wordmark">', n.rstrip("\n"))
    print("dicionário: +", dicionario(VIDA + VETORES))
    barra("recursos/vida-e-recursos.html", NAV_VIDA); barra("observatorio/pressoes-humanas.html", NAV_VETORES); barra("services/services.html", NAV_SOLUCOES, en_attr=True)
    dicionario_nav(NAV_VIDA, NAV_VETORES)

#!/usr/bin/env python3
"""Bloco «Biofossa» da página Técnicas (services/servicos.html), revisto com fontes oficiais.
Reescreve a secção #biofossa e acrescenta as entradas EN ao dicionário. Fontes verificadas a 2026-10-18:
ERSAR Caderno 5 (2017), apresentação da APA (EMAS, 2017), Decreto-Lei 194/2009 (arts. 59.º e 72.º), Decreto-Lei 226-A/2007 (art. 48.º)."""
import html, json, re
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
e = html.escape
P = {}  # PT -> EN
def t(pt, en): P[pt] = en; return e(pt)

def li(pt, en): return f"<li>{t(pt, en)}</li>"
resumo = [
 ("Se a rede pública de saneamento estiver a 20 m ou menos do limite do terreno, ligar é obrigatório: a fossa deixa de ser uma opção.", "If the public sewer is 20 m or less from the edge of your plot, connecting is mandatory: a septic tank is no longer an option."),
 ("Sem rede, há dois caminhos: a fossa estanque, que só armazena, e a fossa com tratamento complementar, que lança o efluente no solo e pede parecer ou licença da APA.", "Without a sewer there are two paths: the sealed tank, which only stores, and the tank with complementary treatment, which discharges effluent to the soil and needs an opinion or licence from APA."),
 ("Em qualquer das duas, a limpeza é feita pela Câmara ou por quem ela autorizar, e paga-se tarifa de saneamento mesmo sem ligação à rede.", "In either case, cleaning is done by the municipality or whoever it authorises, and a sanitation tariff is paid even without a sewer connection."),
]
casos = [
 ("Caso 1", "Há rede a 20 m ou menos", "Ligar à rede", "A ligação é obrigatória. A fossa existente é desativada: desligada, totalmente esvaziada, desinfetada e aterrada. Quem não liga arrisca uma coima de 1 500 a 3 740 € (pessoa singular).",
  "Case 1", "There is a sewer within 20 m", "Connect to the sewer", "Connecting is mandatory. An existing tank is decommissioned: disconnected, fully emptied, disinfected and backfilled. Those who do not connect risk a fine of €1,500 to €3,740 (individuals)."),
 ("Caso 2", "Sem rede: fossa estanque", "Só armazena", "Não lança efluente, por isso não tem impacte no solo nem nos recursos hídricos e não precisa de título de utilização da APA. As águas e as lamas são recolhidas por limpa-fossas e levadas para uma ETAR.",
  "Case 2", "No sewer: sealed tank", "It only stores", "It discharges no effluent, so it has no impact on soil or water resources and needs no APA use title. Wastewater and sludge are collected by tanker and taken to a wastewater treatment plant."),
 ("Caso 3", "Sem rede: tratamento complementar", "Parecer ou licença da APA", "Fossa sética seguida de infiltração, filtração ou outro tratamento. O efluente vai para o solo ou para o meio hídrico. Em regra basta o parecer da APA; a licença (TURH) é exigida em zonas de elevada vulnerabilidade hidrogeológica, em perímetros de proteção de captações e em zonas com poluição difusa, e aí o sistema leva tratamento complementar.",
  "Case 3", "No sewer: complementary treatment", "Opinion or licence from APA", "A septic tank followed by infiltration, filtration or other treatment. The effluent goes to the soil or a water body. An APA opinion is usually enough; a licence (TURH) is required in zones of high hydrogeological vulnerability, in protection perimeters of water sources and in diffuse-pollution zones, where the system must include complementary treatment."),
]
fluxo = [
 ("Fossa sética", "Separa os sólidos por decantação; as lamas são digeridas sem oxigénio.", "Septic tank", "Separates solids by settling; the sludge is digested without oxygen."),
 ("Tratamento complementar", "Infiltração, filtração ou um leito de plantas, sempre a jusante da fossa, nunca no lugar dela.", "Complementary treatment", "Infiltration, filtration or a planted bed, always downstream of the tank, never in its place."),
 ("Destino do efluente", "Solo ou meio hídrico, só com o parecer ou a licença da APA.", "Where the effluent goes", "Soil or a water body, only with the APA opinion or licence."),
]
beneficios = [
 ("Risco a evitar", "Uma fossa mal feita contamina", "Sem limpeza na periodicidade certa, ou construída sem as condições adequadas, pode infiltrar e contaminar o solo e a água, incluindo os furos de consumo. A contaminação pode não se notar no sabor, no cheiro ou no aspeto, e a água contaminada causa diarreias, hepatite A e problemas de pele.",
  "Risk to avoid", "A badly made tank contaminates", "Without cleaning at the right interval, or if built without suitable conditions, it can leak and contaminate soil and water, including drinking-water boreholes. Contamination may not show in taste, smell or look, and contaminated water causes diarrhoea, hepatitis A and skin problems."),
 ("Custos", "A tarifa continua a existir", "Todos os alojamentos têm de ter solução de saneamento e pagam a sua disponibilização, mesmo sem ligação à rede. A entidade gestora aplica o tarifário geral, que inclui as limpezas, ou um tarifário específico, em que se paga cada limpeza. Investimento e manutenção somam-se: só compara a fossa com a fatura incluindo estas contas.",
  "Costs", "The tariff still applies", "Every dwelling must have a sanitation solution and pays for the service being available, even without a sewer connection. The utility applies either the general tariff, which includes cleanings, or a specific tariff in which each cleaning is paid. Investment and maintenance add up: compare a tank with the bill only after including these costs."),
 ("Lamas", "Lamas não são composto", "As lamas vão para uma ETAR preparada para as tratar. É proibido lançá-las no ambiente ou nas redes de drenagem: é contraordenação ambiental muito grave. Podem ter outros destinos, como a compostagem, mas quem decide é a entidade que faz a limpeza; nunca as apliques na horta.",
  "Sludge", "Sludge is not compost", "Sludge goes to a treatment plant equipped to handle it. Dumping it in the environment or in drainage networks is forbidden: it is a very serious environmental offence. It can have other destinations, such as composting, but the body doing the cleaning decides; never apply it in the garden."),
]
passos = [
 ("Comprovar que não há rede", "Pede à Câmara Municipal um documento que prove a impossibilidade de ligação: acesso indisponível, ou razões técnicas e económicas.", "Prove there is no sewer", "Ask the municipality for a document proving connection is impossible: no access, or technical and economic reasons."),
 ("Projeto de um técnico", "Escolhe a solução e a localização, com análise do solo, terreno disponível, topografia e meios recetores (solo, água).", "A professional’s design", "Chooses the solution and location, with soil analysis, available land, topography and receiving media (soil, water)."),
 ("Parecer da APA", "Entrega o projeto e o comprovativo anterior à Agência Portuguesa do Ambiente e, se aplicável, pede a licença de descarga.", "APA opinion", "Submit the design and the previous proof to the Portuguese Environment Agency and, where applicable, apply for the discharge licence."),
 ("Aprovação da Câmara", "Apresenta a licença ou o parecer sobre a rejeição de águas residuais para a Câmara aprovar o projeto.", "Municipal approval", "Present the licence or the opinion on wastewater discharge so the municipality can approve the design."),
 ("Limpar e manter", "A limpeza é feita pela Câmara ou por quem ela autorizar. Nas fossas com tratamento complementar, no máximo a cada 2 anos.", "Clean and maintain", "Cleaning is done by the municipality or whoever it authorises. For tanks with complementary treatment, at most every 2 years."),
]
nota_t = ("Antes de construir", "Before building")
nota = ("Define a população servida e o caudal. Faz a análise do solo e confirma o nível freático. Mede as distâncias a furos, nascentes e linhas de água. Garante o acesso do limpa-fossas. Usa equipamentos pré-fabricados conformes com a série EN 12566 (fossas na parte 1, estações compactas na parte 3). E fala com a tua Câmara: cada município tem o seu regulamento.",
        "Define the population served and the flow. Analyse the soil and confirm the water table. Measure distances to boreholes, springs and watercourses. Ensure access for the tanker. Use prefabricated equipment conforming to the EN 12566 series (tanks in part 1, packaged plants in part 3). And talk to your municipality: each one has its own regulation.")
fontes = [
 ("ERSAR, Caderno de Sensibilização n.º 5, «Utilização de fossas séticas individuais» (dezembro de 2017)", "https://www.cm-borba.pt/wp-content/uploads/2023/01/Utilizacao-de-fossas-seticas-individuais.pdf", "ERSAR, Awareness booklet no. 5, “Use of individual septic tanks” (December 2017)"),
 ("APA, «O regime jurídico da utilização dos recursos hídricos» (apresentação, 12 de dezembro de 2017)", "https://emas.apambiente.pt/sites/default/files/documentos/3.APA_EMAS_12dez2017.pdf", "APA, “The legal regime for the use of water resources” (presentation, 12 December 2017)"),
 ("Decreto-Lei n.º 194/2009, arts. 59.º e 72.º", "https://files.diariodarepublica.pt/1s/2009/08/16100/0541805435.pdf", "Decree-Law 194/2009, arts. 59 and 72"),
 ("Decreto-Lei n.º 226-A/2007, art. 48.º", "https://diariodarepublica.pt/dr/detalhe/decreto-lei/226-a-2007-340237", "Decree-Law 226-A/2007, art. 48"),
 ("Série EN 12566 (CEN), pequenos sistemas de tratamento até 50 habitantes equivalentes", "https://din.de/en/wdc-beuth:din21:258802421", "EN 12566 series (CEN), small wastewater treatment systems up to 50 population equivalents"),
]
verificado = ("Verificado a 18 de outubro de 2026 nos textos citados. As regras e os valores podem mudar, e cada município tem o seu regulamento: confirma com a tua Câmara e com a APA.",
              "Checked on 18 October 2026 against the texts cited. Rules and amounts can change, and each municipality has its own regulation: check with your municipality and APA.")
h2 = ("Biofossa e depuração biológica", "Biofossa and biological treatment")
sub = ("Separar sólidos, tratar o efluente e devolver água ao ciclo sem criar risco sanitário ou contaminação do solo.", "Separate solids, treat the effluent and return water to the cycle without creating a health risk or soil contamination.")
aviso_termo = ("Na lei e nos guias da ERSAR e da APA o que existe é a «fossa sética», estanque ou com tratamento complementar. Usamos «biofossa» para o sistema com tratamento complementar.", "In law and in ERSAR and APA guidance there is the “septic tank”, either sealed or with complementary treatment. We use “biofossa” for the system with complementary treatment.")
eyebrow = ("01 · Água e saneamento", "01 · Water and sanitation")
leg = ("Esquema conceptual bioCulture — a solução final depende do solo, nível freático, ocupação e regras locais.", "bioCulture conceptual diagram — the final solution depends on soil, water table, occupancy and local rules.")

def bloco():
    sec = f'''  <section class="blueprint" id="biofossa" data-tom="agua">
    <div class="blueprint-heading">
      <span class="eyebrow">{t(*eyebrow)}</span>
      <div>
        <h2>{t(*h2)}</h2>
        <p>{t(*sub)}</p>
        <p class="bp-termo">{t(*aviso_termo)}</p>
      </div>
    </div>
    <div class="bp-resumo" role="note">
      <strong>{t("Em poucas palavras", "In a nutshell")}</strong>
      <ul>
        {"".join(li(*r) for r in resumo)}
      </ul>
    </div>
    <h3 class="bp-h3">{t("Qual é o teu caso?", "Which case is yours?")}</h3>
    <div class="bp-cartoes">
''' + "".join(f'''      <article>
        <small>{t(c[0], c[4])}</small>
        <h4>{t(c[1], c[5])}</h4>
        <span class="bp-etiqueta">{t(c[2], c[6])}</span>
        <p>{t(c[3], c[7])}</p>
      </article>
''' for c in casos) + f'''    </div>
    <h3 class="bp-h3">{t("Como funciona o tratamento", "How the treatment works")}</h3>
    <ol class="bp-fluxo">
''' + '      <li class="bp-seta" aria-hidden="true">→</li>\n'.join(f'''      <li><strong>{t(f[0], f[2])}</strong><span>{t(f[1], f[3])}</span></li>
''' for f in fluxo) + f'''    </ol>
    <figure class="blueprint-figure">
      <img src="/images/biofossa-process-v2.webp" alt="{t("Circuito de depuração biológica com decantação, biodigestor, filtro, canteiro e infiltração", "Biological treatment circuit with settling, digester, filter, planted bed and infiltration")}">
      <figcaption>{t(*leg)}</figcaption>
    </figure>
    <div class="blueprint-benefits">
''' + "".join(f'''      <article>
        <small>{t(b[0], b[3])}</small>
        <h3>{t(b[1], b[4])}</h3>
        <p>{t(b[2], b[5])}</p>
      </article>
''' for b in beneficios) + f'''    </div>
    <h3 class="bp-h3">{t("Como se licencia, passo a passo", "How it is licensed, step by step")}</h3>
    <ol class="blueprint-steps bp-cinco">
''' + "".join(f'''      <li><strong>{t(p[0], p[2])}</strong><span>{t(p[1], p[3])}</span></li>
''' for p in passos) + f'''    </ol>
    <aside class="blueprint-note">
      <strong>{t(*nota_t)}</strong>
      <p>{t(*nota)}</p>
    </aside>
    <p class="bp-fontes"><b>{t("Fontes", "Sources")}</b>: ''' + " · ".join(f'<a href="{u}" target="_blank" rel="noopener">{t(n, en)}</a>' for n, u, en in fontes) + f'''<em>{t(*verificado)}</em></p>
  </section>
'''
    return sec

def main():
    p = ROOT / "services/servicos.html"; s = p.read_text(encoding="utf-8")
    a = s.index('  <section class="blueprint" id="biofossa">'); b = s.index('  <section class="blueprint" id="chuva">')
    s = s[:a] + bloco() + "\n" + s[b:]
    if "servicos-blocos.css" not in s:
        s = s.replace('  <link rel="stylesheet" href="/assets/css/pages/solutions-hub.css?v=16">', '  <link rel="stylesheet" href="/assets/css/pages/solutions-hub.css?v=16">\n  <link rel="stylesheet" href="/assets/css/pages/servicos-blocos.css?v=1">', 1)
    p.write_text(s, encoding="utf-8")
    d = ROOT / "assets/lang/auto/en.json"; D = json.loads(d.read_text(encoding="utf-8")); n = 0
    for pt, en in P.items():
        if pt not in D: D[pt] = en; n += 1
    d.write_text(json.dumps(D, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("biofossa reescrita; dicionário +", n)
if __name__ == "__main__": main()

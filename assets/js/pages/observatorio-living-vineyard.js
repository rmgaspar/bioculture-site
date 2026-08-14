(() => {
  'use strict';

  const lang = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'pt';
  document.documentElement.lang = lang;

  const copy = {
    pt: {
      static: ['Atlas global · Vinha biológica','Cultivar a videira.<br><em>Regenerar o lugar.</em>','Da poda à vindima, cada decisão altera água, solo, copa, sanidade e expressão da uva. A vinha biológica torna-se excelente quando observa antes de intervir e adapta cada técnica ao clima e à parcela.','Dimensão global','Uma cultura, milhares de lugares','O atlas combina perfis climáticos, operações, castas e princípios de proteção biológica sem transformar diversidade local numa receita universal.','Clima e terroir','Começar pelo lugar','Escolha o contexto mais próximo. Solo, exposição e microclima da parcela continuam a prevalecer.','Calendário vivo','Do repouso à revisão anual','Os meses são referências aproximadas; a fenologia observada manda sempre.','Manual técnico','A precisão está nos pequenos gestos','Explore cada núcleo de decisão, do solo à vindima.','Castas','Dos quatro cantos da vinha','Do património local às variedades viajantes: fichas técnicas aprofundadas e um catálogo mundial verificável não são a mesma coisa — aqui pode explorar ambos.','Proteção biológica','Diagnosticar antes de tratar','Clima, sintomas, histórico e monitorização definem o risco. Qualquer produto precisa de autorização local para vinha e finalidade.','Princípios','Uma vinha verdadeiramente viva'],
      metrics: ['variedades no catálogo mundial','fichas agronómicas profundas','países de cultivo','perfis climáticos'],
      water: 'Água e solo', canopy: 'Copa', risks: 'Riscos dominantes', flora: 'Flora a vigiar',
      north: 'Hemisfério norte', south: 'Hemisfério sul', months: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'],
      phase: 'fase', guidance: 'trabalho de campo', viewAtlas: 'Explorar a vinha e as castas portuguesas em detalhe',
      grapeLabels: ['Origem','Clima','Maturação','Vigor','A vigiar'], source: 'Consultar fonte', catalogue: ['Todas','Vinho','Mesa','Passa','Porta-enxerto'], catalogueTitle: 'variedades identificadas', search: 'Pesquisar por nome', placeholder: 'Ex.: Nebbiolo, País, Assyrtiko…', more: 'Mostrar mais castas', results: 'registos encontrados', noResults: 'Nenhuma variedade corresponde à pesquisa.', catalogueNote: 'Identificação, cor e utilização segundo o FPS Grape Registry. As fichas agronómicas aprofundadas aparecem acima.',
      safety: 'Confirmar sempre diagnóstico, limiares, registo biológico e autorização no país antes de intervir.'
    },
    en: {
      static: ['Global atlas · Organic viticulture','Cultivate the vine.<br><em>Regenerate the place.</em>','From pruning to harvest, every decision changes water, soil, canopy, vine health and fruit expression. Organic viticulture excels when it observes before acting and adapts every technique to climate and site.','Global scale','One crop, thousands of places','The atlas combines climate profiles, operations, varieties and biological protection without turning local diversity into a universal recipe.','Climate and terroir','Begin with place','Choose the closest context. Site soil, exposure and microclimate always take precedence.','Living calendar','From dormancy to annual review','Months are approximate references; observed phenology always leads.','Field manual','Precision lives in small gestures','Explore each decision area, from soil to harvest.','Varieties','From every corner of the vineyard','From local heritage to travelling varieties: in-depth technical profiles and a verifiable world catalogue are not the same thing — here you can explore both.','Biological protection','Diagnose before treating','Weather, symptoms, history and monitoring define risk. Any product must be locally authorised for grapevine and intended use.','Principles','A truly living vineyard'],
      metrics: ['varieties in the world catalogue','in-depth agronomic profiles','growing countries','climate profiles'],
      water: 'Water and soil', canopy: 'Canopy', risks: 'Main risks', flora: 'Flora to watch',
      north: 'Northern hemisphere', south: 'Southern hemisphere', months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      phase: 'phase', guidance: 'fieldwork', viewAtlas: 'Explore Portuguese varieties and viticulture in detail',
      grapeLabels: ['Origin','Climate','Ripening','Vigour','Watch for'], source: 'View source', catalogue: ['All','Wine','Table','Raisin','Rootstock'], catalogueTitle: 'identified varieties', search: 'Search by name', placeholder: 'E.g. Nebbiolo, País, Assyrtiko…', more: 'Show more varieties', results: 'records found', noResults: 'No variety matches this search.', catalogueNote: 'Identification, colour and use according to the FPS Grape Registry. In-depth agronomic profiles appear above.',
      safety: 'Always confirm diagnosis, thresholds, organic registration and national authorisation before acting.'
    }
  }[lang];

  const manual = {
    soil: {
      title: ['Solo e fertilidade','Soil and fertility'],
      intro: ['Alimentar a teia do solo, não apenas a videira.','Feed the soil web, not only the vine.'],
      cards: [
        ['Diagnóstico da parcela','Abrir perfis, analisar textura, matéria orgânica, pH, calcário, salinidade e nutrientes; mapear zonas fracas separadamente. A análise foliar confirma o que a planta realmente absorveu.','Read the site','Open soil pits; analyse texture, organic matter, pH, lime, salinity and nutrients. Map weak zones separately. Leaf analysis confirms what the plant absorbed.'],
        ['Cobertura viva','Escolher misturas pelo objetivo: leguminosas para azoto, gramíneas para estrutura e controlo de vigor, flores para auxiliares. Alternar linhas e roçar ou acamar antes da competição crítica.','Living cover','Choose mixes by purpose: legumes for nitrogen, grasses for structure and vigour control, flowers for beneficials. Alternate rows and mow or roll before critical competition.'],
        ['Tráfego e matéria orgânica','Definir corredores permanentes, evitar solo húmido e devolver composto maduro após análise. Mobilização superficial e localizada só quando o diagnóstico a justifica.','Traffic and organic matter','Use permanent traffic lanes, avoid wet soil and return mature compost after testing. Shallow, local cultivation only where diagnosis supports it.'],
        ['Raízes e microbiologia','Observar profundidade e distribuição das raízes, infiltração, minhocas e estabilidade dos agregados. Inoculantes nunca substituem habitat, carbono e ausência de compactação.','Roots and microbiology','Observe rooting depth and distribution, infiltration, earthworms and aggregate stability. Inoculants never replace habitat, carbon and freedom from compaction.']
      ]
    },
    irrigation: {
      title: ['Água e rega','Water and irrigation'], intro: ['Medir antes de abrir a válvula.','Measure before opening the valve.'],
      cards: [
        ['Balanço hídrico','Cruzar precipitação, evapotranspiração, capacidade do solo, profundidade radicular e fase fenológica. Sensores ajudam, mas precisam de leitura em várias profundidades e zonas de vigor.','Water balance','Combine rainfall, evapotranspiration, soil capacity, rooting depth and phenology. Sensors help, but must be read at several depths and vigour zones.'],
        ['Momento e quantidade','Evitar stress severo entre floração e pintor; depois ajustar ao objetivo e clima. Rega curta pode molhar só a superfície; excesso profundo perde água e nutrientes.','Timing and volume','Avoid severe stress between flowering and veraison; then tune to purpose and climate. Short irrigation may wet only the surface; deep excess loses water and nutrients.'],
        ['Qualidade e eficiência','Analisar salinidade, sódio, bicarbonatos e boro. Ensaiar uniformidade, localizar fugas, limpar filtros e confirmar o bulbo húmido com sonda ou pequena escavação.','Quality and efficiency','Test salinity, sodium, bicarbonate and boron. Audit uniformity, locate leaks, clean filters and verify the wetted bulb with a probe or small excavation.'],
        ['Seca e extremos','Preparar prioridades por bloco antes da escassez, reduzir competição no momento certo e proteger o solo. Não compensar uma copa excessiva com rega permanente.','Drought and extremes','Set block priorities before scarcity, reduce competition at the right time and protect soil. Do not compensate for an excessive canopy with permanent irrigation.']
      ]
    },
    canopy: {
      title: ['Poda e copa','Pruning and canopy'], intro: ['Equilibrar fruto, folhas, luz e longevidade.','Balance fruit, leaves, light and longevity.'],
      cards: [
        ['Poda de inverno','Adaptar carga ao vigor e às reservas; respeitar o fluxo de seiva, reduzir cortes grandes e podar plantas doentes por último, desinfetando ferramentas entre focos.','Winter pruning','Match bud load to vigour and reserves; respect sap flow, limit large cuts and prune diseased vines last, sanitising tools between hotspots.'],
        ['Desladroamento','Retirar cedo ladrões do tronco e rebentos mal posicionados, conservando os necessários à renovação. Trabalhar por zonas de vigor evita despir plantas fracas ou fechar as fortes.','Shoot thinning','Remove trunk suckers and poorly placed shoots early, retaining those needed for renewal. Work by vigour zone to avoid stripping weak vines or crowding strong ones.'],
        ['Orientação e desfolha','Posicionar rebentos antes de quebrarem. Abrir a zona dos cachos gradualmente, primeiro no lado mais fresco; em calor extremo conservar sombra funcional contra escaldão.','Positioning and leaf removal','Position shoots before they become brittle. Open the fruit zone gradually, first on the cooler side; in extreme heat retain functional shade against sunburn.'],
        ['Carga e arquitetura','Contar cachos e rebentos por metro, comparar com vigor e capacidade de maturação. Ajustar cedo e por zona, preservando estrutura para a poda e produção do ano seguinte.','Crop load and architecture','Count bunches and shoots per metre, comparing them with vigour and ripening capacity. Adjust early by zone, preserving structure for next year’s pruning and crop.']
      ]
    },
    biodiversity: {
      title: ['Biodiversidade funcional','Functional biodiversity'], intro: ['Criar habitat contínuo, não decoração sazonal.','Build continuous habitat, not seasonal decoration.'],
      cards: [
        ['Infraestrutura ecológica','Ligar sebes, linhas de água, muros, árvores e manchas floridas. Usar espécies nativas e escalonar florações para oferecer abrigo e alimento todo o ano.','Ecological infrastructure','Connect hedges, waterways, walls, trees and flower patches. Use native species and stagger flowering to provide food and refuge year-round.'],
        ['Auxiliares','Monitorizar crisopas, sirfídeos, joaninhas, ácaros predadores, aves e morcegos. Caixas-ninho ajudam apenas onde existe alimento, água e habitat adequados.','Beneficials','Monitor lacewings, hoverflies, ladybirds, predatory mites, birds and bats. Nest boxes help only where suitable food, water and habitat exist.'],
        ['Flora espontânea','Distinguir cobertura útil, espécies competitivas e invasoras legais. Controlar antes da semente, retirar propágulos e nunca transportar solo contaminado para parcelas limpas.','Spontaneous flora','Distinguish useful cover, competitive species and regulated invaders. Control before seed set, remove propagules and never move contaminated soil into clean blocks.'],
        ['Paisagem e continuidade','Avaliar o que existe para lá da parcela: matos, bosques, culturas vizinhas e corredores ripícolas. Coordenar intervenções evita criar ilhas ecológicas ou armadilhas para fauna.','Landscape continuity','Assess what lies beyond the block: scrub, woodland, neighbouring crops and riparian corridors. Coordinated action avoids ecological islands or traps for wildlife.']
      ]
    },
    health: {
      title: ['Sanidade integrada','Integrated vine health'], intro: ['Prevenir, observar, confirmar e só depois agir.','Prevent, observe, confirm, then act.'],
      cards: [
        ['Monitorização','Percursos fixos semanais, armadilhas quando adequadas e registo georreferenciado de sintomas, estado fenológico e tempo. Separar presença de dano económico.','Monitoring','Use fixed weekly routes, traps where appropriate and mapped records of symptoms, phenology and weather. Separate presence from economic damage.'],
        ['Prevenção cultural','Material certificado, drenagem, copa arejada, nutrição equilibrada, higiene de ferramentas e remoção correta de focos reduzem dependência de tratamentos.','Cultural prevention','Certified plants, drainage, airy canopies, balanced nutrition, tool hygiene and correct hotspot removal reduce dependence on treatments.'],
        ['Decisão biológica','Confirmar agente e risco real; escolher a opção seletiva de menor impacto, proteger auxiliares e água, alternar modos de ação e registar eficácia.','Organic decision','Confirm the agent and actual risk; choose the least disruptive selective option, protect beneficials and water, rotate modes of action and record efficacy.'],
        ['Avaliar o resultado','Revisitar zonas tratadas e não tratadas, medir incidência e severidade e anotar efeitos não desejados. A eficácia observada melhora a decisão seguinte.','Evaluate the outcome','Revisit treated and untreated zones, measure incidence and severity, and record unwanted effects. Observed efficacy improves the next decision.']
      ]
    },
    harvest: {
      title: ['Maturação e vindima','Ripening and harvest'], intro: ['Colher uma parcela, não uma média.','Harvest a site, not an average.'],
      cards: [
        ['Amostragem representativa','Separar castas, solos, exposições e vigor. Combinar açúcar, acidez, pH, peso do bago, sanidade e prova de película, polpa e grainha.','Representative sampling','Separate varieties, soils, exposure and vigour. Combine sugar, acidity, pH, berry weight, health and tasting of skin, pulp and seed.'],
        ['Decisão de colheita','Integrar estilo, previsão meteorológica, risco de doença, capacidade da adega e janela de mão de obra. Uma única data raramente serve toda a vinha.','Harvest decision','Integrate style, forecast, disease risk, winery capacity and labour window. One date rarely suits the entire vineyard.'],
        ['Depois da vindima','Manter folha funcional para repor reservas, corrigir apenas deficiências confirmadas, reparar rega e drenagem e registar rendimento, qualidade e anomalias por zona.','After harvest','Keep functional leaves to replenish reserves, correct only confirmed deficiencies, repair irrigation and drainage, and record yield, quality and anomalies by zone.'],
        ['Rastreabilidade e aprendizagem','Ligar cada lote à parcela, hora, equipa, estado sanitário e condições de transporte. Comparar vinho e uva com decisões de campo fecha o ciclo de aprendizagem.','Traceability and learning','Link every lot to site, time, crew, health status and transport conditions. Comparing wine and fruit with field decisions closes the learning loop.']
      ]
    }
  };

  const diagnostics = [
    ['Míldio','Downy mildew','manchas de óleo, esporulação branca; chuva e tecido jovem','oil spots, white sporulation; rain and young tissue','arejar copa, acompanhar infeção primária e proteger preventivamente quando o risco local o exige','open the canopy, track primary infection and protect preventively when local risk requires it'],
    ['Oídio','Powdery mildew','pó cinzento, cheiro a fungo, bagos fendidos; risco mesmo sem chuva','grey powder, fungal odour, split berries; risk even without rain','vigiar desde cedo, abrir cachos e evitar zonas sombrias; tratar no momento biológico correto','monitor early, open fruit zones and avoid shade; treat at the correct biological timing'],
    ['Botrytis','Botrytis','podridão castanha e micélio cinzento em cachos compactos ou feridos','brown rot and grey mycelium in compact or injured bunches','controlar vigor e traça, favorecer secagem, colher focos separadamente','control vigour and moth damage, aid drying, harvest hotspots separately'],
    ['Traças da uva','Grapevine moths','ovos e perfurações em flores ou bagos; favorecem podridões','eggs and holes in flowers or berries; promote rots','armadilhas e observação de ovos; confusão sexual e biocontrolo conforme espécie e região','traps and egg checks; mating disruption and biocontrol according to species and region'],
    ['Cicadelídeos','Leafhoppers','pontuações, amarelecimento ou sintomas de fitoplasmas','stippling, yellowing or phytoplasma-like symptoms','identificar espécie; cumprir regras oficiais perante flavescência dourada ou outros organismos regulados','identify species; follow official rules for flavescence dorée or other regulated organisms'],
    ['Doenças do lenho','Trunk diseases','folhas tigreadas, braços mortos, necrose interna','tiger-striped leaves, dead arms, internal necrosis','marcar plantas, podar em seco, proteger feridas e remover madeira segundo regras locais','mark vines, prune dry, protect wounds and remove wood under local rules'],
    ['Ácaros e cochonilhas','Mites and mealybugs','bronzeamento, deformação, melada ou colónias escondidas','bronzing, distortion, honeydew or hidden colonies','confirmar com lupa, proteger predadores e controlar formigas quando interferem','confirm with a lens, protect predators and manage ants where they interfere'],
    ['Flora invasora','Invasive flora','focos em bordaduras, linhas de água e solo perturbado','hotspots on edges, waterways and disturbed soil','identificar localmente, impedir floração e dispersão; priorizar remoção seletiva e seguimento plurianual','identify locally, prevent flowering and spread; prioritise selective removal and multi-year follow-up']
  ];

  const ranges = [[11,0,1],[2,3],[3,4],[4],[4,5],[5],[5,6],[6,7],[7,8],[7,8,9],[8,9,10],[10,11]];
  const featured = ['cabernet-sauvignon','chardonnay','pinot-noir','sauvignon-blanc','riesling','syrah','tinta-roriz','sangiovese','touriga-nacional','assyrtiko','malbec','chenin-blanc'];
  const $ = (s) => document.querySelector(s);
  const esc = (s='') => String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const tr = (pair) => pair[lang === 'en' ? 1 : 0];

  function translateStatic() {
    document.title = lang === 'en' ? 'bioCulture — Living Vineyard' : 'bioCulture — Vinha Viva';
    document.querySelector('meta[name="description"]').content = lang === 'en' ? 'Interactive global guide to organic viticulture, climate, varieties, water, biodiversity and integrated protection.' : 'Guia global interativo de viticultura biológica, clima, castas, água, biodiversidade e proteção integrada.';
    const selectors = ['.vine-hero .eyebrow','.vine-hero h1','.vine-hero .lead',...Array.from(document.querySelectorAll('.section-head')).flatMap((_,i)=>[`.section-block:nth-of-type(${i+2}) .eyebrow`,`.section-block:nth-of-type(${i+2}) h2`,`.section-block:nth-of-type(${i+2}) .section-head p`]),'.method-box > .eyebrow','.method-box > h2'];
    selectors.forEach((selector,i) => { const el=$(selector); if(el && copy.static[i] != null) el.innerHTML=copy.static[i]; });
    document.querySelector('[data-hemi="north"]').textContent=copy.north;
    document.querySelector('[data-hemi="south"]').textContent=copy.south;
    $('.portugal-link').textContent=copy.viewAtlas;
    $('#catalogue-title').textContent=copy.catalogueTitle;
    $('.grape-search span').textContent=copy.search;
    $('#grape-search').placeholder=copy.placeholder;
    $('#catalogue-more').textContent=copy.more;
    if(lang==='en') {
      const principles=[['Soil always covered','Roots, organic matter and controlled traffic protect structure and infiltration.'],['Measured water','Irrigation responds to vine and soil, not a fixed schedule.'],['Balanced canopy','Light, air and functional shade reduce disease and sunburn.'],['Useful diversity','Flowers, hedges, walls and untilled areas support beneficials.']];
      document.querySelectorAll('.method-grid article').forEach((el,i)=>el.innerHTML=`<b>${principles[i][0]}</b><p>${principles[i][1]}</p>`);
    }
  }

  function renderClimate(data, id) {
    document.querySelectorAll('#climate-filters button').forEach(b=>{const active=b.dataset.id===id;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});
    const c=data.climates.find(x=>x.id===id) || data.climates[0];
    $('#climate-panel').innerHTML=`<div class="climate-intro"><span>${esc(c.regions)}</span><h3>${esc(c[`name_${lang}`])}</h3><p>${lang==='pt'?'Perfil orientador; confirme-o com dados da parcela e conhecimento local.':'An indicative profile; verify it with site data and local knowledge.'}</p></div><div class="climate-details"><article><b>${copy.water}</b><p>${esc(c[`water_${lang}`])}</p></article><article><b>${copy.canopy}</b><p>${esc(c[`canopy_${lang}`])}</p></article><article><b>${copy.risks}</b><p>${esc(c[`risks_${lang}`])}</p></article><article><b>${copy.flora}</b><p>${esc(c[`flora_${lang}`])}</p></article></div>`;
  }

  function renderCalendar(data, hemi='north') {
    const shift=hemi==='south'?6:0;
    $('#vine-calendar').innerHTML=data.operations.map((op,i)=>{
      const months=ranges[i].map(m=>copy.months[(m+shift)%12]).join(' · ');
      return `<article><div class="calendar-top"><span>${String(i+1).padStart(2,'0')} · ${copy.phase}</span><b>${months}</b></div><h3>${esc(op[`phase_${lang}`])}</h3><p>${esc(op[`work_${lang}`])}</p></article>`;
    }).join('');
  }

  function renderManual(key) {
    document.querySelectorAll('#manual-nav button').forEach(b=>{const active=b.dataset.key===key;b.classList.toggle('active',active);b.setAttribute('aria-pressed',active)});
    const m=manual[key];
    $('#manual-panel').innerHTML=`<header><span>${tr(m.intro)}</span><h3>${tr(m.title)}</h3></header><div class="manual-cards">${m.cards.map(c=>`<article><h4>${esc(lang==='pt'?c[0]:c[2])}</h4><p>${esc(lang==='pt'?c[1]:c[3])}</p></article>`).join('')}</div>`;
  }

  function renderGrapes(grapes) {
    const selected=featured.map(id=>grapes.find(g=>g.id===id)).filter(Boolean);
    const country = s => ({'França':'France','Alemanha':'Germany','Itália':'Italy','Grécia':'Greece','Espanha':'Spain'}[s]||s);
    const maturity = s => ({'Precoce':'Early','Média':'Mid-season','Tardia':'Late','Muito tardia':'Very late','Média a tardia':'Mid to late'}[s]||'Site-dependent');
    const vigour = s => ({'Baixo':'Low','Médio':'Moderate','Elevado':'High','Muito elevado':'Very high'}[s]||'Site-dependent');
    $('#grape-showcase').innerHTML=selected.map(g=>{const english=lang==='en';const colour=english?(g.cor==='Tinto'?'Red':'White'):g.cor;const history=english?`${g.nome} is represented in the atlas across ${g.paises.length} growing countries; expression and performance depend on site, rootstock and farming choices.`:g.historia;const climate=english?'Match heat, season length, water availability and exposure to the site before planting.':g.tecnico?.clima;const watch=english?'Verify local disease, heat and water risks through field monitoring.':(g.sensibilidades||[]).join(' · ');return `<article><div class="grape-top"><span>${esc(colour)}</span><b>${esc(g.nome)}</b></div><p>${esc(history)}</p><dl><div><dt>${copy.grapeLabels[0]}</dt><dd>${esc(english?country(g.origem):g.origem)}</dd></div><div><dt>${copy.grapeLabels[1]}</dt><dd>${esc(climate)}</dd></div><div><dt>${copy.grapeLabels[2]}</dt><dd>${esc(english?maturity(g.maturacao):g.maturacao)}</dd></div><div><dt>${copy.grapeLabels[3]}</dt><dd>${esc(english?vigour(g.vigor):g.vigor)}</dd></div><div><dt>${copy.grapeLabels[4]}</dt><dd>${esc(watch)}</dd></div></dl></article>`}).join('');
  }

  function setupGlobalCatalogue(catalogue) {
    let active='All', limit=48;
    const normalise=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    const labels={All:copy.catalogue[0],Wine:copy.catalogue[1],Table:copy.catalogue[2],Raisin:copy.catalogue[3],Rootstock:copy.catalogue[4]};
    $('#global-grape-count').textContent=catalogue.count.toLocaleString(lang==='pt'?'pt-PT':'en');
    $('#catalogue-note').textContent=copy.catalogueNote;
    $('#catalogue-filters').innerHTML=Object.entries(labels).map(([key,label],i)=>`<button type="button" class="${i?'':'active'}" aria-pressed="${i?'false':'true'}" data-use="${key}">${label}</button>`).join('');
    const draw=()=>{
      const query=normalise($('#grape-search').value);
      const filtered=catalogue.varieties.filter(v=>(active==='All'||v.uses.includes(active))&&normalise(v.name).includes(query));
      $('#catalogue-results').textContent=`${filtered.length.toLocaleString(lang==='pt'?'pt-PT':'en')} ${copy.results}`;
      $('#global-grape-grid').innerHTML=filtered.slice(0,limit).map(v=>`<a href="${esc(v.profile_url)}" target="_blank" rel="noopener"><b>${esc(v.name)}</b><span>${esc([v.berry_color,...v.uses].filter(Boolean).join(' · ')||(lang==='pt'?'Registo de identificação':'Identification record'))}</span></a>`).join('')||`<p>${copy.noResults}</p>`;
      $('#catalogue-more').hidden=limit>=filtered.length;
    };
    $('#catalogue-filters').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;active=b.dataset.use;limit=48;document.querySelectorAll('#catalogue-filters button').forEach(x=>{const on=x===b;x.classList.toggle('active',on);x.setAttribute('aria-pressed',on)});draw()});
    $('#grape-search').addEventListener('input',()=>{limit=48;draw()});
    $('#catalogue-more').addEventListener('click',()=>{limit+=48;draw()});
    draw();
  }

  function renderDiagnostics() {
    $('#diagnostic-grid').innerHTML=diagnostics.map(d=>`<article><span>${lang==='pt'?'Sinais':'Signals'}</span><h3>${esc(lang==='pt'?d[0]:d[1])}</h3><p>${esc(lang==='pt'?d[2]:d[3])}</p><b>${lang==='pt'?'Primeira resposta':'First response'}</b><p>${esc(lang==='pt'?d[4]:d[5])}</p></article>`).join('')+`<p class="diagnostic-note">${copy.safety}</p>`;
  }

  async function init() {
    translateStatic();
    try {
      const [data,grapes,catalogue]=await Promise.all([fetch('/data/living-vineyard-global.json').then(r=>r.json()),fetch('/data/castas.json').then(r=>r.json()),fetch('/data/grape-varieties-global.json').then(r=>r.json())]);
      const values=[catalogue.count,grapes.length,data.coverage.countries,data.coverage.climate_profiles];
      $('#vine-metrics').innerHTML=values.map((v,i)=>`<article><strong>${v}</strong> <span>${copy.metrics[i]}</span></article>`).join('');
      $('#climate-filters').innerHTML=data.climates.map((c,i)=>`<button type="button" class="${i?'':'active'}" aria-pressed="${i?'false':'true'}" data-id="${c.id}">${esc(c[`name_${lang}`])}</button>`).join('');
      $('#climate-filters').addEventListener('click',e=>{const b=e.target.closest('button');if(b)renderClimate(data,b.dataset.id)});
      renderClimate(data,data.climates[0].id);
      renderCalendar(data);
      document.querySelectorAll('.hemi-controls button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.hemi-controls button').forEach(x=>{const active=x===b;x.classList.toggle('active',active);x.setAttribute('aria-pressed',active)});renderCalendar(data,b.dataset.hemi)}));
      $('#manual-nav').innerHTML=Object.entries(manual).map(([key,m],i)=>`<button type="button" class="${i?'':'active'}" aria-pressed="${i?'false':'true'}" data-key="${key}">${esc(tr(m.title))}</button>`).join('');
      $('#manual-nav').addEventListener('click',e=>{const b=e.target.closest('button');if(b)renderManual(b.dataset.key)});
      renderManual('soil'); renderGrapes(grapes); setupGlobalCatalogue(catalogue); renderDiagnostics();
      $('#source-links').innerHTML=data.sources.map(s=>`<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.organisation)} · ${copy.source}</a>`).join('');
    } catch(err) {
      document.querySelectorAll('#vine-metrics,#climate-panel,#vine-calendar').forEach(el=>el.innerHTML=`<p>${lang==='pt'?'Não foi possível carregar os dados.':'Data could not be loaded.'}</p>`);
      console.error(err);
    }
    fetch('/sidebar-content.html?v=20').then(r=>r.ok?r.text():'').then(html=>{if(html)$('#sidebar').innerHTML=html}).catch(()=>{});
  }
  document.addEventListener('DOMContentLoaded',init);
})();

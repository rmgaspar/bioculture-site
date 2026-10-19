/* Conhecimento para cuidar · Sementes.
   Dados: /data/sementes.json (as variedades de conservação do Catálogo Nacional de Variedades 2026 da DGAV e a lista de fontes).
   O resto do texto resume páginas oficiais da DGAV, do INIAV (BPGV), da DGADR e da Comissão Europeia; cada bloco diz a fonte.
   Sem pedidos a serviços externos e sem nada guardado. */
(function () {
  "use strict";

  /* ---------- lógica (exportada para os testes) ---------- */
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  /* Variedades que passam pela espécie escolhida (todas se não houver). */
  const filtrar = (variedades, especie) => variedades.filter((v) => !especie || especie === "todas" || norm(v.especie_pt).startsWith(norm(especie)));
  /* Espécies (sem o que vem entre parênteses), pela ordem em que aparecem. */
  const especies = (variedades) => [...new Set(variedades.map((v) => v.especie_pt.replace(/\s*\(.*\)/, "")))];
  /* Quadro de guardar semente: autofecundadas (as mais fáceis), as que cruzam entre variedades (vento, insetos ou ambos) e as bienais. */
  const filtrarGuardar = (culturas, f) => culturas.filter((c) => !f || f === "todas" || (f === "self" && c.polin === "self") || (f === "cross" && c.polin !== "self") || (f === "bienal" && c.ciclo === "B"));
  /* Distância de isolamento em texto: «≈ 30 m», ou «≈ 8 a 30 m» quando a fonte dá um intervalo. */
  const distancia = (m, en) => (m[0] === m[1] ? `≈ ${m[0]} m` : `≈ ${m[0]} ${en ? "to" : "a"} ${m[1]} m`);
  const durabilidade = (a, en) => (a[0] === a[1] ? `${a[0]}` : `${a[0]} ${en ? "to" : "a"} ${a[1]}`);
  window.BioCulturaSementes = { norm, filtrar, especies, filtrarGuardar, distancia, durabilidade };

  const G = window.BioCulturaGraficos, box = document.getElementById("relatorio-sementes");
  if (!G || !box) return;
  const { EN, tr, esc } = G;

  if (EN) {
    document.querySelectorAll("[data-en]").forEach((n) => { n.innerHTML = n.dataset.en; });
    document.querySelectorAll("[data-en-label]").forEach((n) => n.setAttribute("aria-label", n.dataset.enLabel));
    document.title = "Seeds — bioCulture";
  }
  fetch("/sidebar-content.html?v=28").then((r) => (r.ok ? r.text() : "")).then((h) => { const sb = document.getElementById("sidebar"); if (h && sb) sb.innerHTML = h; }).catch(() => {});
  const barraFixa = () => { const el = document.createElement("script"); el.src = "/assets/js/biocultura-sticky-nav.js?v=19"; document.body.appendChild(el); };
  const langQ = new URLSearchParams(location.search).get("lang");
  const comLang = (href) => {
    if (!langQ) return href;
    const [p, hash] = href.split("#");
    return p + (p.includes("?") ? "&" : "?") + "lang=" + encodeURIComponent(langQ) + (hash ? "#" + hash : "");
  };
  const voltar = document.getElementById("sementes-voltar");
  if (voltar) voltar.setAttribute("href", comLang("/calendario/conhecimento-cuidar.html"));

  fetch("/data/sementes.json?v=3").then((r) => { if (!r.ok) throw new Error("sementes " + r.status); return r.json(); })
    .then((D) => { build(D); barraFixa(); irParaHash(); })
    .catch((e) => { console.error(e); barraFixa(); box.innerHTML = `<p class="prose">${tr("Não foi possível carregar os dados desta página.", "The data for this page could not be loaded.")}</p>`; });
  const irParaHash = () => {
    let alvo = null;
    try { alvo = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null; } catch (e) { alvo = null; }
    if (alvo) { if (alvo.tagName === "TR") alvo.classList.add("sm-foco"); setTimeout(() => alvo.scrollIntoView({ block: "start" }), 60); }
  };

  function build(D) {
    const F = D.fontes, S = (id) => `<a href="${F[id].url}" target="_blank" rel="noopener">${esc(EN ? F[id].nome_en : F[id].nome)}</a>`;
    const V = D.variedades, nEsp = especies(V).length, nHorta = V.filter((v) => v.horta).length;

    /* Fotografia ao lado do texto (Wikimedia Commons, licença aberta, com crédito e ligação à ficha). */
    const FOTOS = {
      variedade: { src: "variedade-de-sementes", w: 1000, h: 750, alt: ["Tabuleiro com dezasseis compartimentos, cada um com sementes diferentes", "Tray with sixteen compartments, each holding different seeds"], cap: ["A diversidade começa na semente.", "Diversity starts with the seed."], autor: "Rickproser", lic: ["CC BY-SA 3.0", "https://creativecommons.org/licenses/by-sa/3.0"], ficha: "Seed_variety.jpg" },
      espigueiros: { src: "espigueiros-soajo", w: 1000, h: 755, alt: ["Espigueiros de granito em Soajo, com cruz no telhado, sobre pilares", "Granite espigueiros (grain stores) in Soajo, with a cross on the roof, standing on pillars"], cap: ["Espigueiros em Soajo (Arcos de Valdevez), feitos para secar e guardar o milho.", "Espigueiros in Soajo (Arcos de Valdevez), built to dry and store maize."], autor: "AJSL48", lic: ["CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0"], ficha: "PNPG_-_Soajo_-_Espigueiros_2.jpg" },
      guardadas: { src: "sementes-guardadas", w: 1000, h: 563, alt: ["Sementes de feijões e outras culturas guardadas num prato, com malaguetas secas", "Seeds of beans and other crops kept on a plate, with dried chillies"], cap: ["Sementes de várias culturas, guardadas para a época seguinte.", "Seeds of several crops, kept for the next season."], autor: "Elmer Centeno Guevarra", lic: ["CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0"], ficha: "SEED_AND_PLANT_LIBRARY_IN_PROMOTING_FOOD_DIVERSITY_AT_OHMG_PANGASINAN.jpg" },
      jovens: { src: "plantas-jovens", w: 1000, h: 656, alt: ["Canteiros de hortícolas jovens em terra vermelha, junto a milho", "Beds of young vegetables in red soil, next to maize"], cap: ["Canteiros de hortícolas jovens.", "Beds of young vegetables."], autor: "Ray Nimu", lic: ["CC BY-SA 4.0", "https://creativecommons.org/licenses/by-sa/4.0"], ficha: "Vegetable_Seedlings.jpg" }
    };
    const foto = (k) => {
      const f = FOTOS[k], i = EN ? 1 : 0;
      return `<figure class="sm-foto" data-no-signature><img src="/images/sementes/${f.src}.webp" width="${f.w}" height="${f.h}" loading="lazy" alt="${esc(f.alt[i])}"><figcaption>${esc(f.cap[i])} <span>${tr("Foto", "Photo")}: ${esc(f.autor)} · <a href="${f.lic[1]}" target="_blank" rel="noopener">${f.lic[0]}</a> · <a href="https://commons.wikimedia.org/wiki/File:${f.ficha}" target="_blank" rel="noopener">Wikimedia Commons</a></span></figcaption></figure>`;
    };
    const duo = (texto, k) => `<div class="sm-duo"><div class="sm-txt">${texto}</div>${foto(k)}</div>`;

    box.innerHTML = `
<section id="sumario">
  <div class="sec-head"><span class="eyebrow">${tr("1 · Sumário", "1 · Summary")}</span><h2>${tr("Variedades tradicionais e de conservação", "Traditional and conservation varieties")}</h2></div>
  ${duo(`<div class="prose">
    <p>${tr("Uma <strong>variedade de conservação</strong> é uma variedade autóctone, ou naturalmente adaptada às condições locais e regionais, e ameaçada de erosão genética. É a definição do Catálogo Nacional de Variedades (CNV). A lei abre-lhes uma porta própria: podem entrar no catálogo e as suas sementes podem ser produzidas e vendidas, mas só de acordo com a região de origem de cada uma.", "A <strong>conservation variety</strong> is a native variety, or one naturally adapted to local and regional conditions, and threatened by genetic erosion. That is the definition in the National Catalogue of Varieties (CNV). The law opens a door of their own: they can enter the catalogue and their seed can be produced and sold, but only according to each one’s region of origin.")} ${S("cnv")}</p>
    <p>${tr("As <strong>variedades tradicionais</strong> de que tanto se fala são um conjunto bem mais largo. A DGAV descreve-as como uma parte significativa do acervo genético do país, muitas vezes associada à cultura e aos saberes de cada região. Só uma pequena parte está inscrita como variedade de conservação.", "The <strong>traditional varieties</strong> we hear so much about are a much wider set. DGAV describes them as a significant part of the country’s genetic heritage, often tied to the culture and knowledge of each region. Only a small part is registered as a conservation variety.")} ${S("dgav-rg")}</p>
  </div>`, "variedade")}
  <div class="tiles">
    <div class="tile"><span class="v">${V.length}<small>${tr("variedades", "varieties")}</small></span><span class="k">${tr(`de conservação inscritas no CNV ${D.edicao}`, `conservation varieties listed in the ${D.edicao} CNV`)}</span><span class="s">${tr(`em ${nEsp} espécies, ${nHorta} de interesse para a horta`, `in ${nEsp} species, ${nHorta} of interest to the garden`)}</span></div>
    <div class="tile"><span class="v">10 000+<small>${tr("acessos", "accessions")}</small></span><span class="k">${tr("no Banco Português de Germoplasma Vegetal", "in the Portuguese Plant Germplasm Bank")}</span><span class="s">${tr("em sementes e plantas vivas, em Braga", "as seed and living plants, in Braga")}</span></div>
    <div class="tile"><span class="v">${tr("Todos os anos", "Every year")}</span><span class="k">${tr("sai um novo Catálogo Nacional", "a new National Catalogue is published")}</span><span class="s">${tr("a lista de variedades pode mudar", "the variety list can change")}</span></div>
  </div>
</section>

<section id="variedades">
  <div class="sec-head"><span class="eyebrow">${tr("2 · Variedades inscritas", "2 · Registered varieties")}</span><h2>${tr("As variedades de conservação em Portugal", "Conservation varieties in Portugal")}</h2></div>
  ${duo(`<div class="prose"><p>${tr(`São todas as que o CNV de ${D.edicao} traz nas secções «Variedades de Conservação». Para cada uma, a região de origem é aquela em que a variedade é tradicionalmente cultivada e a que está naturalmente adaptada.`, `These are all those that the ${D.edicao} CNV lists in its “Conservation Varieties” sections. For each one, the region of origin is where the variety is traditionally grown and to which it is naturally adapted.`)} ${S("cnv")}</p></div>
  <div class="sm-chips" id="sm-esp" role="group" aria-label="${tr("Filtrar por espécie", "Filter by species")}"><button type="button" data-e="todas" aria-pressed="true">${tr("Todas", "All")}</button>${especies(V).map((e) => `<button type="button" data-e="${esc(e)}" aria-pressed="false">${esc(EN ? V.find((v) => v.especie_pt.startsWith(e)).especie_en.replace(/\s*\(.*\)/, "") : e)}</button>`).join("")}</div>
  <p class="sm-conta" id="sm-conta" aria-live="polite"></p>
`, "espigueiros")}<div class="tscroll full"><table class="sm-tab"><thead><tr><th>${tr("Variedade", "Variety")}</th><th>${tr("Espécie", "Species")}</th><th>${tr("Região de origem", "Region of origin")}</th><th>${tr("Quem a mantém", "Maintained by")}</th><th>${tr("Inscrita", "Listed")}</th></tr></thead><tbody id="sm-corpo"></tbody></table></div>
  <p class="sm-nota">${tr("Para a horta interessam sobretudo o feijão, a abóbora-porqueira e o grão-de-bico; as outras são cereais. Não há nenhuma variedade de conservação de tomate, alface, couve, cebola ou de outras espécies de horta nesta edição. Isso não quer dizer que não existam variedades tradicionais dessas espécies, só que não estão inscritas como tal.", "For the garden, the ones that matter most are the bean, the field pumpkin and the chickpea; the others are cereals. This edition lists no conservation variety of tomato, lettuce, cabbage, onion or other garden species. That does not mean there are no traditional varieties of those species, only that they are not registered as such.")}</p>
  <p class="sm-nota">${tr("O regime vem do Decreto-Lei n.º 257/2009 (espécies agrícolas) e do Decreto-Lei n.º 54/2011 (hortícolas); o regime geral do catálogo é o do Decreto-Lei n.º 42/2017. Quem quer plantar o que já tem na horta pode escolher uma destas variedades, ou pedir material ao banco de germoplasma (abaixo).", "The regime comes from Decree-Law 257/2009 (agricultural species) and Decree-Law 54/2011 (vegetables); the general catalogue regime is Decree-Law 42/2017. If you want to plant what is already in your garden, you can choose one of these varieties, or ask the germplasm bank for material (below).")} ${S("cnv")} · ${S("dgav-rg")}</p>
</section>

<section id="onde">
  <div class="sec-head"><span class="eyebrow">${tr("3 · Onde encontrar", "3 · Where to find seed")}</span><h2>${tr("Três sítios oficiais para procurar", "Three official places to look")}</h2></div>
  <div class="sm-tres">
    <div><h3>${tr("Banco de germoplasma", "Germplasm bank")}</h3>
      <p>${tr("O <strong>Banco Português de Germoplasma Vegetal</strong> (BPGV, do INIAV, em Braga) guarda sementes e plantas vivas, sobretudo de culturas portuguesas e dos seus parentes silvestres: cereais, leguminosas de grão, hortícolas, aromáticas e medicinais, forrageiras, pastagens e fruteiras. Tem mais de 10 000 acessos e é mantido como bem público global ao abrigo do Tratado Internacional da FAO.", "The <strong>Portuguese Plant Germplasm Bank</strong> (BPGV, part of INIAV, in Braga) keeps seed and living plants, mainly of Portuguese crops and their wild relatives: cereals, grain legumes, vegetables, aromatic and medicinal plants, forage, pasture and fruit species. It holds over 10,000 accessions and is kept as a global public good under the FAO International Treaty.")}</p>
      <p>${tr("Existe para que o material esteja disponível a agricultores, melhoradores e investigadores. O site tem um catálogo de acessos e um carrinho de pedidos. As condições de cedência e o contacto estão no próprio site.", "It exists so that material is available to farmers, plant breeders and researchers. The site has an accession catalogue and an order cart. The supply conditions and contact are on the site itself.")}</p>
      <p class="sm-fonte">${S("bpgv")}</p></div>
    <div><h3>${tr("Catálogo Nacional", "National catalogue")}</h3>
      <p>${tr("A produção, a certificação e a venda de semente de espécies agrícolas e hortícolas reguladas só são permitidas para variedades registadas nos catálogos comuns da União ou no <strong>Catálogo Nacional de Variedades</strong>. A DGAV publica-o todos os anos, com a denominação, as características, o proponente e quem faz a manutenção de cada variedade.", "The production, certification and sale of seed of regulated agricultural and vegetable species are only allowed for varieties registered in the Union’s common catalogues or in the <strong>National Catalogue of Varieties</strong>. DGAV publishes it every year, with the name, characteristics, proponent and maintainer of each variety.")}</p>
      <p>${tr("Por isso, a semente que se compra embalada, numa loja, vem de variedades da lista. Se a variedade que procuras não aparece, pode ser tradicional e não estar inscrita: o banco de germoplasma é o sítio a tentar.", "That is why seed bought packed in a shop comes from varieties on the list. If the variety you are looking for does not appear, it may be traditional and unregistered: the germplasm bank is the place to try.")}</p>
      <p class="sm-fonte">${S("cnv")}</p></div>
    <div><h3>${tr("Semente biológica", "Organic seed")}</h3>
      <p>${tr("A DGADR mantém a <strong>Base de Dados de Material de Reprodução Vegetal</strong>, onde se vê que variedades existem em modo biológico ou em conversão e quem as fornece. Quem produz em modo biológico começa por aqui (secção seguinte).", "DGADR keeps the <strong>Plant Reproductive Material Database</strong>, where you can see which varieties exist in organic or in-conversion form and who supplies them. Anyone farming organically starts here (next section).")}</p>
      <p>${tr("A base tem uma secção «Variedades», com o que existe, e uma «Fornecedor», com quem o vende. Quem vende semente biológica ou em conversão pede o registo de fornecedor na mesma base.", "The database has a “Varieties” section, with what exists, and a “Supplier” section, with who sells it. Anyone selling organic or in-conversion seed asks for supplier registration in the same database.")}</p>
      <p class="sm-fonte">${S("dgadr-bd")}</p></div>
  </div>
</section>

<section id="guardar">
  <div class="sec-head"><span class="eyebrow">${tr("4 · Guardar semente", "4 · Saving seed")}</span><h2>${tr("Que culturas se guardam bem", "Which crops save well")}</h2></div>
  ${duo(`<div class="prose"><p>${tr("As plantas <strong>autofecundadas</strong> (feijão, ervilha, alface, tomate, beringela) dão semente igual à planta-mãe sem grande cuidado e são as mais fáceis. As de <strong>polinização cruzada</strong> trocam pólen com outras variedades da mesma espécie, por vento ou por insetos, e a semente pode sair diferente se estiverem perto. As <strong>bienais</strong> só florescem e dão semente no segundo ano.", "<strong>Self-pollinated</strong> plants (bean, pea, lettuce, tomato, aubergine) give seed true to the parent plant without much care and are the easiest. <strong>Cross-pollinated</strong> ones swap pollen with other varieties of the same species, by wind or insects, and the seed may come out different if they are close. <strong>Biennials</strong> only flower and set seed in their second year.")} ${S("uc-placer")}</p></div>
  <div class="sm-chips" id="sm-gf" role="group" aria-label="${tr("Filtrar culturas", "Filter crops")}"><button type="button" data-f="todas" aria-pressed="true">${tr("Todas", "All")}</button><button type="button" data-f="self" aria-pressed="false">${tr("Autofecundadas", "Self-pollinated")}</button><button type="button" data-f="cross" aria-pressed="false">${tr("Cruzam entre variedades", "Cross between varieties")}</button><button type="button" data-f="bienal" aria-pressed="false">${tr("Bienais", "Biennials")}</button></div>
  <p class="sm-conta" id="sm-gconta" aria-live="polite"></p>
`, "guardadas")}<div class="tscroll full"><table class="sm-tab"><thead><tr><th>${tr("Cultura", "Crop")}</th><th>${tr("Polinização", "Pollination")}</th><th>${tr("Isolamento entre variedades", "Isolation between varieties")}</th><th>${tr("Semente dura (anos)", "Seed lasts (years)")}</th><th>${tr("Notas", "Notes")}</th></tr></thead><tbody id="sm-gcorpo"></tbody></table></div>
  <p class="sm-nota">${tr("O isolamento é a distância a que devem estar variedades diferentes da mesma espécie para não se cruzarem. A fonte dá-a em pés e milhas; convertemos para metros. A durabilidade é uma média, não uma garantia: depende de como a planta cresceu e de como a semente foi guardada. As distâncias variam muito de fonte para fonte (há quem recomende bastante mais para as culturas de polinização cruzada), por isso trata-as como ponto de partida.", "Isolation is the distance at which different varieties of the same species should be kept so that they do not cross. The source gives it in feet and miles; we converted to metres. Longevity is an average, not a guarantee: it depends on how the plant grew and how the seed was stored. Distances vary a lot between sources (some recommend considerably more for cross-pollinated crops), so treat them as a starting point.")} ${S("uc-placer")}</p>
  <h3 class="sm-h3">${tr("Sem espaço para tanta distância", "No room for that much distance")}</h3>
  <ul class="sm-tecnicas">
    <li><strong>${tr("No espaço", "In space")}</strong><span>${tr("Cultivar só uma variedade de cada espécie. Se a polinização é por insetos, algumas centenas de metros costumam chegar; se é pelo vento, a distância tem de ser maior. Uma sebe densa e muitas flores à volta ajudam a reduzir o transporte de pólen.", "Grow only one variety of each species. If insects pollinate, a few hundred metres is usually enough; if the wind does, the distance must be greater. A dense hedge and plenty of flowers around help reduce pollen movement.")}</span></li>
    <li><strong>${tr("No tempo", "In time")}</strong><span>${tr("Semear duas variedades em épocas diferentes, para que não floresçam ao mesmo tempo. Pede que conheças bem o ciclo e a época de floração da cultura.", "Sow two varieties at different times so that they do not flower together. You need to know the crop’s cycle and flowering time well.")}</span></li>
    <li><strong>${tr("Com barreiras", "With barriers")}</strong><span>${tr("Uma tela mosquiteira muito fina sobre uma flor, um ramo, a planta inteira ou um túnel impede a entrada dos insetos. Num túnel só se cultiva uma variedade de cada espécie; para duas variedades de cruzamento por insetos, abrem-se os túneis em dias alternados durante a floração.", "A very fine insect mesh over a flower, a branch, the whole plant or a tunnel keeps insects out. Under a tunnel you grow only one variety of each species; for two insect-crossing varieties, the tunnels are opened on alternate days during flowering.")}</span></li>
  </ul>
  <p class="sm-nota">${tr("Fonte das técnicas: ", "Source of the techniques: ")}${S("diyseeds")}${tr(". Para planear quando semear cada cultura, vê o ", ". To plan when to sow each crop, see the ")}<a href="${comLang("/calendario/planeador-horta.html")}">${tr("Planeador de horta", "Garden planner")}</a>.</p>
</section>

<section id="biologico">
  <div class="sec-head"><span class="eyebrow">${tr("5 · Em modo biológico", "5 · Organic farming")}</span><h2>${tr("O que muda se produzes em biológico", "What changes if you farm organically")}</h2></div>
  ${duo(`<div class="prose"><p>${tr("Todas as plantas e produtos vegetais biológicos devem ser cultivados a partir de material de reprodução conforme com as normas biológicas (sementes, estacas, rizomas…). Cada país da União tem de manter uma base de dados nacional de sementes biológicas para que os agricultores encontrem fornecedores, e desde 1 de janeiro de 2022 essas bases têm de incluir também o material em conversão (Regulamento (UE) 2018/848).", "All organic plants and plant products must be grown from reproductive material (seed, cuttings, rhizomes…) that meets organic rules. Each EU country must keep a national organic seed database so that farmers can find suppliers, and since 1 January 2022 those databases must also include in-conversion material (Regulation (EU) 2018/848).")} ${S("ue-sementes")}</p></div>
  <ol class="sm-passos">
    <li><strong>${tr("Consulta a base de dados", "Check the database")}</strong><span>${tr("Vê se há uma variedade biológica ou em conversão que sirva ao que precisas.", "See whether there is an organic or in-conversion variety that meets your needs.")}</span><small>${S("dgadr-bd")}</small></li>
    <li><strong>${tr("Se nenhuma serve, pede autorização", "If none will do, ask for authorisation")}</strong><span>${tr("Podes pedir autorização para usar semente e batata-semente não produzidas em modo biológico. O pedido faz-se preenchendo e enviando ao teu organismo de controlo o formulário «Pedido de autorização de utilização de material de reprodução vegetal não biológico».", "You can ask for authorisation to use seed and seed potatoes not produced organically. The request is made by filling in and sending to your control body the form “Request for authorisation to use non-organic plant reproductive material”.")}</span><small>${S("dgadr-bd")}</small></li>
    <li><strong>${tr("Se és tu quem fornece", "If you are the supplier")}</strong><span>${tr("Quem vende material biológico ou em conversão pode registar-se como fornecedor na mesma base de dados, para tornar pública a disponibilidade.", "Whoever sells organic or in-conversion material can register as a supplier in the same database, to make the availability public.")}</span><small>${S("dgadr-bd")}</small></li>
  </ol>
`, "jovens")}<p class="sm-nota">${tr("Para saber que apoios existem a quem produz em modo biológico, vê os ", "To see what supports exist for organic producers, see the ")}<a href="${comLang("/calendario/apoios.html")}">${tr("Apoios", "Supports")}</a>${tr("; para planear a sementeira e a colheita, o ", "; to plan sowing and harvest, the ")}<a href="${comLang("/calendario/planeador-horta.html")}">${tr("Planeador de horta", "Garden planner")}</a>${tr("; e para vender, os ", "; and to sell, ")}<a href="${comLang("/calendario/circuitos-curtos.html")}">${tr("Circuitos curtos", "Short chains")}</a>.</p>
</section>

<section id="limites">
  <div class="sec-head"><span class="eyebrow">${tr("6 · Limites e fontes", "6 · Limits and sources")}</span><h2>${tr("O que esta página não faz", "What this page does not do")}</h2></div>
  <ol class="notes">
    <li>${tr("<strong>Não é aconselhamento jurídico.</strong> É um resumo de páginas oficiais; os diplomas mudam e o que vale é o texto em vigor. Confirma com a DGAV ou a tua DRAP.", "<strong>It is not legal advice.</strong> It is a summary of official pages; laws change and the text in force prevails. Check with DGAV or your regional directorate (DRAP).")}</li>
    <li>${tr("<strong>Não cobre guardar e trocar sementes entre pessoas.</strong> Os textos oficiais que lemos tratam da produção, certificação e venda de semente; não encontrámos neles regras sobre guardar semente para uso próprio ou trocá-la, e não as inventamos. Pergunta à DGAV antes de vender ou distribuir semente em grande quantidade.", "<strong>It does not cover saving and swapping seeds between people.</strong> The official texts we read deal with the production, certification and sale of seed; we found no rules in them about saving seed for your own use or swapping it, and we do not make them up. Ask DGAV before selling or distributing seed in quantity.")}</li>
    <li>${tr(`<strong>A lista é a de ${D.edicao}.</strong> O CNV sai todos os anos e pode ganhar ou perder variedades. As secções «Variedades de Conservação» foram contadas por nós a partir do PDF.`, `<strong>The list is the ${D.edicao} one.</strong> The CNV is published every year and may gain or lose varieties. We counted the “Conservation Varieties” sections ourselves from the PDF.`)}</li>
    <li>${tr("<strong>O quadro de guardar semente é de uma só fonte</strong>, os horticultores voluntários do condado de Placer (Califórnia, Universidade da Califórnia), com medidas em pés e milhas. Cobre 19 grupos de hortícolas e não os classifica todos quanto à facilidade. Não encontrámos um quadro português com fonte que possamos verificar, nem incluímos redes de troca de sementes pela mesma razão.", "<strong>The seed-saving chart comes from a single source</strong>, the Placer County master gardeners (California, University of California), with measures in feet and miles. It covers 19 groups of vegetables and does not rate all of them for ease. We found no Portuguese chart with a source we can verify, and we also leave out seed-swap networks for the same reason.")}</li>
    <li>${tr("<strong>Termos:</strong> explicamos variedade de conservação, Catálogo Nacional, banco de germoplasma, semente biológica e polinização cruzada no ", "<strong>Terms:</strong> we explain conservation variety, National Catalogue, germplasm bank, organic seed and cross-pollination in the ")}<a href="${comLang("/glossario.html#variedade-conservacao")}">${tr("Glossário", "Glossary")}</a>.</li>
  </ol>
  <div class="srcs">${Object.entries(F).map(([, f]) => `<div class="srcc"><h3>${esc(EN ? f.nome_en : f.nome)}</h3><p>${esc(EN ? f.usa_en : f.usa_pt)}</p><span class="u"><a href="${f.url}" target="_blank" rel="noopener">${f.url}</a></span></div>`).join("")}</div>
</section>`;

    /* tabela das variedades */
    const corpo = document.getElementById("sm-corpo"), conta = document.getElementById("sm-conta");
    let esp = "todas";
    const linha = (v) => `<tr id="${v.id}"><th scope="row">${esc(v.nome)}</th><td>${esc(EN ? v.especie_en : v.especie_pt)}<small>${esc(v.cient)}</small></td><td>${esc(EN ? v.regiao_en : v.regiao_pt)}</td><td>${esc(v.resp)}</td><td>${v.ano}</td></tr>`;
    const pintar = () => {
      const sel = filtrar(V, esp);
      conta.textContent = sel.length === V.length ? tr(`${sel.length} variedades`, `${sel.length} varieties`) : tr(`${sel.length} de ${V.length} variedades`, `${sel.length} of ${V.length} varieties`);
      corpo.innerHTML = sel.map(linha).join("");
    };
    document.querySelectorAll("#sm-esp button").forEach((b) => b.addEventListener("click", () => {
      document.querySelectorAll("#sm-esp button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      esp = b.dataset.e; pintar();
    }));
    pintar();

    /* quadro de guardar semente */
    const gcorpo = document.getElementById("sm-gcorpo"), gconta = document.getElementById("sm-gconta");
    const POL = { self: ["Autofecundada", "Self-pollinated"], cross: ["Cruzada", "Cross-pollinated"], both: ["Ambas", "Both"] }, AG = { vento: ["vento", "wind"], insetos: ["insetos", "insects"] };
    const pol = (c) => `${tr(POL[c.polin][0], POL[c.polin][1])}${c.agente ? ` <span class="sm-ag">${tr("por " + AG[c.agente][0], "by " + AG[c.agente][1])}</span>` : ""}`;
    const glinha = (c) => `<tr id="g-${c.id}"><th scope="row">${esc(EN ? c.en : c.pt)}<small>${esc(c.cient)}${c.ciclo === "B" ? " · " + tr("bienal", "biennial") : ""}</small></th><td>${pol(c)}${c.facil === "facil" ? ` <span class="sm-tag">${tr("fácil", "easy")}</span>` : c.facil === "facil-cruza" ? ` <span class="sm-tag">${tr("fácil, mas cruza", "easy, but crosses")}</span>` : ""}</td><td>${distancia(c.iso_m, EN)}</td><td>${durabilidade(c.anos, EN)}</td><td>${esc((EN ? c.nota_en : c.nota_pt) || "")}</td></tr>`;
    let gf = "todas";
    const pintarG = () => {
      const sel = filtrarGuardar(D.guardar, gf);
      gconta.textContent = sel.length === D.guardar.length ? tr(`${sel.length} culturas`, `${sel.length} crops`) : tr(`${sel.length} de ${D.guardar.length} culturas`, `${sel.length} of ${D.guardar.length} crops`);
      gcorpo.innerHTML = sel.map(glinha).join("");
    };
    document.querySelectorAll("#sm-gf button").forEach((b) => b.addEventListener("click", () => {
      document.querySelectorAll("#sm-gf button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      gf = b.dataset.f; pintarG();
    }));
    pintarG();
  }
})();

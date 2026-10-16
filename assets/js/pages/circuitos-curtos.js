/* Conhecimento para cuidar · Circuitos curtos.
   Dados: /data/circuitos-curtos.json (resumo editorial do Guia Geral de Apoio à Criação de CCA do projeto AproximaR,
   das páginas da Rede Rural Nacional e do texto da Portaria 74/2014 publicado pela DGAV; cada bloco diz a fonte).
   A calculadora segue o método do guia: custos de produção + custos de comercialização e distribuição + margem, e a
   verificação do que a venda rende por hora. Nada é guardado nem enviado: os números ficam no teu browser. */
(function () {
  "use strict";

  /* ---------- cálculo (exportado para os testes) ---------- */
  const num = (v) => { const n = typeof v === "number" ? v : parseFloat(String(v).replace(",", ".")); return Number.isFinite(n) && n >= 0 ? n : 0; };
  /* Preço mínimo por unidade (kg…): (produção + mão de obra + comercialização) / quantidade, mais a margem em %. */
  function precoVenda(o) {
    const kg = num(o.kg), producao = num(o.producao), maoDeObra = num(o.maoDeObra), venda = num(o.venda), margem = num(o.margem);
    if (kg <= 0) return null;
    const custoTotal = producao + maoDeObra + venda, custoKg = custoTotal / kg;
    return { custoTotal, custoKg, vendaKg: venda / kg, precoKg: custoKg * (1 + margem / 100), margemKg: custoKg * (margem / 100) };
  }
  /* Um dia de venda: faturação, o que fica depois dos custos desse dia e o que rende cada hora gasta (preparar, viajar, vender). */
  function diaDeVenda(o) {
    const kg = num(o.kg), preco = num(o.preco), horas = num(o.horas), custos = num(o.custos);
    const faturacao = kg * preco, liquido = faturacao - custos;
    return { faturacao, liquido, porHora: horas > 0 ? liquido / horas : null };
  }
  /* Modalidades que o guia associa ao objetivo escolhido (todas se não houver objetivo). */
  const filtrar = (modalidades, objetivo) => modalidades.filter((m) => !objetivo || objetivo === "todos" || m.tags.includes(objetivo));
  window.BioCulturaCircuitos = { num, precoVenda, diaDeVenda, filtrar };

  const G = window.BioCulturaGraficos, box = document.getElementById("relatorio-circuitos");
  if (!G || !box) return;
  const { EN, tr, fmt, esc } = G;

  if (EN) {
    document.querySelectorAll("[data-en]").forEach((n) => { n.innerHTML = n.dataset.en; });
    document.querySelectorAll("[data-en-label]").forEach((n) => n.setAttribute("aria-label", n.dataset.enLabel));
    document.title = "Short chains — bioCulture";
  }
  fetch("/sidebar-content.html?v=25").then((r) => (r.ok ? r.text() : "")).then((h) => { const sb = document.getElementById("sidebar"); if (h && sb) sb.innerHTML = h; }).catch(() => {});
  const barraFixa = () => { const el = document.createElement("script"); el.src = "/assets/js/biocultura-sticky-nav.js?v=17"; document.body.appendChild(el); };
  const langQ = new URLSearchParams(location.search).get("lang");
  const comLang = (href) => {
    if (!langQ) return href;
    const [p, hash] = href.split("#");
    return p + (p.includes("?") ? "&" : "?") + "lang=" + encodeURIComponent(langQ) + (hash ? "#" + hash : "");
  };
  const voltar = document.getElementById("circuitos-voltar");
  if (voltar) voltar.setAttribute("href", comLang("/calendario/conhecimento-cuidar.html"));

  fetch("/data/circuitos-curtos.json?v=1").then((r) => { if (!r.ok) throw new Error("circuitos " + r.status); return r.json(); })
    .then((D) => { build(D); barraFixa(); irParaHash(); })
    .catch((e) => { console.error(e); barraFixa(); box.innerHTML = `<p class="prose">${tr("Não foi possível carregar os dados desta página.", "The data for this page could not be loaded.")}</p>`; });
  const irParaHash = () => {
    let alvo = null;
    try { alvo = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null; } catch (e) { alvo = null; }
    if (alvo) setTimeout(() => alvo.scrollIntoView({ block: "start" }), 60);
  };

  const euro = (v) => (v == null || !Number.isFinite(v) ? "–" : fmt(v, 2) + " €");

  function build(D) {
    const F = D.fontes, S = (id) => `<a href="${F[id].url}" target="_blank" rel="noopener">${esc(EN ? F[id].nome_en : F[id].nome)}</a>`;
    const nome = (m) => (EN ? m.en : m.pt), lista = (a) => `<ul>${a.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;

    const LEGAL = [
      [tr("Início de atividade e impostos", "Starting up and taxes"), tr("Antes de vender, trata do início de atividade e das obrigações com as Finanças (IVA, IRS, faturação). A Autoridade Tributária tem um regime forfetário próprio para os produtores agrícolas.", "Before selling, handle the start of activity and your obligations to the tax authority (VAT, income tax, invoicing). The tax authority has a flat-rate regime of its own for farm producers."), "rr-lei"],
      [tr("Higiene dos alimentos", "Food hygiene"), tr("A produção e a venda de produtos locais seguem as regras europeias de higiene (Regulamento (CE) n.º 852/2004 e, para os de origem animal, o n.º 853/2004). Para pequenas quantidades de alguns produtos há derrogações, na Portaria n.º 74/2014 (mais abaixo).", "Producing and selling local products follow the EU hygiene rules (Regulation (EC) 852/2004 and, for animal-origin foods, 853/2004). For small quantities of some products there are derogations, in Ordinance 74/2014 (below)."), "rr-lei"],
      [tr("Licenciamento comercial", "Commercial licensing"), tr("O acesso às atividades de comércio, serviços e restauração faz-se pelo regime do Decreto-Lei n.º 10/2015, através do Balcão do Empreendedor.", "Access to trade, services and catering activities follows Decree-Law 10/2015, through the Entrepreneur’s Counter (Balcão do Empreendedor)."), "rr-lei"],
      [tr("Mercado local de produtores", "Local producers’ market"), tr("O regime dos mercados locais de produtores é o do Decreto-Lei n.º 85/2015. Os produtores têm de ter a atividade licenciada ou registada, e a produção local é a do concelho do mercado e dos concelhos limítrofes. Cada município tem o seu regulamento (espaço, taxas, regras).", "The regime of local producers’ markets is Decree-Law 85/2015. Producers must have a licensed or registered activity, and local production means that of the market’s municipality and its neighbours. Each municipality has its own regulation (space, fees, rules)."), "guia"],
      [tr("Rotulagem", "Labelling"), tr("Os alimentos pré-embalados têm rotulagem obrigatória (Regulamento (UE) n.º 1169/2011 e Decreto-Lei n.º 26/2016).", "Pre-packed foods have mandatory labelling (Regulation (EU) 1169/2011 and Decree-Law 26/2016)."), "rr-lei"],
      [tr("Fruta e hortícolas frescos", "Fresh fruit and vegetables"), tr("Quem comercializa frutas e produtos hortícolas frescos deve pedir o Número de Operador Hortofrutícola. As normas de comercialização têm algumas exceções, previstas no artigo 4.º do Regulamento de Execução (UE) n.º 543/2011.", "Those who market fresh fruit and vegetables must apply for a Fruit and Vegetable Operator Number. Marketing standards have some exceptions, in Article 4 of Implementing Regulation (EU) 543/2011."), "rr-lei"],
      [tr("Transformados (compotas, queijos, enchidos, pão…)", "Processed foods (jams, cheeses, cured meats, bread…)"), tr("A transformação tem licenciamento próprio, no Sistema da Indústria Responsável (Decreto-Lei n.º 73/2015).", "Processing has its own licensing, in the Responsible Industry System (Decree-Law 73/2015)."), "rr-lei"],
      [tr("Vender como biológico", "Selling as organic"), tr("Para vender como biológico a produção tem de estar sob um organismo de controlo e certificada (Regulamento (UE) 2018/848), e a notificação faz-se na DGADR. Os mercados biológicos são reservados a produtores certificados.", "To sell as organic, production must be under a control body and certified (Regulation (EU) 2018/848), and notification is made at DGADR. Organic markets are reserved for certified producers."), "ue-bio"]
    ];
    const PEQ = [
      [tr("Produtos primários (hortícolas, fruta…)", "Primary products (vegetables, fruit…)"), tr("Fornecimento direto ao consumidor, ao comércio retalhista local ou à restauração só no concelho do local de produção e nos concelhos limítrofes (menos em mostras promocionais de produtos regionais). Tem de ir acompanhado de um documento comercial com a marca de exploração, o registo da atividade ou outro código que identifique a origem.", "Direct supply to consumers, local retail or catering only in the municipality of production and neighbouring ones (except at promotional shows of regional products). It must come with a commercial document showing the farm mark, the activity registration or another code identifying the origin.")],
      [tr("Ovos", "Eggs"), tr("Até 350 ovos por semana, para quem tem até 50 galinhas, com registo prévio na DGAV (informação da DGAV, 2026).", "Up to 350 eggs a week, for those with up to 50 hens, with prior registration at DGAV (DGAV information, 2026).")],
      [tr("Leite cru de vaca", "Raw cow’s milk"), tr("Até 80 litros por dia, diretamente ao consumidor, e a exploração tem de ser oficialmente indemne de brucelose e de tuberculose.", "Up to 80 litres a day, directly to the consumer, and the holding must be officially free of brucellosis and tuberculosis.")],
      [tr("Aves de capoeira, coelhos e aves de caça de criação abatidas na exploração", "Poultry, rabbits and farmed game birds slaughtered on the farm"), tr("Precisam de autorização prévia do Diretor-Geral de Alimentação e Veterinária.", "They need prior authorisation from the Director-General of Food and Veterinary Affairs.")],
      [tr("Mel e outros produtos apícolas", "Honey and other bee products"), tr("O regime mudou em 2026 (Decreto-Lei n.º 137/2026 e Portaria n.º 335/2026/1): não mostramos quantidades, confirma o regime em vigor e o registo na DGAV.", "The regime changed in 2026 (Decree-Law 137/2026 and Ordinance 335/2026/1): we show no quantities, check the regime in force and the registration at DGAV.")]
    ];

    box.innerHTML = `
<section id="sumario">
  <div class="sec-head"><span class="eyebrow">${tr("1 · Sumário", "1 · Summary")}</span><h2>${tr("O que é um circuito curto", "What a short chain is")}</h2></div>
  <div class="prose">
    <p>${tr("Um circuito curto agroalimentar é um modo de comercialização em que o produtor vende <strong>diretamente ao consumidor</strong> ou através de <strong>um único intermediário</strong>, com proximidade geográfica entre os dois. Para a Rede Rural Nacional, a proximidade é o concelho de produção e os concelhos limítrofes; o projeto AproximaR usou a de uma lei de 2019 (a mesma NUTS III do local de consumo, ou uma adjacente). Quem compra fica a saber de onde vem o produto e como foi feito; quem produz fica, em regra, com mais do preço, e com mais trabalho de venda.", "A short agri-food chain is a way of marketing in which the producer sells <strong>directly to the consumer</strong> or through <strong>a single intermediary</strong>, with geographic proximity between the two. For the National Rural Network, proximity means the producing municipality and its neighbours; the AproximaR project used the one in a 2019 law (the same NUTS III as the place of consumption, or an adjacent one). Buyers learn where the product comes from and how it was made; producers generally keep more of the price, and take on more selling work.")} ${S("rr-conceito")} · ${S("guia")}</p>
  </div>
  <div class="tiles">
    <div class="tile"><span class="v">${D.modalidades.length}<small>${tr("maneiras", "ways")}</small></span><span class="k">${tr("de vender direto, no guia nacional", "of selling direct, in the national guide")}</span><span class="s">${tr("cada uma com o que pede, vantagens e inconvenientes", "each with what it asks for, pros and cons")}</span></div>
    <div class="tile"><span class="v">≤ 1</span><span class="k">${tr("intermediário", "intermediary")}</span><span class="s">${tr("a regra que define o circuito curto", "the rule that defines a short chain")}</span></div>
    <div class="tile"><span class="v">${tr("Concelho", "Municipality")}</span><span class="k">${tr("de produção e limítrofes", "of production and neighbours")}</span><span class="s">${tr("a proximidade na lei da venda direta", "the proximity in the direct-sale law")}</span></div>
    <div class="tile"><span class="v">DL 85/2015</span><span class="k">${tr("regime dos mercados locais de produtores", "regime of local producers’ markets")}</span><span class="s">${tr("cada município tem o seu regulamento", "each municipality has its own regulation")}</span></div>
  </div>
</section>

<section id="caminhos">
  <div class="sec-head"><span class="eyebrow">${tr("2 · Maneiras de vender", "2 · Ways to sell")}</span><h2>${tr("Qual serve melhor a tua exploração?", "Which suits your holding best?")}</h2></div>
  <div class="prose"><p>${tr("Escolhe o que mais te importa e vê as maneiras que o guia associa a isso. Nenhuma é a melhor: cada uma troca tempo, dinheiro e risco de maneira diferente, e dá para combinar várias.", "Pick what matters most and see the ways the guide associates with it. None is the best: each trades time, money and risk differently, and you can combine several.")}</p></div>
  <div class="cc-chips" id="cc-obj" role="group" aria-label="${tr("O que mais importa", "What matters most")}"><button type="button" data-o="todos" aria-pressed="true">${tr("Todas", "All")}</button>${D.objetivos.map((o) => `<button type="button" data-o="${o.id}" aria-pressed="false">${esc(EN ? o.en : o.pt)}</button>`).join("")}</div>
  <p class="cc-conta" id="cc-conta" aria-live="polite"></p>
  <div class="cc-grelha" id="cc-lista"></div>
  <p class="cc-nota">${tr("Fonte de todos os cartões: ", "Source of all cards: ")}${S("guia")}${tr(" (secção II). Se vendes em grupo, o PEPAC tem concursos para criar agrupamentos e organizações de produtores: vê-os em ", " (section II). If you sell as a group, the CAP Plan has calls for creating producer groups and organisations: see them in ")}<a href="${comLang("/calendario/apoios.html#concursos")}">${tr("Apoios", "Supports")}</a>.</p>
</section>

<section id="legal">
  <div class="sec-head"><span class="eyebrow">${tr("3 · Vender legalmente", "3 · Selling legally")}</span><h2>${tr("O que tratar antes de vender", "What to settle before selling")}</h2></div>
  <div class="prose"><p>${tr("A Rede Rural Nacional reúne as obrigações de quem vende em circuito curto. É uma lista de orientação: a legislação citada é, em boa parte, de 2012 a 2016, e algumas regras já mudaram. Confirma sempre o texto em vigor, com a tua DRAP, a DGAV ou a câmara municipal.", "The National Rural Network gathers the obligations of those who sell in short chains. It is a guidance list: much of the legislation cited dates from 2012 to 2016, and some rules have since changed. Always check the text in force, with your regional directorate (DRAP), DGAV or your municipality.")}</p></div>
  <ol class="cc-legal">${LEGAL.map((l) => `<li><strong>${l[0]}</strong><span>${l[1]}</span><small>${tr("Fonte", "Source")}: ${S(l[2])}</small></li>`).join("")}</ol>
  <h3 class="cc-h3">${tr("Pequenas quantidades: o que a lei dispensa", "Small quantities: what the law exempts")}</h3>
  <p class="cc-aviso">${tr("A Portaria n.º 74/2014 foi alterada em 12 de agosto de 2026 (Portaria n.º 333/2026/1) e o mel passou para um regime próprio. Os números abaixo são os do texto de 2014 e da DGAV; se mudaram, valem os do texto em vigor.", "Ordinance 74/2014 was amended on 12 August 2026 (Ordinance 333/2026/1) and honey moved to a regime of its own. The figures below are those of the 2014 text and of DGAV; if they changed, the text in force prevails.")}</p>
  <div class="tscroll full"><table class="cc-tab"><thead><tr><th>${tr("Produto", "Product")}</th><th>${tr("O que prevê", "What it provides")}</th></tr></thead><tbody>${PEQ.map((p) => `<tr><th scope="row">${p[0]}</th><td>${p[1]}</td></tr>`).join("")}</tbody></table></div>
  <p class="cc-nota">${S("portaria74")} · ${S("dgav-pq")} · ${S("dgav-ovos")}</p>
</section>

<section id="preco">
  <div class="sec-head"><span class="eyebrow">${tr("4 · Preço", "4 · Pricing")}</span><h2>${tr("A que preço vender", "What price to sell at")}</h2></div>
  <div class="prose"><p>${tr("O guia propõe três passos: somar os custos de produção até à colheita (sementes, água, renda, equipamento, mão de obra), acrescentar os custos de comercialização e distribuição, que costumam ser esquecidos, e só então aplicar a margem, olhando para o que se pratica no mercado. Depois, confirma quanto rende cada hora que gastas a vender.", "The guide proposes three steps: add the production costs up to harvest (seeds, water, rent, equipment, labour), add the marketing and distribution costs, which are often forgotten, and only then apply the margin, looking at what the market charges. Then check how much each hour you spend selling earns.")} ${S("guia")}</p></div>
  <div class="cc-calc">
    <form class="cc-form" id="cc-f1" autocomplete="off">
      <h3>${tr("1 · Preço mínimo por quilo", "1 · Minimum price per kilo")}</h3>
      <label>${tr("Quantidade vendida (kg)", "Quantity sold (kg)")}<input inputmode="decimal" name="kg" placeholder="500"></label>
      <label>${tr("Custos de produção (€)", "Production costs (€)")}<input inputmode="decimal" name="producao" placeholder="400"><small>${tr("sementes, plantas, fertilização, água, renda, equipamento…", "seeds, plants, fertilisation, water, rent, equipment…")}</small></label>
      <label>${tr("Mão de obra (€)", "Labour (€)")}<input inputmode="decimal" name="maoDeObra" placeholder="600"><small>${tr("o teu tempo também conta", "your time counts too")}</small></label>
      <label>${tr("Comercialização e distribuição (€)", "Marketing and distribution (€)")}<input inputmode="decimal" name="venda" placeholder="150"><small>${tr("transporte, embalagem, taxas de mercado, divulgação…", "transport, packaging, market fees, promotion…")}</small></label>
      <label>${tr("Margem que queres (%)", "Margin you want (%)")}<input inputmode="decimal" name="margem" placeholder="20"></label>
      <div class="cc-res" id="cc-r1" aria-live="polite"></div>
    </form>
    <form class="cc-form" id="cc-f2" autocomplete="off">
      <h3>${tr("2 · O que rende um dia de venda", "2 · What a selling day earns")}</h3>
      <label>${tr("Quilos vendidos nesse dia", "Kilos sold that day")}<input inputmode="decimal" name="kg" placeholder="40"></label>
      <label>${tr("Preço de venda (€/kg)", "Selling price (€/kg)")}<input inputmode="decimal" name="preco" placeholder="2,50"></label>
      <label>${tr("Horas gastas (preparar, viajar, vender)", "Hours spent (prepare, travel, sell)")}<input inputmode="decimal" name="horas" placeholder="7"></label>
      <label>${tr("Custos desse dia (€)", "That day’s costs (€)")}<input inputmode="decimal" name="custos" placeholder="25"><small>${tr("combustível, taxa do mercado, embalagens", "fuel, market fee, packaging")}</small></label>
      <div class="cc-res" id="cc-r2" aria-live="polite"></div>
    </form>
  </div>
  <p class="cc-nota">${tr("Os valores que escreves não saem do teu browser. Antes de fixar o preço, compara com produtos iguais em vários sítios (grandes superfícies, comércio local, outros produtores): um preço baixo demais pode fazer desconfiar da qualidade, e um alto demais afasta quem compra, diz o guia.", "The values you type never leave your browser. Before fixing the price, compare with identical products in several places (supermarkets, local shops, other producers): a price that is too low can make people doubt quality, and one too high puts buyers off, the guide says.")}</p>
</section>

<section id="comprar">
  <div class="sec-head"><span class="eyebrow">${tr("5 · Comprar bem", "5 · Buying well")}</span><h2>${tr("Se és tu quem compra", "If you are the one buying")}</h2></div>
  <div class="cc-duas">
    <div><h3>${tr("O que esperar", "What to expect")}</h3><ul>
      <li>${tr("Frescura e origem local identificada. Um mercado de produtores é reservado a produtores, com produtos exclusivamente de produção própria e de origem local identificada.", "Freshness and an identified local origin. A producers’ market is reserved for producers, with products exclusively of their own production and identified local origin.")} ${S("rr-mercado")}</li>
      <li>${tr("Confiança com quem produz: podes perguntar como e onde foi produzido, e é isso que o circuito curto vende.", "Trust with whoever grows it: you can ask how and where it was produced, and that is what the short chain sells.")}</li>
      <li>${tr("Comprar o que é da época. Vê o que há agora no ", "Buy what is in season. See what is in season now in the ")}<a href="${comLang("/calendario/calendario.html")}">${tr("Calendário", "Calendar")}</a>.</li></ul></div>
    <div><h3>${tr("O que pedir", "What to ask for")}</h3><ul>
      <li>${tr("Que a venda direta venha acompanhada de documento comercial com a marca de exploração ou outro código de origem: é o que a Portaria n.º 74/2014 pede ao produtor.", "That direct sales come with a commercial document showing the farm mark or another origin code: it is what Ordinance 74/2014 requires of the producer.")}</li>
      <li>${tr("Se o produto é vendido como biológico, o certificado do operador. Os mercados biológicos são reservados a produtores certificados.", "If the product is sold as organic, the operator’s certificate. Organic markets are reserved for certified producers.")} ${S("ue-bio")}</li></ul></div>
    <div><h3>${tr("O que pesa", "What weighs")}</h3><ul>
      <li>${tr("O «custo total» da alimentação pode subir, porque há que ir a vários sítios (carne, peixe, etc.) em vez de um só supermercado.", "The “total cost” of food can rise, because you must go to several places (meat, fish, etc.) instead of a single supermarket.")}</li>
      <li>${tr("Gasta-se mais tempo a comprar e a preparar os alimentos (lavar e arranjar os legumes).", "More time is spent buying and preparing food (washing and trimming vegetables).")}</li>
      <li>${tr("Fonte: ", "Source: ")}${S("guia")}${tr(", secção V.", ", section V.")}</li></ul></div>
  </div>
  <h3 class="cc-h3">${tr("Onde procurar", "Where to look")}</h3>
  <ul class="cc-onde">
    <li>${tr("A tua <strong>câmara municipal</strong> e a junta de freguesia: muitos mercados de produtores nascem da iniciativa de câmaras, juntas, grupos de ação local e grupos de produtores.", "Your <strong>municipality</strong> and parish council: many producers’ markets start on the initiative of municipalities, parish councils, local action groups and producer groups.")} ${S("rr-mercado")}</li>
    <li>${S("agrobio")}: ${tr("o mercado de produtos biológicos da associação.", "the association’s organic products market.")}</li>
    <li>${tr("A Rede Rural Nacional e o guia do AproximaR descrevem cada modalidade, com exemplos.", "The National Rural Network and the AproximaR guide describe each way, with examples.")} ${S("guia")}</li>
  </ul>
  <p class="cc-nota">${tr("Não incluímos uma lista de mercados e lojas: não encontrámos nenhuma lista nacional aberta e atual, e os mapas colaborativos que vimos misturam lojas de rações, de maquinaria e mercados que não são de produtores. Preferimos não te mandar para o sítio errado.", "We do not include a list of markets and shops: we found no open, current national list, and the collaborative maps we saw mix feed shops, machinery shops and markets that are not producers’ markets. We prefer not to send you to the wrong place.")}</p>
</section>

<section id="limites">
  <div class="sec-head"><span class="eyebrow">${tr("6 · Limites e fontes", "6 · Limits and sources")}</span><h2>${tr("O que esta página não faz", "What this page does not do")}</h2></div>
  <ol class="notes">
    <li>${tr("<strong>Não é aconselhamento jurídico nem fiscal.</strong> É um resumo de fontes oficiais e do guia nacional; as regras e as taxas dependem da tua atividade, do teu concelho e da data. Confirma com a DRAP, a DGAV, as Finanças e a câmara municipal.", "<strong>It is not legal or tax advice.</strong> It is a summary of official sources and the national guide; rules and fees depend on your activity, your municipality and the date. Check with your regional directorate (DRAP), DGAV, the tax authority and your municipality.")}</li>
    <li>${tr("<strong>O guia é de 2021 e a lista legislativa da Rede Rural é anterior.</strong> A Portaria n.º 74/2014 foi alterada em 2026 e o mel passou a ter regime próprio; pode haver outras mudanças que não vimos.", "<strong>The guide dates from 2021 and the National Rural Network’s legislation list is older.</strong> Ordinance 74/2014 was amended in 2026 and honey now has its own regime; there may be other changes we did not see.")}</li>
    <li>${tr("<strong>As etiquetas «o que mais importa» são do guia</strong> (as motivações e vantagens que ele indica para cada maneira), não uma classificação nossa nem uma medição.", "<strong>The “what matters most” tags come from the guide</strong> (the motivations and advantages it gives for each way), not our own ranking or a measurement.")}</li>
    <li>${tr("<strong>Não há números de mercado.</strong> Nem preços de referência nem quanto se vende em cada modalidade: o guia não os dá, e preferimos dizê-lo a inventá-los. A calculadora só faz as contas com os valores que escreves.", "<strong>There are no market figures.</strong> No reference prices and no data on how much sells in each way: the guide does not give them, and we would rather say so than make them up. The calculator only does the sums with the values you type.")}</li>
    <li>${tr("<strong>Termos:</strong> explicamos circuito curto, cabaz e mercado local de produtores no ", "<strong>Terms:</strong> we explain short chain, box scheme and local producers’ market in the ")}<a href="${comLang("/glossario.html#circuito-curto")}">${tr("Glossário", "Glossary")}</a>.</li>
  </ol>
  <div class="srcs">${Object.entries(F).map(([, f]) => `<div class="srcc"><h3>${esc(EN ? f.nome_en : f.nome)}</h3><p>${esc(EN ? f.usa_en : f.usa_pt)}</p><span class="u"><a href="${f.url}" target="_blank" rel="noopener">${f.url}</a></span></div>`).join("")}</div>
</section>`;

    /* modalidades */
    const lista0 = document.getElementById("cc-lista"), conta = document.getElementById("cc-conta");
    const etiqueta = (t) => { const o = D.objetivos.find((x) => x.id === t); return o ? `<span>${esc(EN ? o.en : o.pt)}</span>` : ""; };
    const cartao = (m) => `<article class="cc-card" id="cc-${m.id}"><h3>${esc(nome(m))}<small>${tr("Guia", "Guide")} ${m.sec}</small></h3>
<p>${esc(EN ? m.r_en : m.r_pt)}</p><div class="cc-tags">${m.tags.map(etiqueta).join("")}</div>
<details><summary>${tr("O que pede, vantagens e inconvenientes", "What it asks for, pros and cons")}</summary>
<h4>${tr("O que pede", "What it asks for")}</h4>${lista(EN ? m.req_en : m.req_pt)}
<div class="cc-vi"><div><h4>${tr("Vantagens", "Pros")}</h4>${lista(EN ? m.v_en : m.v_pt)}</div><div><h4>${tr("Inconvenientes", "Cons")}</h4>${lista(EN ? m.i_en : m.i_pt)}</div></div></details></article>`;
    let objetivo = "todos";
    const pintar = () => {
      const sel = filtrar(D.modalidades, objetivo);
      conta.textContent = sel.length === D.modalidades.length ? tr(`${sel.length} maneiras de vender`, `${sel.length} ways to sell`) : tr(`${sel.length} de ${D.modalidades.length} maneiras de vender`, `${sel.length} of ${D.modalidades.length} ways to sell`);
      lista0.innerHTML = sel.map(cartao).join("");
    };
    document.querySelectorAll("#cc-obj button").forEach((b) => b.addEventListener("click", () => {
      document.querySelectorAll("#cc-obj button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      objetivo = b.dataset.o; pintar();
    }));
    pintar();

    /* calculadoras */
    const lerForm = (f) => Object.fromEntries([...f.querySelectorAll("input")].map((i) => [i.name, i.value]));
    const f1 = document.getElementById("cc-f1"), f2 = document.getElementById("cc-f2");
    const calc1 = () => {
      const r = precoVenda(lerForm(f1)), el = document.getElementById("cc-r1");
      el.innerHTML = r ? `<div><span>${tr("Custo total", "Total cost")}</span><b>${euro(r.custoTotal)}</b></div><div><span>${tr("Custo por kg", "Cost per kg")}</span><b>${euro(r.custoKg)}</b></div><div class="cc-forte"><span>${tr("Preço mínimo por kg", "Minimum price per kg")}</span><b>${euro(r.precoKg)}</b></div><p>${tr(`Com a margem, ficam ${euro(r.margemKg)} por kg. Dos custos, a comercialização pesa ${euro(r.vendaKg)} por kg.`, `With the margin, ${euro(r.margemKg)} per kg is left. Of the costs, marketing weighs ${euro(r.vendaKg)} per kg.`)}</p>` : `<p>${tr("Escreve a quantidade vendida (kg) e os custos para veres o preço.", "Type the quantity sold (kg) and the costs to see the price.")}</p>`;
    };
    const calc2 = () => {
      const o = lerForm(f2), r = diaDeVenda(o), el = document.getElementById("cc-r2");
      el.innerHTML = num(o.kg) > 0 && num(o.preco) > 0 ? `<div><span>${tr("Faturação do dia", "Day’s takings")}</span><b>${euro(r.faturacao)}</b></div><div><span>${tr("Depois dos custos do dia", "After the day’s costs")}</span><b>${euro(r.liquido)}</b></div><div class="cc-forte"><span>${tr("Por hora gasta", "Per hour spent")}</span><b>${r.porHora == null ? "–" : euro(r.porHora) + "/h"}</b></div><p>${tr("Se este valor não paga bem as horas que gastas a preparar, a viajar e a vender, essa maneira de vender não está a valorizar o teu trabalho: o guia sugere olhar para isto antes de escolher.", "If this does not pay well for the hours you spend preparing, travelling and selling, that way of selling is not valuing your work: the guide suggests looking at this before choosing.")}</p>` : `<p>${tr("Escreve os quilos vendidos, o preço e as horas para veres o que rende o dia.", "Type the kilos sold, the price and the hours to see what the day earns.")}</p>`;
    };
    f1.addEventListener("input", calc1); f2.addEventListener("input", calc2);
    f1.addEventListener("submit", (e) => e.preventDefault()); f2.addEventListener("submit", (e) => e.preventDefault());
    calc1(); calc2();
  }
})();

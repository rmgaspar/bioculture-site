(function () {
  "use strict";

  var REPO = "rmgaspar/bioculture-site";
  var WORKFLOW = "decidir-noticias.yml";
  var KEY_TOKEN = "bioculture.revisao.chave";
  var KEY_CHOICES = "bioculture.revisao.escolhas";
  var KEY_SENT = "bioculture.revisao.enviadas";
  var HIDE_SENT_MS = 10 * 60 * 1000;

  var proposals = [];
  var choices = read(KEY_CHOICES, {});
  var sent = read(KEY_SENT, {});

  function read(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
  }
  function token() {
    try { return localStorage.getItem(KEY_TOKEN) || ""; } catch (e) { return ""; }
  }
  function $(id) { return document.getElementById(id); }

  // Tudo o que vem das fontes é texto não fiável: só entra na página com textContent.
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (name) {
      if (name === "text") node.textContent = attrs[name];
      else node.setAttribute(name, attrs[name]);
    });
    (children || []).forEach(function (child) { if (child) node.appendChild(child); });
    return node;
  }
  function safeUrl(value) {
    return /^(https?:\/\/|\/images\/)/i.test(value || "") ? value : "";
  }

  function pruneSent() {
    var now = Date.now();
    Object.keys(sent).forEach(function (id) { if (now - sent[id] > HIDE_SENT_MS) delete sent[id]; });
    write(KEY_SENT, sent);
  }

  function visible() {
    var category = $("f-categoria").value;
    var source = $("f-fonte").value;
    var rows = proposals.filter(function (p) {
      return !sent[p.id] && (!category || p.categoria === category) && (!source || p.fonte === source);
    });
    var byDate = $("f-ordem").value === "data";
    rows.sort(function (a, b) {
      return byDate
        ? String(b.publicado_em).localeCompare(String(a.publicado_em))
        : (b.relevancia || 0) - (a.relevancia || 0) || String(b.publicado_em).localeCompare(String(a.publicado_em));
    });
    return rows;
  }

  function fillSelect(select, label, values) {
    var current = select.value;
    select.textContent = "";
    select.appendChild(el("option", { value: "", text: label }));
    values.forEach(function (v) { select.appendChild(el("option", { value: v, text: v })); });
    select.value = values.indexOf(current) >= 0 ? current : "";
  }

  function card(p) {
    var choice = choices[p.id] || "";
    var link = /^https?:\/\//i.test(p.url || "") ? p.url : "";
    var image = safeUrl(p.imagem);
    var pt = p.pt || {};
    var detail = p.relevancia_detalhe || {};
    var art = el("article", { "class": "cartao" + (choice ? " " + choice : ""), "data-id": p.id });

    var media;
    if (image) {
      media = el("img", { "class": "cartao-imagem", src: image, alt: "", loading: "lazy", referrerpolicy: "no-referrer" });
      media.addEventListener("error", function () {
        var holder = el("div", { "class": "cartao-imagem cartao-semimagem", text: "Sem imagem" });
        if (media.parentNode) media.parentNode.replaceChild(holder, media);
      });
    } else {
      media = el("div", { "class": "cartao-imagem cartao-semimagem", text: "Sem imagem" });
    }
    art.appendChild(media);

    var meta = el("div", { "class": "cartao-meta" }, [
      el("span", { "class": "etiqueta", text: p.categoria || "Sem categoria" }),
      el("span", { text: p.fonte || "Fonte não indicada" }),
      el("span", { text: p.data || "" }),
      el("span", { text: p.ambito === "portugal" ? "Portugal" : "Global" }),
      el("span", { text: (p.relevancia || 0) + "/100" })
    ]);
    var reasons = (detail.razoes || []).map(function (r) { return el("li", { text: r }); });

    var actions = el("div", { "class": "cartao-acoes" }, [
      link ? el("a", { href: link, target: "_blank", rel: "noopener noreferrer", text: "Ler original ↗" }) : null
    ]);
    ["aprovar", "recusar"].forEach(function (action) {
      var button = el("button", {
        type: "button", "class": "escolha", "data-acao": action,
        "aria-pressed": choice === action ? "true" : "false",
        text: action === "aprovar" ? "Aprovar" : "Recusar"
      });
      button.addEventListener("click", function () { choose(p.id, action); });
      actions.appendChild(button);
    });

    art.appendChild(el("div", {}, [
      meta,
      el("h2", { text: pt.titulo || "(sem título)" }),
      el("p", { text: pt.resumo_biocultura || "" }),
      reasons.length ? el("details", {}, [el("summary", { text: "Porque foi proposta" }), el("ul", {}, reasons)]) : null,
      actions
    ]));
    return art;
  }

  function choose(id, action) {
    if (choices[id] === action) delete choices[id]; else choices[id] = action;
    write(KEY_CHOICES, choices);
    var node = document.querySelector('.cartao[data-id="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
    if (node) {
      node.className = "cartao" + (choices[id] ? " " + choices[id] : "");
      Array.prototype.forEach.call(node.querySelectorAll(".escolha"), function (b) {
        b.setAttribute("aria-pressed", choices[id] === b.getAttribute("data-acao") ? "true" : "false");
      });
    }
    updateBar();
  }

  function pendingChoices() {
    var ids = {};
    proposals.forEach(function (p) { ids[p.id] = true; });
    return Object.keys(choices).filter(function (id) { return ids[id] && !sent[id]; });
  }

  function updateBar() {
    var ids = pendingChoices();
    var approve = ids.filter(function (id) { return choices[id] === "aprovar"; }).length;
    var reject = ids.length - approve;
    $("barra").hidden = ids.length === 0;
    $("barra-resumo").textContent = approve + " a aprovar · " + reject + " a recusar";
    $("aplicar").disabled = !token();
    $("aplicar").title = token() ? "" : "Falta a chave do GitHub (acima)";
  }

  function render() {
    pruneSent();
    var list = $("lista");
    list.textContent = "";
    var rows = visible();
    var waiting = proposals.filter(function (p) { return !sent[p.id]; }).length;
    $("intro").textContent = waiting
      ? waiting + (waiting === 1 ? " proposta à espera." : " propostas à espera.") + " Lê o original, escolhe e carrega em «Aplicar decisões» no fim."
      : "Não há propostas à espera.";
    if (!rows.length) {
      list.appendChild(el("p", { "class": "revisao-vazio", text: waiting ? "Nenhuma proposta com estes filtros." : "Tudo decidido por agora. 🌱" }));
    }
    rows.forEach(function (p) { list.appendChild(card(p)); });
    updateBar();
  }

  function setNote(text, isError) {
    var note = $("chave-nota");
    note.textContent = text;
    note.className = "revisao-nota" + (isError ? " erro" : "");
  }
  function setStatus(text, isError) {
    var node = $("estado");
    node.textContent = text;
    node.className = "revisao-estado" + (isError ? " erro" : "");
  }

  function paintToken() {
    var has = !!token();
    $("ligacao-estado").textContent = has ? "Ligação ao GitHub: ativa" : "Ligação ao GitHub: por configurar";
    $("remover-chave").hidden = !has;
    $("ligacao").open = !has;
    updateBar();
  }

  function api(path, options) {
    options = options || {};
    options.headers = {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token(),
      "X-GitHub-Api-Version": "2022-11-28"
    };
    return fetch("https://api.github.com" + path, options);
  }

  $("form-chave").addEventListener("submit", function (event) {
    event.preventDefault();
    var value = $("chave").value.trim();
    if (!value) { setNote("Cola primeiro a chave.", true); return; }
    try { localStorage.setItem(KEY_TOKEN, value); } catch (e) { setNote("Este navegador não deixa guardar a chave.", true); return; }
    $("chave").value = "";
    setNote("A verificar…");
    api("/repos/" + REPO + "/actions/workflows/" + WORKFLOW).then(function (response) {
      if (response.ok) { setNote("Ligação confirmada."); paintToken(); return; }
      try { localStorage.removeItem(KEY_TOKEN); } catch (e) {}
      setNote(response.status === 401 || response.status === 403 || response.status === 404
        ? "A chave não serve: confirma que é só para o repositório bioculture-site e que tem Actions: Read and write."
        : "O GitHub respondeu com erro " + response.status + ".", true);
      paintToken();
    }).catch(function () { setNote("Sem ligação ao GitHub.", true); });
  });

  $("remover-chave").addEventListener("click", function () {
    try { localStorage.removeItem(KEY_TOKEN); } catch (e) {}
    setNote("Chave removida deste navegador.");
    paintToken();
  });

  $("limpar").addEventListener("click", function () {
    choices = {};
    write(KEY_CHOICES, choices);
    render();
  });

  $("aplicar").addEventListener("click", function () {
    var ids = pendingChoices();
    if (!ids.length) return;
    var value = ids.map(function (id) { return id + ":" + choices[id]; }).join(",");
    $("aplicar").disabled = true;
    setStatus("A enviar " + ids.length + " decisões…");
    api("/repos/" + REPO + "/actions/workflows/" + WORKFLOW + "/dispatches", {
      method: "POST",
      body: JSON.stringify({ ref: "main", inputs: { decisoes: value } })
    }).then(function (response) {
      if (response.status === 204) {
        var now = Date.now();
        ids.forEach(function (id) { sent[id] = now; delete choices[id]; });
        write(KEY_SENT, sent);
        write(KEY_CHOICES, choices);
        setStatus("Enviado. As aprovadas aparecem no site dentro de cerca de 2 minutos.");
        render();
      } else {
        setStatus(response.status === 401 || response.status === 403
          ? "A chave não tem permissão. Volta a configurá-la."
          : "O GitHub recusou o pedido (" + response.status + ").", true);
        updateBar();
      }
    }).catch(function () {
      setStatus("Sem ligação ao GitHub. As escolhas ficam guardadas; tenta de novo.", true);
      updateBar();
    });
  });

  ["f-categoria", "f-fonte", "f-ordem"].forEach(function (id) { $(id).addEventListener("change", render); });

  fetch("/data/noticias_propostas.json", { cache: "no-store" })
    .then(function (response) { if (!response.ok) throw new Error(response.status); return response.json(); })
    .then(function (rows) {
      proposals = Array.isArray(rows) ? rows : [];
      var unique = function (key) {
        return proposals.map(function (p) { return p[key]; }).filter(function (v, i, a) { return v && a.indexOf(v) === i; }).sort();
      };
      fillSelect($("f-categoria"), "Todas", unique("categoria"));
      fillSelect($("f-fonte"), "Todas", unique("fonte"));
      $("filtros").hidden = !proposals.length;
      render();
    })
    .catch(function () {
      $("intro").textContent = "Não foi possível carregar as propostas.";
    });

  paintToken();
})();

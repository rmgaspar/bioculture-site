// Escreve a barra lateral no HTML de cada página (em vez de a ir buscar com JavaScript depois de a página abrir).
// Assim, ao mudar de página, a barra já está lá no primeiro desenho e nada pisca; com a transição entre páginas do navegador
// (biocultura-sidebar.css) ela fica exatamente no mesmo sítio. Um pequeno script escolhe a variante em inglês quando é esse o idioma,
// põe o idioma e o nome da localidade guardados, e impede que o JavaScript das páginas volte a escrever por cima a mesma barra.
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SIDEBAR_VAZIA = /<div id="sidebar">\s*<\/div>/;
const CSS_SIDEBAR = /<link[^>]+biocultura-sidebar\.css[^>]*>/;

const valor = (objeto, caminho) => caminho.split(".").reduce((o, k) => (o ? o[k] : undefined), objeto);

function traduzir(html, base, auto) {
  // 1. Atributos nas etiquetas de abertura (placeholder, title/aria-label, aria-label por texto exato).
  let saida = html.replace(/<[a-z][^>]*>/gi, (etiqueta) => {
    let t = etiqueta;
    const ph = t.match(/data-i18n-placeholder="([^"]+)"/);
    if (ph && valor(base, ph[1])) t = t.replace(/(\splaceholder=")[^"]*(")/, `$1${valor(base, ph[1])}$2`);
    const ti = t.match(/data-i18n-title="([^"]+)"/);
    if (ti && valor(base, ti[1])) t = t.replace(/(\stitle=")[^"]*(")/, `$1${valor(base, ti[1])}$2`).replace(/(\saria-label=")[^"]*(")/, `$1${valor(base, ti[1])}$2`);
    t = t.replace(/(\saria-label=")([^"]*)(")/g, (m, a, v, c) => (auto[v] ? `${a}${auto[v]}${c}` : m));
    return t;
  });
  // 2. Texto dos elementos com data-i18n (dicionário base).
  saida = saida.replace(/(<([a-z0-9]+)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>)([^<]*)(<\/\2>)/gi, (m, abre, tag, chave, texto, fecha) => {
    const v = valor(base, chave);
    return v ? `${abre}${v}${fecha}` : m;
  });
  // 3. Texto simples (dicionário automático), por correspondência exata.
  saida = saida.replace(/(<(a|span|small|strong|label|p|button)\b[^>]*>)([^<>]+)(<\/\2>)/gi, (m, abre, tag, texto, fecha) => {
    const s = texto.trim();
    return s && auto[s] ? `${abre}${texto.replace(s, auto[s])}${fecha}` : m;
  });
  return saida;
}

function ficheiros(diretorio) {
  return readdir(diretorio, { withFileTypes: true }).then(async (entradas) => {
    const lista = [];
    for (const e of entradas) {
      const f = path.join(diretorio, e.name);
      if (e.isDirectory()) lista.push(...(await ficheiros(f)));
      else if (e.name.endsWith(".html")) lista.push(f);
    }
    return lista;
  });
}

export async function prerenderSidebar(output) {
  const html = (await readFile("sidebar-content.html", "utf8")).trim();
  const base = JSON.parse(await readFile("assets/lang/en.json", "utf8"));
  const auto = JSON.parse(await readFile("assets/lang/auto/en.json", "utf8"));
  const ingles = traduzir(html, base, auto);
  const escapar = (s) => JSON.stringify(s).replace(/<\//g, "<\\/");
  const script = `<script>(function(){try{var d=document,s=d.getElementById("sidebar");if(!s)return;var EN=${escapar(ingles)};` +
    `var q=new URLSearchParams(location.search).get("lang"),m=d.cookie.match(/(?:^|;\\s*)bioculture_lang_v2=([^;]+)/),ls=window.localStorage,` +
    `l=q==="en"||q==="pt"?q:(m&&(m[1]==="en"||m[1]==="pt")?m[1]:(ls.getItem("selected_lang")==="en"?"en":"pt")),` +
    `set=Object.getOwnPropertyDescriptor(Element.prototype,"innerHTML");` +
    `if(l==="en")set.set.call(s,EN);` +
    `var sel=d.getElementById("lang-selector");if(sel)sel.value=l;` +
    `var n=ls.getItem("biocultura_region_nome"),i=d.getElementById("loc-search-input");if(i&&n&&!i.value)i.value=n;` +
    `Object.defineProperty(s,"innerHTML",{configurable:true,get:function(){return set.get.call(this)},set:function(v){if(this.querySelector(".bio-shell"))return;set.set.call(this,v)}});` +
    `}catch(e){}})();</script>`;
  let n = 0;
  for (const f of await ficheiros(output)) {
    let pagina = await readFile(f, "utf8");
    if (!SIDEBAR_VAZIA.test(pagina)) continue;
    pagina = pagina.replace(SIDEBAR_VAZIA, () => `<div id="sidebar">${html}</div>\n${script}`);
    // A folha de estilo da barra no <head>: bloqueia o primeiro desenho até estar carregada, por isso a barra nunca aparece sem estilo.
    const link = html.match(CSS_SIDEBAR)?.[0];
    if (link && !/<head[\s\S]*biocultura-sidebar\.css[\s\S]*<\/head>/i.test(pagina)) pagina = pagina.replace(/<\/head>/i, () => `${link}\n</head>`);
    await writeFile(f, pagina);
    n += 1;
  }
  console.log(`Barra lateral escrita no HTML de ${n} páginas.`);
}

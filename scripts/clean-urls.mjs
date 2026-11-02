// Endereços finais nas ligações internas.
// O Cloudflare serve cada página sem «.html» e redireciona «/x.html» para «/x» (308). Se as nossas páginas ligam a «/x.html», o Google rastreia o
// endereço antigo, vê um redirecionamento e lista-o em «Página com redirecionamento» (centenas de endereços), e cada clique faz um salto a mais.
// Este passo, que corre só sobre a cópia pública (.pages-dist), troca «/x.html» por «/x» em HTML, JS, CSS e JSON, para as páginas que existem.
import { readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

const EXTENSOES = new Set([".html", ".js", ".css", ".json"]);
const FORA = new Set(["sidebar-content", "404"]); // ficheiros que não são páginas navegáveis (um é carregado por JS, o outro é a página de erro)

async function listar(diretorio, raiz = diretorio) {
  const lista = [];
  for (const e of await readdir(diretorio, { withFileTypes: true })) {
    const f = path.join(diretorio, e.name);
    if (e.isDirectory()) lista.push(...(await listar(f, raiz)));
    else lista.push(f);
  }
  return lista;
}

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function limparEnderecos(output) {
  const ficheiros = await listar(output);
  const paginas = ficheiros
    .filter((f) => f.endsWith(".html"))
    .map((f) => path.relative(output, f).split(path.sep).join("/").replace(/\.html$/, ""))
    .filter((p) => !FORA.has(p) && p !== "index");
  paginas.sort((a, b) => b.length - a.length);
  // «/pagina.html» precedido de aspas, parêntese, «=» ou espaço, e seguido de «?», «#», aspas, parêntese ou espaço.
  const regra = new RegExp(`(["'\`(=\\s])/(${paginas.map(escapar).join("|")})\\.html(?=[?#"'\`)\\s\\\\$])`, "g");
  const inicio = /(["'`(=\s])\/index\.html(?=[?#"'`)\s\\$])/g;
  let n = 0;
  for (const f of ficheiros) {
    if (!EXTENSOES.has(path.extname(f))) continue;
    const texto = await readFile(f, "utf8");
    if (!texto.includes(".html")) continue;
    const novo = texto.replace(regra, "$1/$2").replace(inicio, "$1/");
    if (novo !== texto) { await writeFile(f, novo); n += 1; }
  }
  console.log(`Endereços sem «.html» nas ligações internas de ${n} ficheiros.`);
}

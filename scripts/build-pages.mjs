import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";

// Research must validate before preparing any public output.
execFileSync("python3", ["scripts/catalogo/validar.py"], { stdio: "inherit" });
execFileSync(process.execPath, ["scripts/validar-gestao.mjs"], { stdio: "inherit" });
execFileSync(process.execPath, ["scripts/gerar-localidades.mjs"], { stdio: "inherit" });
execFileSync(process.execPath, ["scripts/gerar-especies.mjs"], { stdio: "inherit" });
execFileSync(process.execPath, ["scripts/catalogo/exportar-indice.mjs"], { stdio: "inherit" });

// Cloudflare Pages sets CF_PAGES automatically and serves the custom domain from its root,
// unlike the GitHub Pages project site, which needs the /<repo> subpath prefix.
const isCloudflarePages = Boolean(process.env.CF_PAGES);
const repository = process.env.GITHUB_REPOSITORY?.split("/").pop() || "bioculture-site";
const basePath = process.env.PAGES_BASE_PATH ?? (isCloudflarePages ? "" : `/${repository}`);
const output = path.resolve(".pages-dist");
const textExtensions = new Set([".css", ".html", ".js", ".json", ".svg", ".webmanifest", ".xml"]);
const publicEntries = [
  "assets", "calendario", "config", "contactos.html", "data", "ecossistemas",
  "energia", "images", "index.html", "manifesto.html", "privacidade.html", "revisao.html", "404.html", "robots.txt", "favicon.ico", "_headers", "_redirects",
  "observatorio", "recursos", "services", "sidebar-content.html"
];
const rootPathPattern = new RegExp(`([\\"'\`\\(=])/(?!/)(?=${publicEntries.map(escapeRegExp).join("|")})(?=[^\\s])`, "g");

// Mapa do site para os motores de pesquisa, a partir de config/paginas.json; a data de cada página
// é a do último commit que a alterou.
async function sitemap() {
  const config = JSON.parse(await readFile("config/paginas.json", "utf8"));
  const urls = Object.entries(config.paginas)
    .filter(([, meta]) => meta.sitemap !== false)
    .map(([page, meta]) => {
      let lastmod = "";
      try {
        lastmod = execFileSync("git", ["log", "-1", "--format=%cs", "--", page], { encoding: "utf8" }).trim();
      } catch {}
      // Endereço final servido pelo Cloudflare Pages (sem .html), igual ao canonical das páginas.
      const loc = page === "index.html" ? `${config.site}/` : `${config.site}/${page.replace(/\.html$/, "")}`;
      return [
        "  <url>",
        `    <loc>${loc}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
        `    <xhtml:link rel="alternate" hreflang="pt-PT" href="${loc}"/>`,
        `    <xhtml:link rel="alternate" hreflang="en" href="${loc}?lang=en"/>`,
        meta.prioridade ? `    <priority>${meta.prioridade.toFixed(1)}</priority>` : "",
        "  </url>",
      ].filter(Boolean).join("\n");
    });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join("\n")}\n</urlset>\n`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function transformDirectory(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await transformDirectory(file);
      continue;
    }
    if (!textExtensions.has(path.extname(entry.name))) continue;
    const source = await readFile(file, "utf8");
    const transformed = source.replace(rootPathPattern, `$1${basePath}/`);
    if (transformed !== source) await writeFile(file, transformed);
  }
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of publicEntries) {
  await cp(entry, path.join(output, entry), { recursive: true });
}
await writeFile(path.join(output, ".nojekyll"), "");
await writeFile(path.join(output, "sitemap.xml"), await sitemap());
await transformDirectory(output);
if ((await readdir(output)).includes("catalogo")) {
  throw new Error("A pesquisa do catálogo não pode fazer parte do site público.");
}
console.log(`Pages build ready in ${output} with base path ${basePath || "/"}`);

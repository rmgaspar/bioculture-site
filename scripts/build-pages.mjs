import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const repository = process.env.GITHUB_REPOSITORY?.split("/").pop() || "bioculture-site";
const basePath = process.env.PAGES_BASE_PATH || `/${repository}`;
const output = path.resolve(".pages-dist");
const textExtensions = new Set([".css", ".html", ".js", ".json", ".svg", ".webmanifest", ".xml"]);
const publicEntries = [
  "assets", "calendario", "config", "contactos.html", "data", "ecossistemas",
  "elements.html", "energia", "generic.html", "images", "index.html", "manifesto.html",
  "observario.html", "observatorio", "recursos", "servicos", "sidebar-content.html",
  "sidebar.html", "suporte.html"
];
const rootPathPattern = new RegExp(`([\\"'\`\\(=])/(?!/)(?=${publicEntries.map(escapeRegExp).join("|")})(?=[^\\s])`, "g");

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
await transformDirectory(output);
console.log(`GitHub Pages build ready in ${output} with base path ${basePath}`);

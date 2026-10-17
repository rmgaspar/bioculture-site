import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import assert from 'node:assert/strict';

// Barra lateral: ligações e ícones, e a privacidade que passou para a página de contactos.
const sb = readFileSync('sidebar-content.html', 'utf8');
const css = readFileSync('assets/css/biocultura-sidebar.css', 'utf8');
const contactos = readFileSync('contactos.html', 'utf8');
const redirects = readFileSync('_redirects', 'utf8');
const cfg = JSON.parse(readFileSync('config/paginas.json', 'utf8'));

const nav = sb.slice(sb.indexOf('<nav class="bio-shell-nav"'), sb.indexOf('</nav>'));
const hrefs = [...nav.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
assert.equal(hrefs.length, 9, 'seis hubs e três ligações de «Sobre o projeto»');
assert.deepEqual(hrefs.slice(6), ['/manifesto.html', '/glossario.html', '/contactos.html']);
// Cada ligação tem o seu ícone, escolhido pela ligação (não pela posição) e sem repetir glifos.
const glifos = hrefs.map((h) => { const m = css.match(new RegExp(`#sidebar a\\[href="${h.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}"\\]::before \\{ content: "\\\\(f[0-9a-f]{3})"`)); assert(m, `sem ícone: ${h}`); return m[1]; });
assert.equal(new Set(glifos).size, glifos.length, 'ícones todos diferentes');
assert(!/nth-child|nth-of-type/.test(css.slice(css.indexOf('Definição dos Ícones'), css.indexOf('Estados Hover'))), 'ícones não dependem da ordem');

// Contactos e privacidade na mesma página; a antiga página redireciona.
assert(!existsSync('privacidade.html'), 'a página de privacidade foi retirada');
assert(/\/privacidade\.html \/contactos#privacidade 301/.test(redirects) && /\/privacidade \/contactos#privacidade 301/.test(redirects));
assert(contactos.includes('id="privacidade"') && contactos.includes('class="lang-pt"') && contactos.includes('class="lang-en"') && contactos.includes('Cloudflare Web Analytics'));
assert(!/<h1>Priva/.test(contactos), 'um só h1 na página');
assert(cfg.paginas['contactos.html'].pt.includes('privacidade') && !cfg.paginas['privacidade.html']);
const refs = execSync("git grep -l 'privacidade.html' -- '*.html' '*.js' '*.json' '*.mjs' ':!scripts/tests' || true", { encoding: 'utf8' }).trim();
assert.equal(refs, '', `ligações antigas à privacidade: ${refs}`);
// Todas as páginas carregam a mesma versão do runtime i18n (o script de metadados já deixou páginas para trás).
const versoes = new Set(execSync("git grep -ho 'biocultura-i18n-runtime.js?v=[0-9]*' -- '*.html'", { encoding: 'utf8' }).trim().split('\n'));
assert.equal(versoes.size, 1, `versões do runtime diferentes: ${[...versoes].join(', ')}`);
console.log('sidebar: ok');

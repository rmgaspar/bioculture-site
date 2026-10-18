// Testa os botões «← Voltar» num Chrome sem janela (CDP), contra o site em http://localhost:8973 (npm/preview do .pages-dist).
// Uso: node scripts/browser/voltar.mjs [pares.json] [cadeias.json]   (ver scripts/browser/voltar-cadeias.json)
// Pares: [nome, página, seletor da ligação]; cadeias: [nome, início, [["click", seletor] | ["back"] ...]]. Precisa do Google Chrome.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
const BASE = 'http://localhost:8973';
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', '--remote-debugging-port=9333', '--user-data-dir=/tmp/voltar-profile', '--window-size=1400,900', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
await sleep(2500);
const tgt = await (await fetch('http://127.0.0.1:9333/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(tgt.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); let loadWaiters = [];
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } if (d.method === 'Page.loadEventFired') { loadWaiters.forEach((f) => f()); loadWaiters = []; } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const waitLoad = (ms = 15000) => new Promise((res) => { const t = setTimeout(res, ms); loadWaiters.push(() => { clearTimeout(t); res(); }); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result?.result?.value; };
await send('Page.enable'); await send('Runtime.enable');
const go = async (url) => { const w = waitLoad(); await send('Page.navigate', { url: BASE + url }); await w; await sleep(2800); };
const clickAndWait = async (sel) => { const w = waitLoad(); const ok = await ev(`(()=>{const a=document.querySelector(${JSON.stringify(sel)}); if(!a) return false; a.scrollIntoView({block:'center'}); window.__y=Math.round(scrollY); setTimeout(()=>a.click(),80); return true})()`); if (!ok) return false; await w; await sleep(3200); return true; };
const results = [];
async function par(nome, parent, sel, opts = {}) {
  const r = { nome, parent, sel };
  try {
    await go(parent);
    if (opts.pre) { await ev(opts.pre); await sleep(900); }
    const y0 = await ev('Math.round(scrollY)');
    if (!(await clickAndWait(sel))) { r.erro = 'ligação não encontrada na página de origem'; results.push(r); return; }
    r.child = await ev('location.pathname+location.search+location.hash');
    r.backHref = await ev(`(()=>{const b=document.querySelector('a.hub-back'); return b? b.getAttribute('href'):null})()`);
    if (r.backHref == null) { r.erro = 'sem botão Voltar'; results.push(r); return; }
    if (opts.preChild) { await ev(opts.preChild); await sleep(900); r.childAfterPre = await ev('location.pathname+location.search+location.hash'); }
    r.yClick = await ev('window.__y');
    const w = waitLoad(); await ev(`setTimeout(()=>document.querySelector('a.hub-back').click(),80); 1`); await w; await sleep(4500);
    r.yBack = await ev('Math.round(scrollY)');
    r.back = await ev('location.pathname+location.search');
    r.parentPath = parent.split('?')[0].replace(/\.html$/, '');
    r.ok = r.back.split('?')[0].replace(/\.html$/, '') === r.parentPath;
    r.centered = await ev(`(()=>{const a=document.querySelector(${JSON.stringify(sel)}); if(!a) return null; const q=a.getBoundingClientRect(); return Math.abs((q.top+q.height/2)-innerHeight/2) < 140})()`);
  } catch (e) { r.erro = String(e); }
  results.push(r);
}
const CH = process.argv[3] ? JSON.parse(process.argv[3]) : null;
if (CH) {
  for (const [nome, start, steps] of CH) {
    const log = [nome]; await go(start); log.push('início ' + await ev('location.pathname+location.search'));
    for (const st of steps) {
      if (st[0] === 'click') { const ok = await clickAndWait(st[1]); log.push('clique ' + st[1] + (ok ? ' → ' : ' (NÃO ENCONTRADO) → ') + await ev('location.pathname+location.search+location.hash')); }
      else if (st[0] === 'back') { const w = waitLoad(); const ok = await ev(`(()=>{const b=document.querySelector('a.hub-back'); if(!b) return false; setTimeout(()=>b.click(),80); return true})()`); if (!ok) { log.push('Voltar: SEM BOTÃO'); continue; } await w; await sleep(4500); log.push('Voltar → ' + await ev('location.pathname+location.search+location.hash')); }
      else if (st[0] === 'js') { await ev(st[1]); await sleep(600); log.push('js'); }
    }
    console.log(log.join('\n  ')); console.log('');
  }
  ws.close(); chrome.kill(); process.exit(0);
}
const P = JSON.parse(process.argv[2]);
for (const [nome, parent, sel, opts] of P) await par(nome, parent, sel, opts || {});
console.log(JSON.stringify(results, null, 1));
ws.close(); chrome.kill();
process.exit(0);

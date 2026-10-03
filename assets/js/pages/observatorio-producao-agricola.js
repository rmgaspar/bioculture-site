/* Observatório · Produção agrícola mundial.
   Dados: /data/agriculture-global.json, gerado por scripts/agricultura/gerar-agricultura.py (FAOSTAT). */
(function () {
"use strict";
let D;
function render() {


/* ---------- helpers ---------- */
const $ = s => document.querySelector('.agri-report ' + s) || document.querySelector(s);
const nf = (d=0) => new Intl.NumberFormat('pt-PT',{minimumFractionDigits:d,maximumFractionDigits:d});
const fmt = (v,d=0) => v==null ? '–' : nf(d).format(v);
const css = v => getComputedStyle(document.querySelector('.agri-report') || document.documentElement).getPropertyValue(v).trim();
const SER = ['--s1','--s2','--s3','--s4','--s5','--s6','--s7','--s8'];
let DN; try { DN = new Intl.DisplayNames(['pt-PT','pt'],{type:'region'}); } catch(e){ DN = null; }
const NAME_FIX = {CN:'China', TW:'Taiwan', US:'Estados Unidos', GB:'Reino Unido', CI:'Costa do Marfim', CD:'RD Congo', KR:'Coreia do Sul', RU:'Rússia', NL:'Países Baixos', AE:'Emirados Árabes Unidos', VN:'Vietname', IR:'Irão'};
function an(code){
  const a = D.areas[String(code)]; if(!a) return String(code);
  if(String(code)==='5707') return 'União Europeia (27)';
  if(a.iso2 && NAME_FIX[a.iso2]) return NAME_FIX[a.iso2];
  if(a.iso2 && DN){ try { const n = DN.of(a.iso2); if(n && n!==a.iso2) return n; } catch(e){} }
  return a.en || String(code);
}
const IT = {15:'Trigo',27:'Arroz',30:'Arroz (equiv. branqueado)',31:'Arroz branqueado',44:'Cevada',49:'Malte',51:'Cerveja',56:'Milho',109:'Alimentos infantis',116:'Batata',118:'Batata congelada',125:'Mandioca',156:'Cana-de-açúcar',157:'Beterraba sacarina',162:'Açúcar bruto',164:'Açúcar refinado',168:'Confeitaria',176:'Feijão seco',187:'Ervilha seca',197:'Feijão-guandu',217:'Caju com casca',236:'Soja',237:'Óleo de soja',238:'Bagaço de soja',243:'Amendoim descascado',254:'Fruto de palma',257:'Óleo de palma',260:'Azeitona',261:'Azeite',266:'Óleo de rícino',267:'Girassol (semente)',268:'Óleo de girassol bruto',269:'Bagaço de girassol',270:'Colza (semente)',271:'Óleo de colza bruto',388:'Tomate',391:'Concentrado de tomate',397:'Pepino',403:'Cebola',406:'Alho verde',463:'Outros hortícolas frescos',486:'Banana',490:'Laranja',495:'Tangerina e clementina',515:'Maçã',521:'Pera',531:'Cereja',547:'Framboesa',560:'Uva',564:'Vinho',567:'Melancia',572:'Abacate',603:'Outros frutos tropicais',633:'Bebidas não alcoólicas calóricas',634:'Bebidas espirituosas',653:'Resíduos alimentares',656:'Café verde',657:'Café torrado ou descafeinado',661:'Cacau (amêndoa)',662:'Pasta de cacau',664:'Manteiga de cacau',667:'Chá',689:'Pimentos e malaguetas secos',767:'Algodão (fibra)',826:'Tabaco em rama',828:'Cigarros',831:'Outros produtos de tabaco',843:'Alimentos para cães e gatos',867:'Carne de bovino com osso',870:'Carne de bovino desossada',882:'Leite de vaca',897:'Leite em pó gordo',901:'Queijo de leite de vaca',947:'Carne de búfalo',951:'Leite de búfala',1035:'Carne de porco com osso',1038:'Carne de porco desossada',1058:'Carne de frango',1274:'Gorduras e óleos modificados',1765:'Carne (total)',1780:'Leite (total)'};
const it = x => IT[x.id] || x.item;

/* tooltip */
const tip = document.getElementById('agri-tip');
function showTip(e, html){
  tip.innerHTML = html; tip.hidden = false;
  const r = tip.getBoundingClientRect(); let x = e.clientX + 14, y = e.clientY + 14;
  if(x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
  if(y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
  tip.style.left = Math.max(8,x) + 'px'; tip.style.top = Math.max(8,y) + 'px';
}
const hideTip = () => { tip.hidden = true; };

/* table view */
function tableView(el, head, rows){
  let d = el.parentElement.querySelector(':scope > details.tbl');
  if(!d){ d = document.createElement('details'); d.className='tbl'; el.after(d); }
  d.innerHTML = '<summary>Ver tabela de dados</summary><div class="tscroll"><table><thead><tr>' + head.map(h=>`<th>${h}</th>`).join('') + '</tr></thead><tbody>' +
    rows.map(r=>'<tr>'+r.map(c=>`<td>${c}</td>`).join('')+'</tr>').join('') + '</tbody></table></div>';
}

/* horizontal bars */
function hbars(el, rows, o={}){
  const max = o.max || Math.max(...rows.map(r=>r.v||0));
  el.className = 'chart hbars';
  el.innerHTML = rows.map((r,i)=>`<div class="hb${r.hl?' pt':''}${r.dim?' dim':''}" data-i="${i}"><span class="l" title="${r.l}">${r.l}</span><span class="tr"><span class="b" style="width:${(r.v||0)/max*100}%"></span></span><span class="v">${o.f? o.f(r.v): fmt(r.v,1)}</span></div>`).join('');
  el.querySelectorAll('.hb').forEach(n=>{
    const r = rows[+n.dataset.i];
    n.addEventListener('mousemove', e=>showTip(e, `<div class="h">${r.l}</div>` + (r.tip || `<div class="r"><span>${o.unit||''}</span><b>${o.f?o.f(r.v):fmt(r.v,1)}</b></div>`)));
    n.addEventListener('mouseleave', hideTip);
  });
  if(o.table) tableView(el, o.table, rows.map(r=>[r.l, o.f?o.f(r.v):fmt(r.v,1)]));
}

/* diverging bars */
function dbars(el, rows, o={}){
  const max = Math.max(...rows.map(r=>Math.abs(r.v)));
  el.className = 'chart div';
  el.innerHTML = rows.map((r,i)=>{
    const w = Math.abs(r.v)/max*50;
    const b = r.v>=0 ? `<span class="b p" style="left:50%;width:${w}%"></span>` : `<span class="b n" style="left:${50-w}%;width:${w}%"></span>`;
    return `<div class="dv" data-i="${i}"><span class="l" title="${r.l}">${r.l}</span><span class="tr">${b}</span><span class="v">${(r.v>0?'+':'')+(o.f?o.f(r.v):fmt(r.v,1))}</span></div>`;
  }).join('');
  el.querySelectorAll('.dv').forEach(n=>{ const r = rows[+n.dataset.i];
    n.addEventListener('mousemove', e=>showTip(e, `<div class="h">${r.l}</div>${r.tip||''}`)); n.addEventListener('mouseleave', hideTip); });
  if(o.table) tableView(el, o.table, rows.map(r=>[r.l, ...(r.cells||[fmt(r.v,1)])]));
}

/* line chart (SVG), one y-axis */
function line(el, cfg){
  const draw = () => {
    const W = Math.max(300, el.clientWidth), H = cfg.h || Math.round(Math.min(360, Math.max(240, W*0.42)));
    const padR = cfg.endLabels ? Math.min(130, W*0.24) : 14, M = {t:12,r:padR,b:26,l:48};
    const xs = cfg.x, x0 = xs[0], x1 = xs[xs.length-1];
    const all = cfg.series.flatMap(s=>s.v.filter(v=>v!=null));
    let yMax = Math.max(...all), yMin = cfg.zero===false ? Math.min(...all) : 0;
    const ticks = niceTicks(yMin, yMax, (cfg.h && cfg.h < 160) ? 3 : 5); yMin = ticks[0]; yMax = ticks[ticks.length-1];
    const X = v => M.l + (v-x0)/(x1-x0)*(W-M.l-M.r), Y = v => M.t + (1-(v-yMin)/(yMax-yMin))*(H-M.t-M.b);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${cfg.aria||''}"><g class="ax">`;
    ticks.forEach(t=>{ s += `<line x1="${M.l}" x2="${W-M.r}" y1="${Y(t)}" y2="${Y(t)}" ${t===yMin?'class="base"':''}/><text x="${M.l-8}" y="${Y(t)+4}" text-anchor="end">${cfg.yf?cfg.yf(t):fmt(t)}</text>`; });
    const step = (x1-x0) > 40 ? 10 : (x1-x0) > 15 ? 5 : 2;
    for(let y=Math.ceil(x0/step)*step; y<=x1; y+=step) s += `<text x="${X(y)}" y="${H-6}" text-anchor="middle">${y}</text>`;
    s += '</g>';
    if(cfg.ref!=null) s += `<line x1="${M.l}" x2="${W-M.r}" y1="${Y(cfg.ref)}" y2="${Y(cfg.ref)}" stroke="${css('--muted')}" stroke-dasharray="3 3"/>`;
    const ends = [];
    cfg.series.forEach(se=>{
      let d='', pen=false;
      se.v.forEach((v,i)=>{ if(v==null){pen=false;return;} d += (pen?'L':'M') + X(xs[i]).toFixed(1)+','+Y(v).toFixed(1); pen=true; });
      if(se.area) s += `<path d="${d}L${X(lastX(se,xs))},${Y(yMin)}L${X(firstX(se,xs))},${Y(yMin)}Z" fill="${se.c}" fill-opacity=".12"/>`;
      s += `<path d="${d}" fill="none" stroke="${se.c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      const li = lastI(se); if(li>=0){ s += `<circle cx="${X(xs[li])}" cy="${Y(se.v[li])}" r="3.5" fill="${se.c}" stroke="${css('--surface')}" stroke-width="2"/>`; ends.push({y:Y(se.v[li]), n:se.n, c:se.c, v:se.v[li]}); }
    });
    if(cfg.endLabels){
      ends.sort((a,b)=>a.y-b.y); for(let i=1;i<ends.length;i++) if(ends[i].y-ends[i-1].y<13) ends[i].y = ends[i-1].y+13;
      ends.forEach(e=>{ s += `<text class="lbl" x="${W-M.r+8}" y="${e.y+4}">${e.n}</text>`; });
    }
    s += `<line class="xh" x1="0" x2="0" y1="${M.t}" y2="${H-M.b}" stroke="${css('--muted')}" stroke-width="1" visibility="hidden"/><g class="dots"></g><rect x="${M.l}" y="0" width="${W-M.l-M.r}" height="${H}" fill="transparent"/></svg>`;
    el.innerHTML = s;
    const svg = el.querySelector('svg'), xh = svg.querySelector('.xh'), dots = svg.querySelector('.dots');
    svg.querySelector('rect').addEventListener('mousemove', e=>{
      const b = svg.getBoundingClientRect(), px = (e.clientX-b.left)/b.width*W;
      const yr = Math.round(x0 + (px-M.l)/(W-M.l-M.r)*(x1-x0)), i = xs.indexOf(Math.min(x1,Math.max(x0,yr)));
      if(i<0) return;
      xh.setAttribute('x1',X(xs[i])); xh.setAttribute('x2',X(xs[i])); xh.setAttribute('visibility','visible');
      dots.innerHTML = cfg.series.map(se=>se.v[i]==null?'':`<circle cx="${X(xs[i])}" cy="${Y(se.v[i])}" r="4" fill="${se.c}" stroke="${css('--surface')}" stroke-width="2"/>`).join('');
      showTip(e, `<div class="h">${xs[i]}</div>` + cfg.series.slice().sort((a,b)=>(b.v[i]??-1e9)-(a.v[i]??-1e9)).map(se=>`<div class="r"><span><i style="background:${se.c}"></i>${se.n}</span><b>${cfg.tf?cfg.tf(se,i):fmt(se.v[i],1)}</b></div>`).join(''));
    });
    svg.querySelector('rect').addEventListener('mouseleave', ()=>{ xh.setAttribute('visibility','hidden'); dots.innerHTML=''; hideTip(); });
  };
  el._draw = draw; draw(); ro.observe(el);
  if(cfg.table){ const idx = cfg.x.map((_,i)=>i).filter(i=>cfg.tableEvery? (cfg.x[i]%cfg.tableEvery===0 || i===cfg.x.length-1) : true);
    tableView(el, ['Ano', ...cfg.series.map(s=>s.n)], idx.map(i=>[cfg.x[i], ...cfg.series.map(s=>cfg.tf?cfg.tf(s,i):fmt(s.v[i],1))])); }
}
const lastI = se => { for(let i=se.v.length-1;i>=0;i--) if(se.v[i]!=null) return i; return -1; };
const lastX = (se,xs) => xs[lastI(se)], firstX = (se,xs) => xs[se.v.findIndex(v=>v!=null)];
function niceTicks(a,b,n){ const span = b-a || 1, raw = span/n, mag = Math.pow(10,Math.floor(Math.log10(raw))), f = raw/mag;
  const st = (f<1.5?1:f<3?2:f<7?5:10)*mag; const lo = Math.floor(a/st)*st, hi = Math.ceil(b/st)*st; const t=[]; for(let v=lo; v<=hi+st/2; v+=st) t.push(+v.toFixed(10)); return t; }
const ro = new ResizeObserver(es=>es.forEach(e=>{ const el=e.target; const w=el.clientWidth; if(el._w!==w){ el._w=w; el._draw&&el._draw(); } }));
function legend(el, items, isLine){ el.innerHTML = items.map(i=>`<span class="${isLine?'ln':''}"><i style="background:${i.c}"></i>${i.n}</span>`).join(''); }
function seg(el, onChange){ el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ el.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed', x===b)); onChange(b.dataset.v); })); }

/* ---------- data-bound text ---------- */
const land = D.land, li = land.years.length-1;
const agri = land.series['6610'][li], landA = land.series['6601'][li];
const ptT = D.pt_trade, pti = ptT.years.length-1;
const K = {
  yp: D.meta.production_year, yt: D.meta.trade_year, ytm: D.pt_partners.year, ly: land.years[li],
  agriMha: fmt(agri), agriShare: fmt(agri/landA*100) + '%', orgMha: fmt(land.series['6671'][li],0),
  orgY: D.organic.year, tradeBn: fmt(D.world_trade.exp_bn.at(-1)),
  ptExp: fmt(ptT.exp_m[pti]/1000,1), ptImp: fmt(ptT.imp_m[pti]/1000,1),
  ssrY: D.pt_ssr.years[0] + '–' + D.pt_ssr.years.at(-1)
};
document.querySelectorAll('[data-k]').forEach(n=>{ if(K[n.dataset.k]!=null) n.textContent = K[n.dataset.k]; });

/* ---------- hero tiles ---------- */
const cer = D.cereals;
$('#heroTiles').innerHTML = [
  [fmt(cer.prod_mt.at(-1)), 'Mt', 'cereais colhidos no mundo em '+K.yp, '×'+fmt(cer.prod_mt.at(-1)/cer.prod_mt[0],1)+' desde 1961'],
  [fmt(cer.yield_tha.at(-1),2), 't/ha', 'rendimento médio dos cereais', 'eram '+fmt(cer.yield_tha[0],2)+' t/ha em 1961'],
  [fmt(agri), 'Mha', 'de terra agrícola', K.agriShare+' da área terrestre'],
  [fmt(D.world_trade.exp_bn.at(-1)), 'mil M USD', 'exportações agrícolas mundiais', 'em '+K.yt+', valores correntes']
].map(t=>`<div class="tile"><span class="v">${t[0]}<small>${t[1]}</small></span><span class="k">${t[2]}</span><span class="s">${t[3]}</span></div>`).join('');

/* ---------- findings ---------- */
const soy = D.key_trade.find(k=>k.id===236);
const F = [
  `<b>A produção de cereais multiplicou-se por 3,6 desde 1961</b> com apenas mais 15% de área colhida. O rendimento por hectare triplicou.`,
  `<b>As oleaginosas cresceram quase dez vezes</b>, mais do que qualquer outro grupo, puxadas pela soja e pela palma.`,
  `<b>A Ásia produz metade dos cereais e 44% da carne do mundo.</b> Em 1961 a Europa liderava a carne, com 42%.`,
  `<b>Cinco países produzem 87% da soja e 91% do fruto de palma.</b> Brasil e EUA fazem ${fmt(soy.exp[0].t/soy.exp_total_t*100+soy.exp[1].t/soy.exp_total_t*100)}% das exportações de soja.`,
  `<b>A agricultura ocupa ${K.agriShare} das terras emersas</b>, e dois terços dessa área são pastagens.`,
  `<b>O comércio agrícola mundial vale ${K.tradeBn} mil milhões USD</b>, cinco vezes o valor de 2000 em termos nominais.`,
  `<b>O Brasil tem o maior excedente agrícola do mundo</b> (+${fmt(D.surplus[0].bal)} mil M USD). A China tem o maior défice (${fmt(D.deficit[0].bal)} mil M USD).`,
  `<b>Uma só rota, soja do Brasil para a China, vale cerca de ${fmt(D.flows.items[0].rows[0].m/1000,1)} mil milhões USD</b> por ano.`,
  `<b>Portugal exporta ${K.ptExp} e importa ${K.ptImp} mil milhões USD</b> em produtos agrícolas. A Espanha é o destino de ${fmt(D.pt_partners.exp.top[0].share)}% das exportações e a origem de ${fmt(D.pt_partners.imp.top[0].share)}% das importações.`,
  `<b>Portugal produz cerca de 4% do trigo e 27% do milho que consome</b>, e mais do dobro do azeite e da pera que consome.`
];
$('#agri-findings').innerHTML = F.map((f,i)=>`<li><span class="n">${String(i+1).padStart(2,'0')}</span><span>${f}</span></li>`).join('');

/* ---------- 1. top items + groups ---------- */
hbars($('#cTopItems'), D.top_items.map(x=>({l:it(x), v:x.mt})), {unit:'Mt', table:['Produto','Mt']});
const GSEL = [1732,1735,1765,1738,1717,1780];
const gs = D.world_groups.series.filter(s=>GSEL.includes(s.id)).sort((a,b)=>GSEL.indexOf(a.id)-GSEL.indexOf(b.id));
const gNames = {1732:'Oleaginosas',1735:'Hortícolas',1765:'Carne',1738:'Fruta',1717:'Cereais',1780:'Leite'};
function drawGroups(){
  const series = gs.map((s,i)=>({n:gNames[s.id], c:css(SER[i]), v:s.mt.map(v=>v==null?null:v/s.mt[0]*100), raw:s.mt}));
  legend($('#lgGroups'), series, true);
  line($('#cGroups'), {x:D.world_groups.years, series, endLabels:true, aria:'Índice de crescimento da produção por grupo', tf:(s,i)=>fmt(s.v[i])+' · '+fmt(s.raw[i])+' Mt', table:true, tableEvery:5});
}
drawGroups();

/* ---------- 2. cereals index ---------- */
function drawCereal(){
  const c = D.cereals, b = (a)=>a.map(v=>v/a[0]*100);
  const series = [{n:'Produção',c:css('--s1'),v:b(c.prod_mt),raw:c.prod_mt,u:'Mt'},{n:'Rendimento',c:css('--s2'),v:b(c.yield_tha),raw:c.yield_tha,u:'t/ha'},{n:'Área colhida',c:css('--s3'),v:b(c.area_mha),raw:c.area_mha,u:'Mha'}];
  legend($('#lgCereal'), series, true);
  line($('#cCereal'), {x:c.years, series, endLabels:true, ref:100, aria:'Cereais: produção, área e rendimento', tf:(s,i)=>fmt(s.v[i])+' · '+fmt(s.raw[i], s.u==='t/ha'?2:0)+' '+s.u, table:true, tableEvery:5});
}
drawCereal();

/* ---------- 3. continents ---------- */
function drawCont(key){
  const c = D[key], el = $('#cCont'), cols = c.series.map((_,i)=>css(SER[i]));
  legend($('#lgCont'), c.series.map((s,i)=>({n:s.name,c:cols[i]})));
  el.innerHTML = c.years.map((y,yi)=>{ const tot = c.series.reduce((a,s)=>a+s.mt[yi],0);
    return `<div class="sk"><span class="y">${y}</span><div class="bars">` + c.series.map((s,si)=>{ const p = s.mt[yi]/tot*100;
      return `<span class="part" data-y="${yi}" data-s="${si}" style="width:${p}%;background:${cols[si]}">${p>=9?fmt(p)+'%':''}</span>`; }).join('') + '</div></div>'; }).join('');
  el.querySelectorAll('.sk .part').forEach(n=>{ const yi=+n.dataset.y, si=+n.dataset.s, s=c.series[si], tot=c.series.reduce((a,x)=>a+x.mt[yi],0);
    n.addEventListener('mousemove',e=>showTip(e,`<div class="h">${s.name} · ${c.years[yi]}</div><div class="r"><span>Quota</span><b>${fmt(s.mt[yi]/tot*100,1)}%</b></div><div class="r"><span>Produção</span><b>${fmt(s.mt[yi])} Mt</b></div>`)); n.addEventListener('mouseleave',hideTip); });
  tableView(el, ['Ano', ...c.series.map(s=>s.name+' (%)')], c.years.map((y,yi)=>{ const tot=c.series.reduce((a,s)=>a+s.mt[yi],0); return [y, ...c.series.map(s=>fmt(s.mt[yi]/tot*100,1))]; }));
}
let contKey = 'cereals_continent'; drawCont(contKey); seg($('#segCont'), v=>{ contKey=v; drawCont(v); });

/* ---------- 4. key commodities ---------- */
const selKey = $('#selKey');
selKey.innerHTML = D.key.map((k,i)=>`<option value="${i}">${it(k)}</option>`).join('');
function drawKey(i){
  const k = D.key[i], unit = k.world_mt < 50 ? 1e3 : 1e6, ul = unit===1e3 ? 'mil t' : 'Mt';
  hbars($('#cKey'), k.top.map(t=>({l:an(t.a), v:t.t/unit, hl:t.a===174, tip:`<div class="r"><span>Produção</span><b>${fmt(t.t/unit,1)} ${ul}</b></div><div class="r"><span>Quota mundial</span><b>${fmt(t.t/(k.world_mt*1e6)*100,1)}%</b></div>`})), {unit:ul, table:['País', ul]});
  const pt = k.pt.t ? `${fmt(k.pt.t/1000,1)} mil t · ${k.pt.rank}.º de ${k.pt.n} países` : 'Sem produção registada';
  $('#kFacts').innerHTML = `
    <div class="kf"><span class="v">${fmt(k.world_mt, k.world_mt<50?2:0)} <small style="font-size:.8rem;color:var(--muted)">Mt</small></span><span class="k">Produção mundial, ${k.year}</span></div>
    <div class="kf"><span class="v">${fmt(k.top5_share,0)}%</span><span class="k">Quota dos 5 maiores produtores</span></div>
    <div class="kf"><span class="v" style="font-size:1.05rem">${pt}</span><span class="k">Portugal</span></div>
    <div><div class="chart" id="cKeyTs"></div><span class="k" style="font-size:.78rem;color:var(--muted)">Produção mundial, 1961–${k.year} (Mt)</span></div>`;
  const ys = k.world_ts.mt.map((_,j)=>1961+j);
  line($('#cKeyTs'), {x:ys, series:[{n:it(k), c:css('--bar'), v:k.world_ts.mt, area:true}], h:130, aria:'Produção mundial ao longo do tempo', tf:(s,j)=>fmt(s.v[j],1)+' Mt'});
}
selKey.addEventListener('change', ()=>drawKey(+selKey.value)); drawKey(0);

/* ---------- 5. land ---------- */
function drawLand(){
  const s = land.series; const series = [
    {n:'Pastagens',c:css('--s1'),v:s['6655']},{n:'Terra cultivada',c:css('--s2'),v:s['6620']},{n:'Equipada para rega',c:css('--s3'),v:s['6690']}];
  legend($('#lgLand'), series, true);
  line($('#cLand'), {x:land.years, series, aria:'Uso agrícola da terra', tf:(se,i)=>fmt(se.v[i])+' Mha', table:true, tableEvery:5});
}
drawLand();
const org = D.organic.top.map(t=>({l:an(t.a), v:t.kha}));
org.push({l:'Portugal', v:D.organic.pt_kha, hl:true});
hbars($('#cOrg'), org, {unit:'mil ha', f:v=>fmt(v), table:['País','mil ha']});

/* ---------- 6. trade ---------- */
line($('#cTrade'), {x:D.world_trade.years, series:[{n:'Exportações',c:css('--s1'),v:D.world_trade.exp_bn,area:true}], aria:'Exportações agrícolas mundiais', tf:(s,i)=>fmt(s.v[i])+' mil M USD', table:true, tableEvery:5});
function drawExIm(k){
  const f = k==='exporters' ? 'exp' : 'imp';
  hbars($('#cExIm'), D[k].map(r=>({l:an(r.a), v:r[f], tip:`<div class="r"><span>Exportações</span><b>${fmt(r.exp,1)}</b></div><div class="r"><span>Importações</span><b>${fmt(r.imp,1)}</b></div><div class="r"><span>Saldo</span><b>${(r.bal>0?'+':'')+fmt(r.bal,1)}</b></div>`})), {unit:'mil M USD', table:['País','mil M USD']});
}
drawExIm('exporters'); seg($('#segExIm'), drawExIm);
const bal = [...D.surplus.slice(0,10), ...D.deficit.slice(0,10).reverse()];
dbars($('#cBal'), bal.map(r=>({l:an(r.a), v:r.bal, tip:`<div class="r"><span>Saldo</span><b>${(r.bal>0?'+':'')+fmt(r.bal,1)} mil M USD</b></div>`})), {table:['País','Saldo (mil M USD)']});
hbars($('#cTopTraded'), D.top_traded.map(x=>({l:it(x), v:x.bn})), {unit:'mil M USD', table:['Produto','mil M USD']});

/* ---------- 7. routes ---------- */
const selT = $('#selTrade');
selT.innerHTML = D.key_trade.map((k,i)=>`<option value="${i}">${it(k)}</option>`).join('');
function drawKT(i){
  const k = D.key_trade[i], small = k.exp_total_t < 2e7, u = small?1e3:1e6, ul = small?'mil t':'Mt';
  const rows = (arr,tot)=>arr.map(r=>({l:an(r.a), v:r.t/u, hl:r.a===174, tip:`<div class="r"><span>Volume</span><b>${fmt(r.t/u,1)} ${ul}</b></div><div class="r"><span>Quota</span><b>${fmt(r.t/tot*100,1)}%</b></div>`}));
  const max = Math.max(k.exp[0].t, k.imp[0].t)/u;
  hbars($('#cKTexp'), rows(k.exp,k.exp_total_t), {max, unit:ul, table:['País',ul]});
  hbars($('#cKTimp'), rows(k.imp,k.imp_total_t), {max, unit:ul, table:['País',ul]});
  $('#kTnote').textContent = `Exportações mundiais declaradas: ${fmt(k.exp_total_t/u,1)} ${ul}. Os 3 maiores exportadores somam ${fmt(k.top3_exp_share)}%.`;
}
selT.addEventListener('change', ()=>drawKT(+selT.value)); drawKT(0);
const sf = $('#segFlow');
sf.innerHTML = D.flows.items.map((f,i)=>`<button aria-pressed="${i===0}" data-v="${i}">${it(f)}</button>`).join('');
function drawFlow(i){ const f = D.flows.items[i];
  hbars($('#cFlow'), f.rows.map(r=>({l:`${an(r.from)} → ${an(r.to)}`, v:r.m})), {unit:'M USD', f:v=>fmt(v), table:['Rota','M USD']}); }
drawFlow(0); seg(sf, v=>drawFlow(+v));

/* ---------- 8. profiles ---------- */
const sp = $('#segProf');
sp.innerHTML = D.profiles.map((p,i)=>`<button aria-pressed="${i===0}" data-v="${i}">${an(p.a)}</button>`).join('');
function drawProf(i){
  const p = D.profiles[i], ts = p.ts, last = ts.years.length-1, e = ts.exp[last], m = ts.imp[last];
  $('#profTiles').innerHTML = [
    [fmt(e,1),'mil M USD','exportações agrícolas'],[fmt(m,1),'mil M USD','importações agrícolas'],
    [(e-m>0?'+':'')+fmt(e-m,1),'mil M USD','saldo'],[fmt(e/m*100),'%','taxa de cobertura']
  ].map(t=>`<div class="tile"><span class="v">${t[0]}<small>${t[1]}</small></span><span class="k">${t[2]}</span></div>`).join('');
  const col = (h, arr, f) => `<div class="pcol"><h3>${h}</h3><ol>${arr.map((x,j)=>`<li><span class="r">${j+1}</span><span>${it(x)}</span><span class="x">${f(x)}</span></li>`).join('')}</ol></div>`;
  $('#profCols').innerHTML = col('Mais produzido (Mt)', p.prod, x=>fmt(x.mt,1)) + col('Mais exportado (mil M USD)', p.exp, x=>fmt(x.bn,2)) + col('Mais importado (mil M USD)', p.imp, x=>fmt(x.bn,2));
  const series = [{n:'Exportações',c:css('--s1'),v:ts.exp},{n:'Importações',c:css('--s2'),v:ts.imp}];
  legend($('#lgProf'), series, true);
  line($('#cProf'), {x:ts.years, series, h:220, aria:'Exportações e importações', tf:(s,j)=>fmt(s.v[j],1)+' mil M USD'});
}
drawProf(0); seg(sp, v=>drawProf(+v));

/* ---------- 9. Portugal ---------- */
const ptE = ptT.exp_m[pti], ptM = ptT.imp_m[pti];
const i2000 = ptT.years.indexOf(2000);
$('#ptTiles').innerHTML = [
  [fmt(ptE/1000,1),'mil M USD','exportações agrícolas, '+K.yt, '×'+fmt(ptE/ptT.exp_m[i2000],1)+' desde 2000'],
  [fmt(ptM/1000,1),'mil M USD','importações agrícolas, '+K.yt, '×'+fmt(ptM/ptT.imp_m[i2000],1)+' desde 2000'],
  [fmt((ptE-ptM)/1000,1),'mil M USD','saldo agrícola', 'défice estrutural desde 1961'],
  [fmt(ptE/ptM*100),'%','taxa de cobertura', 'era '+fmt(ptT.exp_m[i2000]/ptT.imp_m[i2000]*100)+'% em 2000']
].map(t=>`<div class="tile"><span class="v">${t[0]}<small>${t[1]}</small></span><span class="k">${t[2]}</span><span class="s">${t[3]}</span></div>`).join('');
(function(){ const series=[{n:'Exportações',c:css('--s1'),v:ptT.exp_m},{n:'Importações',c:css('--s2'),v:ptT.imp_m}];
  legend($('#lgPtT'), series, true);
  line($('#cPtTrade'), {x:ptT.years, series, aria:'Comércio agrícola de Portugal', tf:(s,i)=>fmt(s.v[i])+' M USD', table:true, tableEvery:5}); })();
dbars($('#cPtGroups'), D.pt_groups.slice().sort((a,b)=>(b.exp_m-b.imp_m)-(a.exp_m-a.imp_m)).map(g=>({l:g.name, v:g.exp_m-g.imp_m, f:1,
  tip:`<div class="r"><span>Exportações</span><b>${fmt(g.exp_m)} M</b></div><div class="r"><span>Importações</span><b>${fmt(g.imp_m)} M</b></div>`, cells:[fmt(g.exp_m),fmt(g.imp_m),fmt(g.exp_m-g.imp_m)]})),
  {f:v=>fmt(v), table:['Grupo','Export. (M USD)','Import. (M USD)','Saldo']});
(function(){
  const rows = D.pt_ssr.rows.filter(r=>r.ssr!=null).sort((a,b)=>b.ssr-a.ssr);
  const el = $('#cSSR'); const max = Math.max(...rows.map(r=>r.ssr));
  hbars(el, rows.map(r=>({l:r.name, v:r.ssr, dim:r.ssr<100, tip:`<div class="r"><span>Produção</span><b>${fmt(r.prod_t/1000)} mil t</b></div><div class="r"><span>Importação</span><b>${fmt(r.imp_t/1000)} mil t</b></div><div class="r"><span>Exportação</span><b>${fmt(r.exp_t/1000)} mil t</b></div><div class="r"><span>Autoaprovisionamento</span><b>${fmt(r.ssr)}%</b></div>`})), {max, unit:'%', f:v=>fmt(v)+'%'});
  el.querySelectorAll('.hb .tr').forEach(t=>{ const m=document.createElement('span'); m.style.cssText=`position:absolute;top:-3px;bottom:-3px;left:${100/max*100}%;border-left:1.5px dashed var(--ink-2)`; t.appendChild(m); });
  tableView(el, ['Produto','Produção (t)','Importação (t)','Exportação (t)','Autoaprov. (%)'], rows.map(r=>[r.name, fmt(r.prod_t), fmt(r.imp_t), fmt(r.exp_t), fmt(r.ssr)]));
})();
const spp = $('#segPtProd'); const PTS = [261,564,388,56,15,521,1765];
const ptSeries = PTS.map(id=>D.pt_prod.series.find(s=>s.id===id)).filter(Boolean);
spp.innerHTML = ptSeries.map((s,i)=>`<button aria-pressed="${i===0}" data-v="${i}">${s.name}</button>`).join('');
function drawPtProd(i){ const s = ptSeries[i];
  line($('#cPtProd'), {x:D.pt_prod.years, series:[{n:s.name,c:css('--bar'),v:s.kt,area:true}], h:240, aria:'Produção em Portugal', tf:(se,j)=>fmt(se.v[j],1)+' mil t', table:true, tableEvery:5}); }
drawPtProd(0); seg(spp, v=>drawPtProd(+v));
function drawPart(k){ const p = D.pt_partners[k];
  hbars($('#cPart'), p.top.map(r=>({l:an(r.a), v:r.share, tip:`<div class="r"><span>Valor</span><b>${fmt(r.m)} M USD</b></div><div class="r"><span>Quota</span><b>${fmt(r.share,1)}%</b></div>`})), {unit:'%', f:v=>fmt(v,1)+'%', table:['País','%']}); }
drawPart('exp'); seg($('#segPart'), drawPart);
const pl = D.pt_land;
$('#ptLand').innerHTML = `<b>Terra em Portugal (${pl.year}):</b> ${fmt(pl['6610'])} mil ha de terra agrícola (${fmt(pl['6610']/pl['6601']*100)}% do território), dos quais ${fmt(pl['6620'])} mil ha cultivados e ${fmt(pl['6655'])} mil ha de pastagens permanentes. ${fmt(pl['6690'])} mil ha estão equipados para rega e ${fmt(pl['6671'])} mil ha em modo biológico, ou seja, ${fmt(pl['6671']/pl['6610']*100)}% da terra agrícola contra cerca de 2% no mundo. A floresta ocupa ${fmt(pl['6646'])} mil ha.`;

/* ---------- 10. claims ---------- */
const ICON = {ok:'<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M2.5 6.5l2.2 2.2L9.5 3.5"/></svg>', nu:'<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3v4M6 9v.5"/></svg>', na:'<svg viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h6"/></svg>'};
const LBL = {ok:'Confirma-se', nu:'Com nuance', na:'Fora do âmbito'};
const prof = c => D.profiles.find(p=>p.a===c);
const topNames = (c,k,n=4) => prof(c)[k].slice(0,n).map(it).join(', ');
const C = [
  ['ok', `<b>Brasil exporta soja, açúcar, carne bovina e café.</b> Os 4 primeiros produtos exportados são ${topNames(21,'exp')}. O trigo é a maior importação.`],
  ['na', `<b>Brasil exporta celulose e importa fertilizantes e químicos.</b> É verdade, mas não são produtos agrícolas nas estatísticas da FAO. Ver UN Comtrade ou OEC.`],
  ['nu', `<b>EUA exportam milho, soja, algodão, carne suína e frutos secos.</b> No topo estão ${topNames(231,'exp',5)}. A carne bovina pesa mais do que a suína. As importações são lideradas por bebidas espirituosas, carne, cerveja, vinho e café.`],
  ['ok', `<b>China importa soja e carne para ração e consumo.</b> A soja sozinha custou ${fmt(prof(41).imp[0].bn,1)} mil M USD, seguida de carne de bovino.`],
  ['nu', `<b>China exporta chá, hortícolas processados e alho.</b> O alho é de facto o 1.º produto agrícola exportado. O peixe não entra nesta base. As exportações agrícolas chinesas (${fmt(prof(41).ts.exp.at(-1),0)} mil M USD) são pequenas face às importações.`],
  ['ok', `<b>UE exporta vinho, queijo e carne de porco; importa café, cacau e oleaginosas.</b> Queijo e vinho lideram as exportações, e trigo, azeite e carne de porco também estão no top 8. Nas importações, café verde, cacau e bagaço de soja surgem logo a seguir ao queijo. Nota: os valores da UE incluem o comércio intra-UE.`],
  ['ok', `<b>Ucrânia e Rússia exportam trigo, óleo de girassol e milho.</b> Confirma-se nos dois países. A Rússia é o 1.º exportador mundial de trigo.`],
  ['ok', `<b>Portugal exporta azeite e vinho; a Espanha é o principal parceiro.</b> Azeite e vinho são os 2 primeiros produtos exportados. A Espanha recebe ${fmt(D.pt_partners.exp.top[0].share)}% das exportações.`],
  ['ok', `<b>Portugal importa a maioria dos cereais e a soja.</b> Autoaprovisionamento de ${fmt(D.pt_ssr.rows.find(r=>r.id===15).ssr)}% no trigo, ${fmt(D.pt_ssr.rows.find(r=>r.id===56).ssr)}% no milho e 0% na soja.`],
  ['nu', `<b>Portugal destaca-se na pasta de papel.</b> É um setor florestal e industrial, não agrícola. Fica fora deste relatório.`]
];
$('#claims').innerHTML = C.map(c=>`<div class="claim"><span class="pill ${c[0]}">${ICON[c[0]]}${LBL[c[0]]}</span><p>${c[1]}</p></div>`).join('');


}
fetch("/data/agriculture-global.json?v=20261003")
  .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then((data) => { D = data; render(); })
  .catch(() => {
    const el = document.getElementById("agri-findings");
    if (el) el.innerHTML = "<li>Não foi possível carregar os dados. Recarregue a página.</li>";
  });
})();

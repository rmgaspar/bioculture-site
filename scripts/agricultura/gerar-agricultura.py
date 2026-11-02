#!/usr/bin/env python3
"""Gera data/agriculture-global.json para observatorio/producao-agricola.html.

Fonte: FAOSTAT bulk downloads (produção QCL, comércio TCL, matriz de comércio TM,
uso do solo RL). Os ficheiros originais (~12 GB descomprimidos) ficam em
.cache/faostat/ e não são versionados.

Uso:
    pip install pandas numpy pycountry
    python3 scripts/agricultura/gerar-agricultura.py            # usa a cache se existir
    python3 scripts/agricultura/gerar-agricultura.py --refresh  # descarrega de novo
"""
import json, subprocess, sys, urllib.request, zipfile
import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
import pycountry

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / '.cache' / 'faostat'
OUT = ROOT / 'data' / 'agriculture-global.json'
BULK = 'https://bulks-faostat.fao.org/production/'
INDEX = BULK + 'datasets_E.xml'
EUROSTAT_FX = ('https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/ert_bil_eur_a'
               '?currency=USD&statinfo=AVG&format=JSON&lang=EN')
DATASETS = {
    'QCL': 'Production_Crops_Livestock_E_All_Data_(Normalized)',
    'TCL': 'Trade_CropsLivestock_E_All_Data_(Normalized)',
    'TM': 'Trade_DetailedTradeMatrix_E_All_Data_(Normalized)',
    'RL': 'Inputs_LandUse_E_All_Data_(Normalized)',
}
REFRESH = '--refresh' in sys.argv
CACHE.mkdir(parents=True, exist_ok=True)


def fetch(code):
    name = DATASETS[code]
    csv = CACHE / f'{name}.csv'
    if csv.exists() and not REFRESH:
        return csv
    zpath = CACHE / f'{name}.zip'
    print(f'A descarregar {code}…', flush=True)
    urllib.request.urlretrieve(BULK + urllib.request.quote(name) + '.zip', zpath)
    with zipfile.ZipFile(zpath) as z:
        z.extractall(CACHE)
    zpath.unlink()
    return csv


def dataset_info():
    xml = CACHE / 'datasets_E.xml'
    if REFRESH or not xml.exists():
        urllib.request.urlretrieve(INDEX, xml)
    info = {}
    for d in ET.parse(xml).getroot():
        code = d.findtext('DatasetCode')
        if code in DATASETS:
            info[code] = {'name': d.findtext('DatasetName'), 'updated': (d.findtext('DateUpdate') or '')[:10],
                          'url': f'https://www.fao.org/faostat/en/#data/{code}'}
    return info


def codes(code, kind):
    return pd.read_csv(CACHE / DATASETS[code].replace('All_Data_(Normalized)', f'{kind}.csv'), encoding='utf-8')


def tm_subset():
    """Portugal (todas as linhas) e valor exportado de soja, trigo, milho, café e cacau."""
    sub = CACHE / 'tm_subset.csv'
    src = fetch('TM')
    if REFRESH or not sub.exists() or sub.stat().st_mtime < src.stat().st_mtime:
        pattern = r'^"174",|,"(236|15|56|656|661)","[^"]*","[^"]*","5922",'
        with open(sub, 'wb') as fh:
            subprocess.run(['grep', '-E', pattern, str(src)], stdout=fh, check=True, env={'LC_ALL': 'C'})
    return sub


DATASET_INFO = dataset_info()
F = str(CACHE) + '/'
COLS = ['Area Code', 'Area', 'Item Code', 'Item', 'Element Code', 'Year', 'Unit', 'Value']
P = pd.read_csv(fetch('QCL'), usecols=COLS + ['Element', 'Flag'], encoding='utf-8')
T = pd.concat(c[c['Element Code'].isin([5922, 5622, 5910, 5610])]
              for c in pd.read_csv(fetch('TCL'), usecols=COLS, encoding='utf-8', chunksize=3_000_000))
VALUE_ELEMENTS = (5922, 5622)  # Export value, Import value (1000 USD correntes)


def eur_rates():
    """Taxas médias anuais EUR/USD (1971–1998: ECU) do Eurostat, ert_bil_eur_a."""
    cache = CACHE / 'eurostat_ert_bil_eur_a_usd.json'
    if REFRESH or not cache.exists():
        urllib.request.urlretrieve(EUROSTAT_FX, cache)
    d = json.loads(cache.read_text())
    idx = {i: int(y) for y, i in d['dimension']['time']['category']['index'].items()}
    return {idx[int(k)]: v for k, v in d['value'].items()}, d.get('updated', '')[:10]


FX, FX_UPDATED = eur_rates()


def to_eur(df, year_col, value_col, element_col):
    """Converte valores em USD para EUR com a taxa média do próprio ano; anos sem taxa (antes de 1971) saem."""
    is_val = df[element_col].isin(VALUE_ELEMENTS)
    rate = df[year_col].map(FX)
    df = df[~is_val | rate.notna()].copy()
    m = df[element_col].isin(VALUE_ELEMENTS)
    df.loc[m, value_col] = df.loc[m, value_col] / df.loc[m, year_col].map(FX)
    return df


T = to_eur(T, 'Year', 'Value', 'Element Code')
L = pd.read_csv(fetch('RL'), encoding='utf-8', usecols=['Area Code', 'Item Code', 'Element Code', 'Year', 'Value', 'Unit'])
am = pd.concat([codes('QCL', 'AreaCodes'), codes('TCL', 'AreaCodes'), codes('RL', 'AreaCodes')]).drop_duplicates('Area Code')
M49 = dict(zip(am['Area Code'], am.iloc[:, 1].astype(str).str.strip("'")))
ANAME = dict(zip(am['Area Code'], am['Area']))


def aggregates(code):
    it = codes(code, 'ItemCodes')
    agg = it[it.iloc[:, 1].astype(str).str.match(r"'[FT]")]['Item Code']
    return set(pd.to_numeric(agg, errors='coerce').dropna().astype(int))


AGG_T, AGG_P = aggregates('TCL'), aggregates('QCL')

# Países: códigos FAO < 5000 com correspondência ISO, sem o agregado «China» (351),
# «China (excluding intra-trade)» (265) e Estados extintos.
EXCL = {351, 265, 228, 248, 15, 51, 62, 186, 206}


def iso2(code):
    if code == 41: return 'CN'
    if code == 214: return 'TW'
    m = M49.get(code)
    try:
        c = pycountry.countries.get(numeric=str(m).zfill(3))
        return c.alpha_2 if c else None
    except Exception:
        return None


def is_country(c): return c < 5000 and c not in EXCL and iso2(c) is not None


WORLD = 5000
YP = int(P.Year.max()); YT = int(T.Year.max())
used_areas = set()
def A(code):
    used_areas.add(int(code)); return int(code)

def r(x, n=0):
    if x is None or (isinstance(x, float) and np.isnan(x)): return None
    return round(float(x), n) if n else int(round(float(x)))

prod = P[P['Element Code'] == 5510]
areah = P[P['Element Code'] == 5312]
out = {'meta': {'production_year': YP, 'trade_year': YT}}

# ---- A. World production by group, 1961-YP (Mt)
GROUPS = {1717: 'Cereais', 1723: 'Culturas açucareiras', 1735: 'Hortícolas', 1738: 'Fruta',
          1720: 'Raízes e tubérculos', 1780: 'Leite', 1732: 'Oleaginosas (óleo equiv.)', 1765: 'Carne', 1726: 'Leguminosas secas'}
w = prod[(prod['Area Code'] == WORLD) & prod['Item Code'].isin(GROUPS)]
pv = w.pivot_table(index='Year', columns='Item Code', values='Value')
out['world_groups'] = {'years': [int(y) for y in pv.index],
                       'series': [{'id': int(k), 'name': v, 'mt': [r(x / 1e6, 1) for x in pv[k]]} for k, v in GROUPS.items()]}

# ---- B. Cereals: production, area, yield
cp = prod[(prod['Area Code'] == WORLD) & (prod['Item Code'] == 1717)].set_index('Year').Value
ca = areah[(areah['Area Code'] == WORLD) & (areah['Item Code'] == 1717)].set_index('Year').Value
yrs = sorted(set(cp.index) & set(ca.index))
out['cereals'] = {'years': yrs, 'prod_mt': [r(cp[y] / 1e6, 1) for y in yrs], 'area_mha': [r(ca[y] / 1e6, 1) for y in yrs],
                  'yield_tha': [r(cp[y] / ca[y], 2) for y in yrs]}

# ---- C. Top individual commodities world YP
wi = prod[(prod['Area Code'] == WORLD) & (prod.Year == YP) & ~prod['Item Code'].isin(AGG_P) & (prod.Unit == 't')]
wi = wi.sort_values('Value', ascending=False).head(20)
out['top_items'] = [{'id': int(a), 'item': b, 'mt': r(c / 1e6, 1)} for a, b, c in zip(wi['Item Code'], wi.Item, wi.Value)]

# ---- D. Top producers per key commodity
KEY = [56, 15, 27, 236, 156, 116, 254, 656, 661, 260, 261, 560, 564, 388, 1765, 1780, 521, 125]
pc = prod[prod['Area Code'].map(is_country)]
key_out = []
for it in KEY:
    yk = int(prod[(prod['Area Code'] == WORLD) & (prod['Item Code'] == it)].Year.max())
    s = pc[(pc['Item Code'] == it) & (pc.Year == yk)].sort_values('Value', ascending=False)
    wv = prod[(prod['Area Code'] == WORLD) & (prod['Item Code'] == it) & (prod.Year == yk)].Value
    if s.empty or wv.empty: continue
    wv = float(wv.iloc[0])
    top = s.head(10)
    prt = s[s['Area Code'] == 174]
    rank_pt = int(list(s['Area Code']).index(174)) + 1 if 174 in set(s['Area Code']) else None
    # world series
    ws = prod[(prod['Area Code'] == WORLD) & (prod['Item Code'] == it)].set_index('Year').Value
    key_out.append({'id': it, 'item': s.Item.iloc[0], 'year': yk, 'world_mt': r(wv / 1e6, 2),
                    'top': [{'a': A(a), 't': r(v)} for a, v in zip(top['Area Code'], top.Value)],
                    'top5_share': r(top.head(5).Value.sum() / wv * 100, 1),
                    'pt': {'t': r(prt.Value.iloc[0]) if len(prt) else None, 'rank': rank_pt, 'n': len(s)},
                    'world_ts': {'y0': 1961, 'mt': [r(ws.get(y, np.nan) / 1e6, 2) for y in range(1961, yk + 1)]}})
out['key'] = key_out

# ---- E. Continental share of cereals, by decade
CONT = {5300: 'Ásia', 5200: 'Américas', 5400: 'Europa', 5100: 'África', 5500: 'Oceânia'}
cont_years = [1961, 1970, 1980, 1990, 2000, 2010, 2020, YP]
cc = prod[prod['Area Code'].isin(CONT) & (prod['Item Code'] == 1717) & prod.Year.isin(cont_years)]
cpv = cc.pivot_table(index='Year', columns='Area Code', values='Value')
out['cereals_continent'] = {'years': cont_years, 'series': [{'id': k, 'name': v, 'mt': [r(cpv.loc[y, k] / 1e6, 1) for y in cont_years]} for k, v in CONT.items()]}
# same for meat
mc = prod[prod['Area Code'].isin(CONT) & (prod['Item Code'] == 1765) & prod.Year.isin(cont_years)]
mpv = mc.pivot_table(index='Year', columns='Area Code', values='Value')
out['meat_continent'] = {'years': cont_years, 'series': [{'id': k, 'name': v, 'mt': [r(mpv.loc[y, k] / 1e6, 1) for y in cont_years]} for k, v in CONT.items()]}

# ---- F. Land use (world)
LI = {6620: 'Terra cultivada', 6655: 'Prados e pastagens permanentes', 6610: 'Terra agrícola', 6646: 'Floresta',
      6601: 'Área terrestre', 6690: 'Equipada para rega', 6671: 'Agricultura biológica'}
lw = L[(L['Area Code'] == WORLD) & L['Item Code'].isin(LI) & (L['Element Code'] == 5110)]
lpv = lw.pivot_table(index='Year', columns='Item Code', values='Value')
ly = [int(y) for y in lpv.index if y >= 1961 and not np.isnan(lpv.loc[y, 6610])]
out['land'] = {'years': ly, 'unit': 'Mha', 'series': {str(k): [r(lpv.loc[y, k] / 1000, 1) if k in lpv and not np.isnan(lpv.loc[y, k]) else None for y in ly] for k in LI}}
out['land_names'] = {str(k): v for k, v in LI.items()}
# organic area top countries latest
lo = L[(L['Item Code'] == 6671) & (L['Element Code'] == 5110) & L['Area Code'].map(is_country)]
loy = int(lo.Year.max()); lo = lo[lo.Year == loy].sort_values('Value', ascending=False)
out['organic'] = {'year': loy, 'top': [{'a': A(a), 'kha': r(v)} for a, v in zip(lo['Area Code'].head(12), lo.Value.head(12))],
                  'pt_kha': r(lo[lo['Area Code'] == 174].Value.sum())}
# Agricultural land share of land area per selected
# ---- G. Trade
tv = T[T['Element Code'].isin([5922, 5622])]
tot = tv[tv['Item Code'] == 1882]
wt = tot[(tot['Area Code'] == WORLD)].pivot_table(index='Year', columns='Element Code', values='Value')
out['world_trade'] = {'years': [int(y) for y in wt.index], 'exp_bn': [r(x / 1e6, 1) for x in wt[5922]]}
tc = tot[tot['Area Code'].map(is_country) & (tot.Year == YT)].pivot_table(index='Area Code', columns='Element Code', values='Value').fillna(0)
tc['bal'] = tc[5922] - tc[5622]
def rows(df, col, n):
    d = df.sort_values(col, ascending=False).head(n)
    return [{'a': A(a), 'exp': r(e / 1e6, 2), 'imp': r(i / 1e6, 2), 'bal': r(b / 1e6, 2)} for a, e, i, b in zip(d.index, d[5922], d[5622], d['bal'])]
out['exporters'] = rows(tc, 5922, 15)
out['importers'] = rows(tc, 5622, 15)
bs = tc.sort_values('bal')
out['surplus'] = [{'a': A(a), 'bal': r(b / 1e6, 2)} for a, b in zip(bs.index[::-1][:12], bs['bal'][::-1][:12])]
out['deficit'] = [{'a': A(a), 'bal': r(b / 1e6, 2)} for a, b in zip(bs.index[:12], bs['bal'][:12])]
# top traded items world YT (individual)
ti = tv[(tv['Area Code'] == WORLD) & (tv.Year == YT) & (tv['Element Code'] == 5922) & ~tv['Item Code'].isin(AGG_T)].sort_values('Value', ascending=False).head(20)
out['top_traded'] = [{'id': int(a), 'item': b, 'bn': r(c / 1e6, 2)} for a, b, c in zip(ti['Item Code'], ti.Item, ti.Value)]

# key commodity trade (quantity)
tq = T[T['Element Code'].isin([5910, 5610]) & T['Area Code'].map(is_country) & (T.Year == YT)]
KT = [236, 15, 56, 30, 656, 661, 257, 1058, 564, 261]
kt = []
for it in KT:
    s = tq[tq['Item Code'] == it]
    if s.empty: continue
    e = s[s['Element Code'] == 5910].sort_values('Value', ascending=False)
    i = s[s['Element Code'] == 5610].sort_values('Value', ascending=False)
    we = e.Value.sum()
    kt.append({'id': it, 'item': s.Item.iloc[0],
               'exp': [{'a': A(a), 't': r(v)} for a, v in zip(e['Area Code'].head(8), e.Value.head(8))],
               'imp': [{'a': A(a), 't': r(v)} for a, v in zip(i['Area Code'].head(8), i.Value.head(8))],
               'exp_total_t': r(we), 'imp_total_t': r(i.Value.sum()),
               'top3_exp_share': r(e.Value.head(3).sum() / we * 100, 1)})
out['key_trade'] = kt

# ---- H. Power profiles
POW = [21, 231, 41, 100, 5707, 230, 185, 9, 174]
prof = []
for c in POW:
    pp = prod[(prod['Area Code'] == c) & (prod.Year == YP) & ~prod['Item Code'].isin(AGG_P) & (prod.Unit == 't')]
    pp = pp.sort_values('Value', ascending=False).head(8)
    tt = tv[(tv['Area Code'] == c) & (tv.Year == YT) & ~tv['Item Code'].isin(AGG_T)]
    ex = tt[tt['Element Code'] == 5922].sort_values('Value', ascending=False).head(8)
    im = tt[tt['Element Code'] == 5622].sort_values('Value', ascending=False).head(8)
    ts = tot[tot['Area Code'] == c].pivot_table(index='Year', columns='Element Code', values='Value')
    ts = ts[ts.index >= 1990]
    prof.append({'a': A(c),
                 'prod': [{'id': int(a), 'item': b, 'mt': r(v / 1e6, 2)} for a, b, v in zip(pp['Item Code'], pp.Item, pp.Value)],
                 'exp': [{'id': int(a), 'item': b, 'bn': r(v / 1e6, 2)} for a, b, v in zip(ex['Item Code'], ex.Item, ex.Value)],
                 'imp': [{'id': int(a), 'item': b, 'bn': r(v / 1e6, 2)} for a, b, v in zip(im['Item Code'], im.Item, im.Value)],
                 'ts': {'years': [int(y) for y in ts.index], 'exp': [r(x / 1e6, 2) for x in ts[5922]], 'imp': [r(x / 1e6, 2) for x in ts[5622]]}})
out['profiles'] = prof

# ---- I. Portugal
PT = 174
ptt = tot[tot['Area Code'] == PT].pivot_table(index='Year', columns='Element Code', values='Value')
out['pt_trade'] = {'years': [int(y) for y in ptt.index], 'exp_m': [r(x / 1e3) for x in ptt[5922]], 'imp_m': [r(x / 1e3) for x in ptt[5622]]}
PG = {1944: 'Cereais', 1885: 'Carne e preparações', 1886: 'Lacticínios e ovos', 1889: 'Frutas e hortícolas',
      1844: 'Óleos e gorduras', 1907: 'Bebidas alcoólicas', 1908: 'Bebidas não alcoólicas', 1899: 'Oleaginosas',
      1892: 'Alimentos para animais', 1848: 'Outros alimentos'}
pg = tv[(tv['Area Code'] == PT) & (tv.Year == YT) & tv['Item Code'].isin(PG)].pivot_table(index='Item Code', columns='Element Code', values='Value').fillna(0)
out['pt_groups'] = sorted([{'id': int(k), 'name': PG[k], 'exp_m': r(pg.loc[k, 5922] / 1e3), 'imp_m': r(pg.loc[k, 5622] / 1e3)} for k in pg.index], key=lambda d: d['exp_m'] - d['imp_m'])
# self-sufficiency: avg of last 3 years
SS = {15: 'Trigo', 56: 'Milho', 44: 'Cevada', 236: 'Soja', 261: 'Azeite', 564: 'Vinho', 388: 'Tomate',
      521: 'Pera', 515: 'Maçã', 116: 'Batata', 1058: 'Carne de frango', 1035: 'Carne de porco', 882: 'Leite de vaca', 490: 'Laranja'}
yrs3 = [YT - 2, YT - 1, YT]
ss = []
for k, n in SS.items():
    pp_ = prod[(prod['Area Code'] == PT) & (prod['Item Code'] == k) & prod.Year.isin(yrs3)].set_index('Year').Value
    ys = [y for y in yrs3 if y in pp_.index] or yrs3
    pv_ = float(pp_.reindex(ys).fillna(0).mean())
    tq_ = T[(T['Area Code'] == PT) & (T['Item Code'] == k) & T.Year.isin(ys)]
    iq = tq_[tq_['Element Code'] == 5610].groupby('Year').Value.sum().reindex(ys).fillna(0).mean()
    eq = tq_[tq_['Element Code'] == 5910].groupby('Year').Value.sum().reindex(ys).fillna(0).mean()
    supply = pv_ + iq - eq
    ss.append({'id': k, 'name': n, 'years': ys, 'prod_t': r(pv_), 'imp_t': r(iq), 'exp_t': r(eq), 'ssr': r(pv_ / supply * 100, 0) if supply > 0 else None})
out['pt_ssr'] = {'years': yrs3, 'rows': ss}
# PT production trends
PTI = {261: 'Azeite', 564: 'Vinho', 388: 'Tomate', 56: 'Milho', 15: 'Trigo', 521: 'Pera', 1765: 'Carne (total)', 260: 'Azeitona', 27: 'Arroz'}
ptp = prod[(prod['Area Code'] == PT) & prod['Item Code'].isin(PTI)].pivot_table(index='Year', columns='Item Code', values='Value')
out['pt_prod'] = {'years': [int(y) for y in ptp.index], 'series': [{'id': k, 'name': v, 'kt': [r(x / 1e3, 1) if not np.isnan(x) else None for x in ptp[k]]} for k, v in PTI.items() if k in ptp]}
# PT land
plt_ = L[(L['Area Code'] == PT) & L['Item Code'].isin([6610, 6620, 6655, 6646, 6671, 6690, 6601]) & (L['Element Code'] == 5110)]
pl = plt_.pivot_table(index='Year', columns='Item Code', values='Value')
ly2 = int(pl[6610].dropna().index.max())
out['pt_land'] = {'year': ly2, **{str(k): r(pl.loc[ly2, k], 1) if k in pl and not np.isnan(pl.loc[ly2, k]) else None for k in [6601, 6610, 6620, 6655, 6646, 6671, 6690]},
                  'agri_ts': {'years': [int(y) for y in pl.index if y <= ly2], 'agri': [r(x, 0) for x in pl[6610][pl.index <= ly2]], 'crop': [r(x, 0) for x in pl[6620][pl.index <= ly2]]}}

# ---- J. Partners from detailed trade matrix
TM = pd.read_csv(tm_subset(), header=None, encoding='utf-8', encoding_errors='replace',
                 names=['rc', 'rm', 'rn', 'pc', 'pm', 'pn', 'ic', 'icpc', 'item', 'ec', 'el', 'yc', 'y', 'u', 'v', 'f'])
TM = to_eur(TM, 'y', 'v', 'ec')
YTM = int(TM.y.max())
pt_tm = TM[(TM.rc == PT) & (TM.y == YTM) & TM.ec.isin([5922, 5622])]
def partners(ec):
    s = pt_tm[pt_tm.ec == ec].groupby('pc').v.sum().sort_values(ascending=False)
    tot_ = s.sum()
    return {'total_m': r(tot_ / 1e3), 'top': [{'a': A(a), 'm': r(v / 1e3), 'share': r(v / tot_ * 100, 1)} for a, v in s.head(10).items()]}
out['pt_partners'] = {'year': YTM, 'exp': partners(5922), 'imp': partners(5622)}
# Soy & co: who sells to whom (largest bilateral flows by export value)
flows = []
for it in [236, 15, 56, 656, 661]:
    s = TM[(TM.ic == it) & (TM.ec == 5922) & (TM.y == YTM) & TM.rc.map(is_country) & TM.pc.map(is_country)]
    s = s.sort_values('v', ascending=False).head(8)
    flows.append({'id': it, 'item': s.item.iloc[0] if len(s) else '', 'rows': [{'from': A(a), 'to': A(b), 'm': r(v / 1e3)} for a, b, v in zip(s.rc, s.pc, s.v)]})
out['flows'] = {'year': YTM, 'items': flows}

# Area names & ISO2 for Intl.DisplayNames in the browser
out['areas'] = {str(a): {'iso2': iso2(a), 'en': ANAME.get(a)} for a in sorted(used_areas)}
out['meta'].update({
    'dataset': 'Bioculture Global Agriculture',
    'generated_at': date.today().isoformat(),
    'language': 'pt',
    'source': 'FAOSTAT (FAO)',
    'licence': 'CC BY-NC-SA 3.0 IGO',
    'datasets': DATASET_INFO,
    'partners_year': YTM,
    'currency': 'EUR',
    'currency_note': ('Valores de comércio convertidos de USD correntes para EUR com a taxa média anual '
                      'do próprio ano (Eurostat ert_bil_eur_a; 1971–1998: ECU). Série começa em 1971.'),
    'fx_source': {'dataset': 'ert_bil_eur_a', 'updated': FX_UPDATED,
                  'url': 'https://ec.europa.eu/eurostat/databrowser/view/ert_bil_eur_a/default/table'},
    'missing_data_policy': 'Volumes tal como publicados pela FAO (incluindo estimativas oficiais). Nada é interpolado.',
    'country_note': 'China = China continental (código FAO 41). UE (27) = agregado FAO, inclui comércio intra-UE.'
})
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'{OUT} escrito: produção {YP}, comércio {YT}, parceiros {YTM}')

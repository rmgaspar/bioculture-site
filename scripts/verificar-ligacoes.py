#!/usr/bin/env python3
"""Verifica as ligações externas de fontes do site (HTML, JS, JSON, scripts) e lista as que não respondem.

Uso: python3 scripts/verificar-ligacoes.py [--so-404]   (demora uns minutos; faz pedidos reais)

Limites conhecidos (por isso o resultado é uma lista para olhar, não um veredicto):
- Vários sítios dão 403/401 a pedidos automáticos (iNaturalist, UNEP, doi.org, IRENA, Reuters): ignorados.
- Alguns dão 404 a quem não é um browser (fao.org) ou mudam de endereço sem aviso (dgadr.gov.pt perdeu o prefixo /pt/);
  confirma sempre num browser antes de mexer.
- Endereços que acabam em «)» são cortados pela expressão regular; os que aparecem truncados costumam ser falsos positivos.
- Imagens, redes sociais, Wikimedia e serviços de dados (APIs) ficam de fora.
"""
import concurrent.futures as cf, collections, re, subprocess, sys

FICHEIROS = subprocess.run(
    "git ls-files '*.html' '*.js' '*.json' '*.py' '*.mjs' | grep -v 'assets/vendor\\|assets/lang\\|jquery\\|data/regioes\\|data/especies\\|especies_master\\|bioregioes'",
    shell=True, capture_output=True, text=True).stdout.split()
UE = re.compile(r'https?://[^\s"\'<>)\]\\`}]+')
IGNORAR = re.compile(r'bioculture\.pt|localhost|example\.|w3\.org|schema\.org|\$\{|\{|googleapis|gstatic|cloudflare|rmgaspar|creativecommons|xmlns|ogp\.me|ifap\.pt/isip/ows|earth-search|open-meteo|openstreetmap|arcgisonline|\.(jpe?g|png|webp|gif|svg)(\?|$)|thumb\.wikimedia|upload\.wikimedia|commons\.wikimedia|inaturalist|google\.com|youtube|facebook|twitter|linkedin|instagram|i\.guim|imgs\.mongabay|unsplash')
ONDE = collections.defaultdict(set)
for f in FICHEIROS:
    try: t = open(f, encoding='utf-8', errors='ignore').read()
    except OSError: continue
    if len(t) > 3_000_000: continue
    for u in UE.findall(t):
        u = u.rstrip('.,;:')
        if not IGNORAR.search(u): ONDE[u].add(f)

def ver(u):
    r = subprocess.run(['curl', '-sL', '-m', '25', '-A', 'Mozilla/5.0 (Macintosh) Chrome/124', '-o', '/dev/null', '-w', '%{http_code}', '-r', '0-0', u], capture_output=True, text=True)
    return u, r.stdout.strip()

print(f'{len(ONDE)} ligações a verificar…', file=sys.stderr)
with cf.ThreadPoolExecutor(16) as ex: res = list(ex.map(ver, sorted(ONDE)))
so404 = '--so-404' in sys.argv
mau = [(u, c) for u, c in res if (c in ('404', '410') if so404 else not c.startswith(('2', '3')) and c not in ('401', '403', '416'))]
for u, c in mau: print(c, u, '←', ', '.join(sorted(ONDE[u])[:3]))
print(f'{len(mau)} a olhar de {len(res)}', file=sys.stderr)

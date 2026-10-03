#!/usr/bin/env python3
"""Atualiza as consultas públicas de renováveis do Participa.pt em data/zaer_critico.json.

1. Pesquisa o portal por termos de renováveis e filtra pelo título.
2. Lê a ficha de cada consulta relevante (aberta, ou do ano corrente) e dos
   registos antigos já acompanhados.
3. Atualiza `consultas_participa`, o bloco PSZAER e os pontos do mapa, guardando
   o instantâneo anterior em `metadados.instantaneos_anteriores`.
4. Calcula factos sobre a participação (duração, agosto, participações).
5. Para cada consulta aberta ainda não conhecida, cria uma proposta em
   `data/noticias_propostas.json`. Nada é publicado sem `/aprovar`.

Uso:
    python3 scripts/participa/atualizar.py            # atualiza os ficheiros
    python3 scripts/participa/atualizar.py --dry-run  # só mostra o resumo
"""
from __future__ import annotations

import datetime as dt
import html
import json
import re
import statistics
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "data" / "zaer_critico.json"
PROPOSALS = ROOT / "data" / "noticias_propostas.json"
NEWS_FILES = [ROOT / "data" / f for f in ("noticias.json", "noticias_propostas.json", "noticias_rejeitadas.json", "noticias_arquivo.json")]
BASE = "https://participa.pt"
SEARCH = BASE + "/requests/get_consultations.php"
UA = "Mozilla/5.0 (compatible; bioCulture-observatorio; +https://www.bioculture.pt)"
TERMS = ["Central Solar", "fotovoltaica", "solar", "eólico", "eólica", "hibridização", "ZAER", "energias renováveis"]
RELEVANT = re.compile(r"solar|fotovolt|e[óo]lic|hibridiz|ZAER|renov[áa]v|armazenamento de energia", re.I)
PSZAER_URL = BASE + "/pt/consulta/programa-setorial-das-zonas-de-aceleracao-da-implantacao-de-energias-renovaveis-pszaer"
MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
LABELS = {"Designação completa", "Período de consulta", "Estado", "Área temática", "Tipologia", "Sub-Tipologia",
          "Entidade promotora da CP", "Entidade promotora do projeto", "Entidade coordenadora", "Formas de participação"}
DRY = "--dry-run" in sys.argv
TODAY = dt.date.today()


def http(url: str, payload: dict | None = None) -> str:
    data = json.dumps(payload).encode() if payload is not None else None
    headers = {"User-Agent": UA}
    if data:
        headers["Content-Type"] = "application/json"
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=headers), timeout=60) as r:
                return r.read().decode("utf-8", "ignore")
        except Exception:
            if attempt == 2:
                raise
            time.sleep(3 * (attempt + 1))
    return ""


def clean(value: str | None) -> str | None:
    return html.unescape(re.sub(r"\s+", " ", value)).strip() if value else None


def search(term: str) -> list[dict]:
    rows, page, pages = [], 0, 1
    while page < pages and page < 60:
        s = http(SEARCH, {"subdomain": "", "page": page, "activated": 0, "search_tf": term, "order_by": "", "thematic_area": "",
                          "tipology": "", "entity_cp": "", "location": "", "is_open": 0, "is_avaliation": 0, "is_closed": 0, "sorting": "DESC"})
        n = re.search(r'id="n-pages"[^>]*value="(\d+)"', s)
        pages = int(n.group(1)) if n else 1
        for m in re.finditer(r'<a class="[^"]*grid-card" href="([^"]+)">(.*?)</a>', s, re.S):
            card = m.group(2)
            pick = lambda pat: clean((re.search(pat, card, re.S) or [None, None])[1])
            dates = (pick(r'<div class="dates">(.*?)</div>') or "").split("|")
            values = re.findall(r'<span class="value">(\d+)</span>', card)
            rows.append({"url": BASE + m.group(1), "titulo": pick(r'<div class="card-title">(.*?)</div>'),
                         "tipologia": pick(r'<div class="card-tag">(.*?)</div>'), "estado": pick(r'<div class="card-state[^"]*">(.*?)</div>'),
                         "entidade": pick(r'<div class="card-subtitle">(.*?)</div>'),
                         "inicio": dates[0].strip() if dates else "", "fim": dates[1].strip() if len(dates) > 1 else "",
                         "participacoes": int(values[0]) if values else None, "a_seguir": int(values[1]) if len(values) > 1 else None})
        page += 1
        time.sleep(0.4)
    return rows


def detail(url: str) -> dict:
    s = http(url)
    text = re.sub(r"<script.*?</script>|<style.*?</style>", "", s, flags=re.S)
    lines = [l.strip() for l in html.unescape(re.sub(r"<[^>]+>", "\n", text)).split("\n") if l.strip()]
    joined = "\n" + "\n".join(lines)
    d: dict = {"url": url}
    if "Dados Gerais" in lines:
        j = lines.index("Dados Gerais") + 1
        while j < len(lines) - 1 and lines[j] != "Localização":
            if lines[j] in LABELS:
                d[lines[j]] = lines[j + 1]
                j += 2
            else:
                j += 1
    for key, label in (("participacoes", "participações"), ("a_seguir", "a seguir")):
        m = re.search(rf"\n(\d+)\n{label}\n", joined)
        d[key] = int(m.group(1)) if m else None
    districts = []
    for block in re.findall(r'<div class="district-title">(.*?)(?=<div class="location-item">|</section>)', s, re.S):
        districts.append((clean(re.split(r"<div", block)[0]), [clean(c) for c in re.findall(r'<span class="bullet">•</span>\s*([^<]+)', block)]))
    d["distritos"] = [x for x, _ in districts if x]
    d["municipios"] = [c for _, cs in districts for c in cs if c]
    d["nacional"] = "not-national-scope" not in s
    codes = sorted(set(re.findall(r"AIADOC/((?:DA|AIA)\d+)", s)))
    d["codigo_siaia"] = codes[0] if codes else None
    k = lines.index("Documentos de encerramento") if "Documentos de encerramento" in lines else -1
    d["docs_encerramento"] = k >= 0 and "Não existem documentos disponíveis." not in lines[k + 1:k + 3]
    if d["docs_encerramento"]:
        stop = lines.index("Documentos de acompanhamento") if "Documentos de acompanhamento" in lines else len(lines)
        d["docs_lista"] = [l for l in lines[k + 2:stop] if l not in ("Documento",) and not re.match(r"^[\d.,]+\s*[KMG]b$", l)]
    return d


def date_pt(iso: str) -> str:
    d = dt.date.fromisoformat(iso)
    return f"{d.day:02d} {MONTHS[d.month - 1]} {d.year}"


def facts(records: list[dict], year: int) -> dict:
    rows = [r for r in records if r.get("fim", "") >= f"{year}-01-01" and r.get("tipologia") not in ("Programas", "Estratégias")]
    if not rows:
        return {}
    day = dt.date.fromisoformat
    dur = [(day(r["fim"]) - day(r["inicio"])).days + 1 for r in rows]
    aug_lo, aug_hi = dt.date(year, 8, 1), dt.date(year, 8, 31)
    def aug_days(r):
        a, b = max(day(r["inicio"]), aug_lo), min(day(r["fim"]), aug_hi)
        return max(0, (b - a).days + 1)
    parts = [r["participacoes"] for r in rows if isinstance(r.get("participacoes"), int)]
    return {
        "ano": year,
        "consultas_projetos": len(rows),
        "duracao_mediana_dias": int(statistics.median(dur)),
        "ate_21_dias": sum(1 for x in dur if x <= 21),
        "com_dias_em_agosto": sum(1 for r in rows if aug_days(r) > 0),
        "maioria_em_agosto": sum(1 for r, x in zip(rows, dur) if aug_days(r) * 2 > x),
        "participacoes_mediana": int(statistics.median(parts)) if parts else None,
        "participacoes_abaixo_50": sum(1 for p in parts if p < 50),
        "nota": "Projetos sujeitos a avaliação ambiental; exclui programas e estratégias nacionais. Duração em dias de calendário, incluindo o primeiro e o último dia.",
    }


def main() -> int:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    block = data["consultas_participa"]
    previous = {r["url"]: r for k in ("abertas", "em_analise", "encerradas") for r in block.get(k, [])}

    cards: dict[str, dict] = {}
    for term in TERMS:
        for row in search(term):
            cards.setdefault(row["url"], row)
    relevant = {u: c for u, c in cards.items() if RELEVANT.search(c.get("titulo") or "")}
    if len(relevant) < 20:
        raise SystemExit(f"Pesquisa suspeita: só {len(relevant)} consultas de renováveis. Nada foi alterado.")

    year = TODAY.year
    keep = {u for u, c in relevant.items() if c["estado"] == "Aberta" or (c["estado"] != "Encerrada" and c["fim"] >= f"{year}-01-01")}
    keep |= {u for u, r in previous.items() if r.get("alerta_qualidade")}
    keep.add(PSZAER_URL)

    records = []
    for url in sorted(keep):
        x = detail(url)
        time.sleep(0.4)
        card = relevant.get(url, {})
        rec = dict(previous.get(url, {}))
        period = (x.get("Período de consulta") or "").split(" a ")
        title = rec.get("titulo") or (card.get("titulo") or x.get("Designação completa") or "").replace("–", "—")
        title = re.sub(r"^Consulta Pública\s+", "", title)
        fields = {
            "id": rec.get("id") or "participa-" + url.rstrip("/").split("/")[-1][:60],
            "titulo": title,
            "estado_consulta": x.get("Estado") or card.get("estado"),
            "inicio": period[0] if len(period) == 2 else card.get("inicio"),
            "fim": period[1] if len(period) == 2 else card.get("fim"),
            "tipologia": x.get("Tipologia") or card.get("tipologia"),
            "subtipologia": x.get("Sub-Tipologia"),
            "codigo_siaia": x.get("codigo_siaia") or rec.get("codigo_siaia"),
            "promotor_projeto": x.get("Entidade promotora do projeto"),
            "entidade_consulta": x.get("Entidade promotora da CP") or card.get("entidade"),
            "distritos": x["distritos"], "municipios": x["municipios"],
            "participacoes": x["participacoes"], "utilizadores_a_seguir": x["a_seguir"],
            "url": url, "fonte_id": rec.get("fonte_id", "PARTICIPA"), "observado_em": TODAY.isoformat(),
        }
        rec.update({k: v for k, v in fields.items() if v not in (None, "", [])})
        if x["nacional"] and not x["municipios"] and "ambito" not in rec:
            rec["ambito"] = "Transfronteiriço" if "ESPANHA" in title.upper() else "Nacional"
        if x["docs_encerramento"]:
            rec["documentos_encerramento"] = "; ".join(x.get("docs_lista") or []) or "Disponíveis na ficha da consulta."
        if rec.get("subtipologia") == "Proposta de definição de âmbito" or re.search(r"\bPDA\b", title):
            rec.setdefault("estado_projeto", "PDA; decisão futura apenas sobre o conteúdo do EIA.")
        records.append(rec)

    current = sorted([r for r in records if r.get("fim", "") >= f"{year}-01-01" or r["estado_consulta"] == "Aberta"],
                     key=lambda r: r.get("fim", ""), reverse=True)
    stale = sorted([r for r in records if r not in current], key=lambda r: r.get("fim", ""))
    counts = {s: sum(1 for c in relevant.values() if c["estado"] == s) for s in ("Aberta", "Em análise", "Encerrada")}

    meta = block["metadados"]
    history = meta.setdefault("instantaneos_anteriores", [])
    if meta.get("instantaneo_em") != TODAY.isoformat():
        history.insert(0, {"instantaneo_em": meta.get("instantaneo_em"),
                           "registos": {k: len(block.get(k, [])) for k in ("abertas", "em_analise", "encerradas")},
                           "resumo_pesquisa": meta.get("resumo_pesquisa")})
    del history[12:]
    meta.update({
        "instantaneo_em": TODAY.isoformat(),
        "cobertura": "Pesquisa no portal por " + ", ".join(f"“{t}”" for t in TERMS) + ", filtrada pelo título. Mostram-se as consultas abertas e as do ano corrente, mais registos antigos com alerta de qualidade; não é uma exportação integral.",
        "resumo_pesquisa": {"consultas_renovaveis": len(relevant), "abertas": counts["Aberta"], "em_analise": counts["Em análise"], "encerradas": counts["Encerrada"]},
        "gerado_por": "scripts/participa/atualizar.py",
    })
    block["abertas"] = [r for r in current if r["estado_consulta"] == "Aberta"]
    block["em_analise"] = [r for r in current if r["estado_consulta"] == "Em análise"] + stale
    block["encerradas"] = [r for r in current if r["estado_consulta"] == "Encerrada"]
    block["nota_encerradas"] = f"Em {TODAY.isoformat()} a pesquisa devolveu {counts['Encerrada']} consultas de renováveis encerradas, quase todas de anos anteriores; só se listam as do ano corrente."
    block["factos_participacao"] = facts(current, year)

    ps = next((r for r in records if r["url"] == PSZAER_URL), None)
    if ps:
        data["pszaer"]["consulta_publica"].update({k: v for k, v in {
            "estado_portal": ps["estado_consulta"], "participacoes": ps.get("participacoes"),
            "utilizadores_a_seguir": ps.get("utilizadores_a_seguir"), "documentos_encerramento": ps.get("documentos_encerramento"),
            "observado_em": TODAY.isoformat()}.items() if v is not None})
    for point in data.get("pontos_mapa", []):
        r = next((x for x in records if x["url"] == point.get("url")), None)
        if r:
            point["estado"] = f"{r['estado_consulta']} (consulta {r['inicio']} a {r['fim']})"
    for source in data.get("fontes", []):
        if source.get("id", "").startswith("PARTICIPA"):
            source["consultado_em"] = TODAY.isoformat()
    data["metadados"]["atualizado_em"] = TODAY.isoformat()

    # Propostas editoriais para consultas abertas ainda não conhecidas.
    known = set()
    for f in NEWS_FILES:
        if f.exists():
            known |= {row.get("url") for row in json.loads(f.read_text(encoding="utf-8"))}
    proposals = json.loads(PROPOSALS.read_text(encoding="utf-8")) if PROPOSALS.exists() else []
    new = []
    for r in block["abertas"]:
        if r["url"] in known:
            continue
        where = " · ".join(r.get("municipios") or []) or r.get("ambito") or "Portugal"
        days = (dt.date.fromisoformat(r["fim"]) - TODAY).days
        summary = (f"Está aberta até {date_pt(r['fim'])} a consulta pública «{r['titulo']}» ({where}). "
                   f"Faltam {days} dias para participar. Qualquer pessoa pode ler os documentos e comentar no portal Participa.")
        body = (f"<p>{html.escape(summary)}</p><p><strong>Tipologia:</strong> {html.escape(r.get('tipologia') or '-')}"
                f"{' · ' + html.escape(r['subtipologia']) if r.get('subtipologia') else ''}. "
                f"<strong>Promotor:</strong> {html.escape(r.get('promotor_projeto') or '-')}. "
                f"<strong>Entidade:</strong> {html.escape(r.get('entidade_consulta') or '-')}.</p>"
                f"<p><a href=\"{html.escape(r['url'], quote=True)}\" rel=\"noopener noreferrer\">Abrir a consulta no Participa.pt</a></p>")
        item = {
            "id": r["id"], "categoria": "Energia", "categoria_id": "energia", "categorias": ["energia", "territorio"],
            "ambito": "portugal", "paises": ["PT"], "prioridade": 80, "relevancia": 80, "estado": "proposta",
            "tipo_conteudo": "consulta_publica", "data": date_pt(r["inicio"]),
            "publicado_em": f"{r['inicio']}T00:00:00Z", "capturado_em": dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z"),
            "expira_em": r["fim"], "permanente": False, "imagem": "/images/renovaveis-territorio.webp",
            "imagem_credito_pt": "Ilustração editorial bioCulture", "imagem_credito_en": "bioCulture editorial illustration",
            "fonte": "Participa.pt", "tipo_fonte": "oficial", "logo": "", "url": r["url"],
            "pagina": "/energia/transicao-etica.html#consultas", "tags": ["consulta-publica", "renovaveis", "participacao"],
            "relevancia_detalhe": {"pontuacao": 80, "razoes": ["consulta pública oficial aberta", f"prazo: {date_pt(r['fim'])}"], "revisao_humana": True},
            "pt": {"titulo": f"Consulta pública aberta até {date_pt(r['fim'])}: {r['titulo']}", "resumo_biocultura": summary, "corpo": body},
        }
        proposals.append(item)
        new.append(item["id"])

    f = block["factos_participacao"]
    print(f"Renováveis no portal: {len(relevant)} ({counts}); listadas: {len(current)} + {len(stale)} antigas; propostas novas: {len(new)}")
    if f:
        print(f"Factos {year}: {f['consultas_projetos']} projetos, {f['ate_21_dias']} com ≤21 dias, {f['com_dias_em_agosto']} em agosto, mediana {f['participacoes_mediana']} participações")
    if DRY:
        return 0
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if new:
        PROPOSALS.write_text(json.dumps(proposals, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    Path(ROOT / ".participa-novas.txt").write_text("\n".join(new), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

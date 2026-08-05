#!/usr/bin/env python3
"""Cria propostas de notícias para revisão num Pull Request.

O programa lê apenas RSS/Atom configurados, não copia artigos completos e não
publica diretamente. A entrada só chega ao site quando o Pull Request é revisto
e integrado no ramo principal.
"""

from __future__ import annotations

import argparse
import datetime as dt
import email.utils
import hashlib
import html
import json
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from difflib import SequenceMatcher

ROOT = Path(__file__).resolve().parents[2]
NEWS_PATH = ROOT / "data" / "noticias.json"
CONFIG_PATH = ROOT / "config" / "noticias_fontes.json"

CATEGORIES = {
    "agua": ("Água", ["agua", "water", "seca", "drought", "cheia", "flood", "oceano", "rio", "barragem"]),
    "solo": ("Solo", ["solo", "soil", "erosao", "desertificacao", "compost", "agricultura", "pesticida"]),
    "biodiversidade": ("Biodiversidade", ["biodivers", "species", "especie", "habitat", "floresta", "forest", "invasora", "polinizador"]),
    "ar": ("Ar", ["qualidade do ar", "air quality", "poluicao", "pollution", "emissoes", "emissions", "incendio", "wildfire"]),
    "energia": ("Energia", ["energia", "energy", "renovavel", "renewable", "solar", "eolica", "wind power"]),
    "mineracao": ("Mineração", ["mineracao", "mining", "litio", "lithium", "mina ", "extracao mineral"]),
    "impacto-digital": ("Impacto Digital & IA", ["inteligencia artificial", "artificial intelligence", "data center", "centro de dados", "digitalizacao"]),
    "pecuaria": ("Pecuária", ["pecuaria", "livestock", "suinicultura", "aviario", "gado", "metano"]),
    "enologia": ("Enologia", ["vinha", "vinho", "viticultura", "vineyard", "wine"]),
}

IMPACT = ["recorde", "emergencia", "risco", "crise", "proibicao", "lei", "relatorio", "estudo", "milhoes", "extincao", "contaminacao"]
PORTUGAL = ["portugal", "portugues", "acores", "madeira", "algarve", "alentejo", "lisboa", "porto"]
MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]


def plain(value: str) -> str:
    value = re.sub(r"<[^>]*>", " ", html.unescape(value or ""))
    return re.sub(r"\s+", " ", value).strip()


def folded(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(c for c in normalized if not unicodedata.combining(c)).lower()


def child_text(node: ET.Element, names: tuple[str, ...]) -> str:
    for child in list(node):
        tag = child.tag.rsplit("}", 1)[-1].lower()
        if tag in names and child.text:
            return child.text.strip()
    return ""


def item_link(node: ET.Element) -> str:
    direct = child_text(node, ("link",))
    if direct.startswith("http"):
        return direct
    for child in list(node):
        if child.tag.rsplit("}", 1)[-1].lower() == "link":
            href = child.attrib.get("href", "")
            if href.startswith("http"):
                return href
    return direct


def parse_date(value: str) -> dt.datetime:
    try:
        parsed = email.utils.parsedate_to_datetime(value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=dt.timezone.utc)
        return parsed.astimezone(dt.timezone.utc)
    except (TypeError, ValueError, OverflowError):
        try:
            return dt.datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(dt.timezone.utc)
        except (TypeError, ValueError):
            return dt.datetime.now(dt.timezone.utc)


def fetch_feed(url: str) -> list[dict]:
    request = urllib.request.Request(url, headers={"User-Agent": "bioCultura-news/1.0 (+https://biocultura.net)"})
    with urllib.request.urlopen(request, timeout=25) as response:
        payload = response.read(2_000_000)
    root = ET.fromstring(payload)
    nodes = [n for n in root.iter() if n.tag.rsplit("}", 1)[-1].lower() in ("item", "entry")]
    result = []
    for node in nodes:
        title = plain(child_text(node, ("title",)))
        link = item_link(node)
        summary = plain(child_text(node, ("description", "summary", "content")))
        published = child_text(node, ("pubdate", "published", "updated", "date"))
        source = plain(child_text(node, ("source",)))
        if title and link:
            result.append({"title": title, "url": link, "summary": summary, "published": parse_date(published), "source": source})
    return result


def classify(text: str) -> tuple[str, str, int]:
    value = folded(text)
    matches = []
    for category_id, (label, words) in CATEGORIES.items():
        count = sum(1 for word in words if folded(word) in value)
        matches.append((count, category_id, label))
    count, category_id, label = max(matches)
    return category_id, label, count


def canonical_url(url: str) -> str:
    parsed = urllib.parse.urlsplit(url)
    query = urllib.parse.parse_qsl(parsed.query, keep_blank_values=False)
    query = [(k, v) for k, v in query if not k.lower().startswith("utm_") and k.lower() not in ("fbclid", "gclid")]
    return urllib.parse.urlunsplit((parsed.scheme.lower(), parsed.netloc.lower(), parsed.path.rstrip("/"), urllib.parse.urlencode(query), ""))


def score(item: dict, authority: int, keyword_hits: int, now: dt.datetime) -> tuple[int, list[str]]:
    text = folded(item["title"] + " " + item["summary"])
    points = authority
    reasons = [f"fonte autorizada: {authority}/25"]
    topic = min(25, 9 + keyword_hits * 5)
    points += topic
    reasons.append(f"relação temática: {topic}/25")
    geo = 15 if any(word in text for word in PORTUGAL) else 7
    points += geo
    reasons.append(f"relevância geográfica: {geo}/15")
    impact = min(15, 5 + 3 * sum(1 for word in IMPACT if word in text))
    points += impact
    reasons.append(f"impacto potencial: {impact}/15")
    age = max(0, (now - item["published"]).days)
    freshness = 10 if age <= 3 else 7 if age <= 14 else 3 if age <= 45 else 0
    points += freshness
    reasons.append(f"atualidade: {freshness}/10")
    # Os 10 pontos de confirmação independente nunca são atribuídos sem uma segunda fonte.
    reasons.append("confirmação independente: 0/10 — verificar na revisão")
    return min(points, 90), reasons


def slug(title: str, published: dt.datetime, url: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", folded(title)).strip("-")[:52]
    digest = hashlib.sha256(canonical_url(url).encode()).hexdigest()[:8]
    return f"{published:%Y%m%d}-{base}-{digest}"


def is_duplicate(item: dict, existing: list[dict]) -> bool:
    url = canonical_url(item["url"])
    title = folded(item["title"])
    for news in existing:
        if canonical_url(news.get("url", "")) == url:
            return True
        old_title = folded((news.get("pt") or {}).get("titulo", news.get("titulo", "")))
        if old_title and SequenceMatcher(None, title, old_title).ratio() >= 0.88:
            return True
    return False


def make_news(item: dict, source_cfg: dict, category_id: str, label: str, points: int, reasons: list[str]) -> dict:
    published = item["published"]
    captured = dt.datetime.now(dt.timezone.utc)
    source = item["source"] or source_cfg["nome"]
    summary = item["summary"][:480].rstrip(" .")
    if not summary or folded(summary) == folded(item["title"]):
        summary = f"A fonte {source} publicou esta atualização. O conteúdo integral e os dados que a sustentam devem ser confirmados na ligação original antes da aprovação."
    body = f"<p>{html.escape(summary)}</p><p><strong>Fonte original:</strong> <a href=\"{html.escape(item['url'], quote=True)}\" rel=\"noopener noreferrer\">{html.escape(source)}</a>.</p>"
    retention = 365 if points >= 85 else 180 if points >= 75 else 60
    return {
        "id": slug(item["title"], published, item["url"]),
        "categoria": label,
        "categoria_id": category_id,
        "relevancia": points,
        "estado": "publicada",
        "data": f"{published.day:02d} {MONTHS[published.month - 1]} {published.year}",
        "publicado_em": published.isoformat().replace("+00:00", "Z"),
        "capturado_em": captured.isoformat().replace("+00:00", "Z"),
        "expira_em": (published.date() + dt.timedelta(days=retention)).isoformat(),
        "permanente": False,
        "imagem": f"/images/{'digital_ia' if category_id == 'impacto-digital' else 'calendario' if category_id == 'enologia' else category_id}.jpg",
        "fonte": source,
        "tipo_fonte": source_cfg.get("tipo", "desconhecida"),
        "logo": "",
        "url": canonical_url(item["url"]),
        "tags": [category_id],
        "relevancia_detalhe": {"pontuacao": points, "razoes": reasons, "revisao_humana": True},
        "pt": {"titulo": item["title"], "resumo_biocultura": summary, "corpo": body},
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--config", type=Path, default=CONFIG_PATH)
    args = parser.parse_args()
    config = json.loads(args.config.read_text(encoding="utf-8"))
    news = json.loads(NEWS_PATH.read_text(encoding="utf-8"))
    now = dt.datetime.now(dt.timezone.utc)
    proposals = []
    failures = []
    for source in config["fontes"]:
        if not source.get("ativa", True):
            continue
        try:
            items = fetch_feed(source["url"])
        except Exception as exc:  # Uma fonte indisponível não bloqueia as restantes.
            failures.append(f"{source['id']}: {exc}")
            continue
        for item in items:
            age = (now - item["published"]).days
            if age < -1 or age > 45 or is_duplicate(item, news + proposals):
                continue
            category_id, label, hits = classify(item["title"] + " " + item["summary"])
            if hits == 0:
                continue
            points, reasons = score(item, int(source.get("autoridade", 15)), hits, now)
            if points < int(config["pontuacao_minima"]):
                continue
            proposals.append(make_news(item, source, category_id, label, points, reasons))
    proposals.sort(key=lambda n: (n["relevancia"], n["publicado_em"]), reverse=True)
    proposals = proposals[: int(config["limite_por_execucao"])]
    if failures:
        print("Fontes temporariamente indisponíveis:", *failures, sep="\n- ", file=sys.stderr)
    if not proposals:
        print("Nenhuma proposta nova cumpre os critérios.")
        return 0
    print(f"{len(proposals)} proposta(s) preparada(s) para revisão:")
    for item in proposals:
        print(f"- [{item['relevancia']}] {item['pt']['titulo']}")
    if not args.dry_run:
        NEWS_PATH.write_text(json.dumps(proposals + news, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

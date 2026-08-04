#!/usr/bin/env python3
"""Exporta pragas da Koppert Portugal para o formato JSON do projeto.

O programa não tenta completar informação que não esteja presente na página. Os
campos sem dados são guardados como listas/strings vazias e assinalados no
relatório de erros, para poderem ser revistos posteriormente.
"""

from __future__ import annotations

import argparse
import html
import json
import logging
import re
import sys
import time
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup, Tag
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


DEFAULT_INDEX_URL = "https://www.koppert.pt/pragas-de-plantas/"
SCIENTIFIC_RE = re.compile(
    r"\b([A-Z][a-z-]+ [a-z-]+(?:\s+(?:spp?|var\.)\.?)?)\b"
)
PARENTHESISED_SCIENTIFIC_RE = re.compile(r"\(\s*" + SCIENTIFIC_RE.pattern[2:])
NON_SCIENTIFIC_FIRST_WORDS = {"saiba", "descubra", "solucoes", "soluções", "mais"}


@dataclass(frozen=True)
class SpeciesLink:
    url: str
    category: str
    category_label: str


def normalise(value: str) -> str:
    """Normaliza uma chave para deduplicação, ignorando acentos e maiúsculas."""
    value = unicodedata.normalize("NFKD", value or "")
    return "".join(c for c in value if not unicodedata.combining(c)).casefold().strip()


def clean(value: str | None) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def absolute(url: str, base: str) -> str:
    return urljoin(base, url).split("#", 1)[0]


def category_label(slug: str) -> str:
    return slug.replace("-", " ").strip().capitalize()


def make_session() -> requests.Session:
    session = requests.Session()
    retries = Retry(
        total=3,
        backoff_factor=1,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset({"GET"}),
    )
    session.mount("https://", HTTPAdapter(max_retries=retries))
    session.headers.update(
        {
            "User-Agent": (
                "koppert-json-export/1.0 (+contacte o responsavel do projeto)"
            ),
            "Accept-Language": "pt-PT,pt;q=0.9",
        }
    )
    return session


def get_html(session: requests.Session, url: str, timeout: int) -> str:
    response = session.get(url, timeout=timeout)
    response.raise_for_status()
    return response.text


def discover_species(index_html: str, index_url: str) -> list[SpeciesLink]:
    """Descobre links de espécie; a regra exige categoria + espécie no URL."""
    soup = BeautifulSoup(index_html, "html.parser")
    found: dict[str, SpeciesLink] = {}
    categories: dict[str, str] = {}
    for anchor in soup.select("a[href]"):
        url = absolute(str(anchor["href"]), index_url)
        parsed = urlparse(url)
        if parsed.netloc != urlparse(index_url).netloc:
            continue
        parts = [part for part in parsed.path.split("/") if part]
        # /pragas-de-plantas/<categoria>/ (rótulo de categoria)
        if len(parts) == 2 and parts[0] == "pragas-de-plantas":
            card = anchor.find_parent(class_=re.compile(r"category|species|pest", re.I))
            heading = card.find(["h2", "h3", "h4"]) if card else None
            label = clean(heading.get_text(" ", strip=True) if heading else anchor.get_text(" ", strip=True))
            label = re.sub(r"^Mais informações sobre\s+", "", label, flags=re.I)
            if label:
                categories[parts[1]] = label
            continue
        # /pragas-de-plantas/<categoria>/<especie>/
        if len(parts) != 3 or parts[0] != "pragas-de-plantas":
            continue
        if parts[1] == parts[2]:
            continue
        category = parts[1]
        found.setdefault(
            url.rstrip("/") + "/",
            SpeciesLink(url.rstrip("/") + "/", category, categories.get(category, category_label(category))),
        )
    return sorted(found.values(), key=lambda item: item.url)


def breadcrumb_name(soup: BeautifulSoup) -> str:
    breadcrumbs = soup.select(".hero__breadcrumbs-link")
    if breadcrumbs:
        return clean(breadcrumbs[-1].get_text(" ", strip=True))
    title = soup.find("meta", property="og:title")
    return clean(title.get("content") if title else "")


def first_scientific_name(soup: BeautifulSoup) -> str:
    """Procura primeiro nos elementos editoriais em itálico e depois no texto."""
    for element in soup.select("main em, main i, .textmedia em, .textmedia i"):
        match = SCIENTIFIC_RE.search(clean(element.get_text(" ", strip=True)))
        if match and normalise(match.group(1).split()[0]) not in NON_SCIENTIFIC_FIRST_WORDS:
            return match.group(1).replace(" ", " ")

    # A descrição e o alt da imagem são as melhores alternativas no HTML atual.
    candidates: list[str] = []
    for meta in soup.select('meta[name="description"], meta[property="og:description"]'):
        candidates.append(str(meta.get("content", "")))
    candidates.extend(str(image.get("alt", "")) for image in soup.select("img[alt]"))
    for candidate in candidates:
        # A Koppert escreve frequentemente o nome científico entre parênteses
        # na meta description; esta forma tem prioridade sobre frases normais.
        match = PARENTHESISED_SCIENTIFIC_RE.search(candidate)
        if match:
            return match.group(1)
    for candidate in candidates:
        matches = SCIENTIFIC_RE.finditer(candidate)
        match = next(
            (item for item in matches if normalise(item.group(1).split()[0]) not in NON_SCIENTIFIC_FIRST_WORDS),
            None,
        )
        if match:
            return match.group(1)
    return ""


def image_url(soup: BeautifulSoup, page_url: str) -> str:
    meta = soup.find("meta", property="og:image")
    if meta and meta.get("content"):
        return absolute(str(meta["content"]), page_url)
    image = soup.select_one(".textmedia__image[src]")
    return absolute(str(image["src"]), page_url) if image else ""


def product_data(soup: BeautifulSoup) -> list[dict[str, Any]]:
    """Lê o JSON que a Koppert entrega ao componente de soluções biológicas."""
    component = soup.find("products-overview")
    if not component:
        return []
    raw = component.get(":product-data") or component.get("v-bind:product-data")
    if not raw:
        return []
    try:
        payload = json.loads(html.unescape(str(raw)))
        return payload.get("products", []) if isinstance(payload, dict) else []
    except json.JSONDecodeError:
        return []


def product_label(product: dict[str, Any]) -> str:
    name = clean(str(product.get("title", "")))
    latin = clean(str(product.get("latinTitle", "")))
    if latin and latin.casefold() not in {"x", "n/a"}:
        return f"{latin} ({name})" if name else latin
    return name


def product_categories(soup: BeautifulSoup) -> list[str]:
    component = soup.find("products-overview")
    if not component:
        return []
    raw = component.get(":product-data") or component.get("v-bind:product-data")
    if not raw:
        return []
    try:
        payload = json.loads(html.unescape(str(raw)))
        return [clean(item.get("title", "")) for item in payload.get("productCategories", [])]
    except (json.JSONDecodeError, AttributeError):
        return []


def text_by_heading(soup: BeautifulSoup, words: Iterable[str]) -> str:
    """Obtém texto da secção cujo título contém uma das palavras indicadas."""
    wanted = tuple(normalise(word) for word in words)
    for heading in soup.select("h2, h3"):
        if any(word in normalise(heading.get_text(" ", strip=True)) for word in wanted):
            section = heading.find_parent("section")
            if section:
                return clean(section.get_text(" ", strip=True))
    return ""


def parse_species(html_text: str, link: SpeciesLink) -> tuple[dict[str, Any], list[str]]:
    soup = BeautifulSoup(html_text, "html.parser")
    common = breadcrumb_name(soup)
    scientific = first_scientific_name(soup)
    products = product_data(soup)
    agents = list(dict.fromkeys(filter(None, (product_label(p) for p in products))))
    categories = product_categories(soup)
    monitoring = [label for label in agents if any("monitor" in normalise(x) for x in categories)]
    prevention_text = text_by_heading(soup, ("prevenção", "prevençao", "prevenir"))
    combat_text = text_by_heading(soup, ("controlo", "controle"))

    method = ""
    if agents:
        method = "Soluções biológicas listadas pela Koppert: " + "; ".join(agents) + "."
    strategy = ""
    if monitoring:
        strategy = "Monitorização com: " + "; ".join(monitoring) + "."

    record = {
        "nome_comum": common,
        "nome_cientifico": scientific,
        "tipo": f"Praga ({link.category_label})",
        "fonte": link.url,
        "solucao_biologica": {"agentes": agents, "metodo": method},
        "prevencao_biologica": {
            "estrategia": strategy,
            "quando_aplicar": "",
            "como": prevention_text,
        },
        "imagem": image_url(soup, link.url),
        "prevencao": prevention_text,
        "combate": combat_text or method,
    }
    warnings: list[str] = []
    if not common:
        warnings.append("nome_comum não encontrado")
    if not scientific:
        warnings.append("nome_cientifico não encontrado")
    if not agents:
        warnings.append("soluções/agentes biológicos não encontrados")
    if not record["imagem"]:
        warnings.append("imagem não encontrada")
    return record, warnings


def load_existing(path: Path | None) -> list[dict[str, Any]]:
    if path is None or not path.exists():
        return []
    with path.open(encoding="utf-8") as file:
        data = json.load(file)
    if not isinstance(data, list):
        raise ValueError(f"{path} tem de conter uma lista JSON.")
    if not all(isinstance(item, dict) for item in data):
        raise ValueError(f"{path} contém entradas que não são objetos JSON.")
    return data


def record_key(record: dict[str, Any]) -> str:
    scientific = normalise(str(record.get("nome_cientifico", "")))
    common = normalise(str(record.get("nome_comum", "")))
    return f"scientific:{scientific}" if scientific else f"common:{common}"


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, indent=2)
        file.write("\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--index-url", default=DEFAULT_INDEX_URL, help="URL de índice da Koppert")
    parser.add_argument("--existing", type=Path, help="JSON existente a preservar e usar para deduplicação")
    parser.add_argument("--output", type=Path, default=Path("pragas_koppert.json"), help="JSON final")
    parser.add_argument("--errors", type=Path, default=Path("nao_processadas_koppert.json"), help="Relatório JSON")
    parser.add_argument("--delay", type=float, default=0.6, help="Pausa entre páginas, em segundos")
    parser.add_argument("--timeout", type=int, default=30, help="Tempo máximo por pedido HTTP")
    parser.add_argument("--limit", type=int, help="Limita espécies; útil para teste")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING, format="%(levelname)s: %(message)s")

    try:
        existing = load_existing(args.existing)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"Erro ao ler JSON existente: {exc}", file=sys.stderr)
        return 2

    session = make_session()
    try:
        links = discover_species(get_html(session, args.index_url, args.timeout), args.index_url)
    except requests.RequestException as exc:
        print(f"Não foi possível descarregar o índice: {exc}", file=sys.stderr)
        return 1
    if args.limit:
        links = links[: args.limit]
    if not links:
        print("Não foram encontrados links de espécies; a estrutura do site pode ter mudado.", file=sys.stderr)
        return 1

    result = list(existing)
    known = {record_key(item) for item in existing if record_key(item) not in {"scientific:", "common:"}}
    report: dict[str, Any] = {"fonte_indice": args.index_url, "descobertas": len(links), "adicionadas": 0, "duplicadas": [], "erros": [], "avisos": []}

    for position, link in enumerate(links, start=1):
        logging.info("[%s/%s] %s", position, len(links), link.url)
        try:
            record, warnings = parse_species(get_html(session, link.url, args.timeout), link)
            key = record_key(record)
            if key in {"scientific:", "common:"}:
                report["erros"].append({"url": link.url, "erro": "Não foi possível identificar a espécie."})
            elif key in known:
                report["duplicadas"].append({"url": link.url, "chave": key})
            else:
                result.append(record)
                known.add(key)
                report["adicionadas"] += 1
                if warnings:
                    report["avisos"].append({"url": link.url, "avisos": warnings})
        except (requests.RequestException, ValueError, json.JSONDecodeError) as exc:
            report["erros"].append({"url": link.url, "erro": str(exc)})
        if position < len(links) and args.delay > 0:
            time.sleep(args.delay)

    write_json(args.output, result)
    write_json(args.errors, report)
    print(f"Concluído: {report['adicionadas']} adicionadas, {len(report['duplicadas'])} duplicadas, {len(report['erros'])} erros.")
    print(f"JSON final: {args.output}")
    print(f"Relatório: {args.errors}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

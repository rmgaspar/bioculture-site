#!/usr/bin/env python3
"""Exporta as fichas de flora invasora do Invasoras.pt para o schema do projeto."""

from __future__ import annotations

import argparse
import json
import logging
import re
import sys
import time
import unicodedata
from pathlib import Path
from typing import Any
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup, Tag
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


# Uma ficha da fonte contém no menu HTML links para todas as espécies publicadas.
DEFAULT_CATALOG_URL = "https://invasoras.pt/pt/planta-invasora/azolla-filiculoides"
LATIN_RE = re.compile(r"\b([A-Z][a-z-]+(?:\s+[x×])?\s+[a-z-]+(?:\s+(?:subsp\.|var\.)\s+[a-z-]+)?)\b")


def clean(value: str | None) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def normalise(value: str) -> str:
    value = unicodedata.normalize("NFKD", value or "")
    return "".join(char for char in value if not unicodedata.combining(char)).casefold().strip()


def make_session() -> requests.Session:
    session = requests.Session()
    retry = Retry(total=3, backoff_factor=1, status_forcelist=(429, 500, 502, 503, 504), allowed_methods=frozenset({"GET"}))
    session.mount("https://", HTTPAdapter(max_retries=retry))
    session.headers.update({"User-Agent": "flora-invasora-json-export/1.0", "Accept-Language": "pt-PT,pt;q=0.9"})
    return session


def download(session: requests.Session, url: str, timeout: int) -> str:
    response = session.get(url, timeout=timeout)
    response.raise_for_status()
    return response.text


def discover_species(catalog_html: str, catalog_url: str) -> list[str]:
    """Extrai URLs das fichas, excluindo menus e páginas sem a rota de espécie."""
    soup = BeautifulSoup(catalog_html, "html.parser")
    root = urlparse(catalog_url)
    urls: set[str] = set()
    for link in soup.select('a[href*="/pt/planta-invasora/"]'):
        url = urljoin(catalog_url, str(link["href"])).split("#", 1)[0]
        parsed = urlparse(url)
        if parsed.netloc == root.netloc and re.fullmatch(r"/pt/planta-invasora/[^/]+/?", parsed.path):
            urls.add(url.rstrip("/"))
    return sorted(urls)


def text_after_label(soup: BeautifulSoup, label: str) -> tuple[str, Tag | None]:
    """Lê o conteúdo do parágrafo `Nome científico: ...`, por exemplo."""
    target = normalise(label)
    for strong in soup.find_all("strong"):
        if normalise(strong.get_text(" ", strip=True)).rstrip(":") != target.rstrip(":"):
            continue
        paragraph = strong.find_parent("p")
        if not paragraph:
            continue
        text = clean(paragraph.get_text(" ", strip=True))
        text = re.sub(r"^" + re.escape(clean(strong.get_text(" ", strip=True))) + r"\s*:\s*", "", text, flags=re.I)
        return text, paragraph
    return "", None


def paragraphs_after_heading(container: Tag, heading: str) -> list[str]:
    """Obtém parágrafos após um título a negrito até ao próximo título."""
    start: Tag | None = None
    for strong in container.find_all("strong"):
        if normalise(strong.get_text(" ", strip=True)).rstrip(":") == normalise(heading).rstrip(":"):
            start = strong.find_parent("p")
            break
    if not start:
        return []
    items: list[str] = []
    for sibling in start.find_next_siblings("p"):
        next_strong = sibling.find("strong")
        if next_strong:
            break
        text = clean(sibling.get_text(" ", strip=True))
        if text:
            items.append(text)
    return items


def agents_from_biological_text(container: Tag, biological: list[str]) -> list[str]:
    names: list[str] = []
    # Nomes em itálico são a forma mais fiável usada nas fichas da fonte.
    for paragraph in container.find_all("p"):
        if clean(paragraph.get_text(" ", strip=True)) not in biological:
            continue
        names.extend(clean(item.get_text(" ", strip=True)) for item in paragraph.find_all(["em", "i"]))
    if not names:
        names.extend(match.group(1) for match in LATIN_RE.finditer(" ".join(biological)))
    ignored_genera = {"visite", "controlar", "como"}
    return list(
        dict.fromkeys(
            name for name in names
            if LATIN_RE.fullmatch(name) and normalise(name.split()[0]) not in ignored_genera
        )
    )


def first_image(soup: BeautifulSoup, page_url: str) -> str:
    content = soup.select_one(".field-name-pp-body")
    image = content.select_one("img[src]") if content else None
    return urljoin(page_url, str(image["src"])) if image else ""


def parse_species(html: str, url: str) -> tuple[dict[str, Any], list[str]]:
    soup = BeautifulSoup(html, "html.parser")
    scientific_text, scientific_paragraph = text_after_label(soup, "Nome científico")
    scientific = ""
    if scientific_paragraph:
        italic = scientific_paragraph.find(["em", "i"])
        scientific = clean(italic.get_text(" ", strip=True)) if italic else ""
    if not scientific:
        match = LATIN_RE.search(scientific_text)
        scientific = match.group(1) if match else ""
    common, _ = text_after_label(soup, "Nome vulgar")
    family, _ = text_after_label(soup, "Família")
    family = family.rstrip(" .")
    status, _ = text_after_label(soup, "Estatuto em Portugal")
    control = soup.select_one('[id$="--controlo"]')
    control = control if isinstance(control, Tag) else soup
    prevention = paragraphs_after_heading(control, "Medidas preventivas")
    biological = paragraphs_after_heading(control, "Controlo biológico")
    # Algumas fichas têm o título, mas sem texto de controlo biológico: a frase
    # de ligação final não é uma solução e não deve gerar falsos agentes.
    if all(normalise(item).startswith("visite a pagina como controlar") for item in biological):
        biological = []
    physical = paragraphs_after_heading(control, "Controlo físico")
    chemical = paragraphs_after_heading(control, "Controlo químico")
    agents = agents_from_biological_text(control, biological)
    prevention_text = " ".join(prevention)
    biological_text = " ".join(biological)
    combat_parts: list[str] = []
    if physical:
        combat_parts.append("Controlo físico: " + " ".join(physical))
    if chemical:
        combat_parts.append("Controlo químico: " + " ".join(chemical))
    if biological_text:
        combat_parts.append("Controlo biológico: " + biological_text)
    record = {
        "nome_comum": common,
        "nome_cientifico": scientific,
        "tipo": f"Flora invasora{f' ({family})' if family else ''}",
        "fonte": url,
        "solucao_biologica": {"agentes": agents, "metodo": biological_text},
        "prevencao_biologica": {"estrategia": prevention_text, "quando_aplicar": "", "como": prevention_text},
        "imagem": first_image(soup, url),
        "prevencao": prevention_text,
        "combate": "\n\n".join(combat_parts),
    }
    warnings = []
    for field in ("nome_comum", "nome_cientifico", "imagem"):
        if not record[field]:
            warnings.append(f"{field} não encontrado")
    if not biological_text:
        warnings.append("secção de controlo biológico não encontrada")
    if not prevention_text:
        warnings.append("secção de medidas preventivas não encontrada")
    if not status:
        warnings.append("estatuto em Portugal não encontrado")
    return record, warnings


def load_json(path: Path | None) -> list[dict[str, Any]]:
    if path is None or not path.exists():
        return []
    with path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    if not isinstance(data, list) or not all(isinstance(item, dict) for item in data):
        raise ValueError(f"{path} deve conter uma lista de objetos JSON.")
    return data


def key(record: dict[str, Any]) -> str:
    scientific = normalise(str(record.get("nome_cientifico", "")))
    common = normalise(str(record.get("nome_comum", "")))
    return "scientific:" + scientific if scientific else "common:" + common


def save(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write("\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog-url", default=DEFAULT_CATALOG_URL)
    parser.add_argument("--existing", type=Path, help="JSON existente a preservar e usar para deduplicação")
    parser.add_argument("--output", type=Path, default=Path("flora_invasora.json"))
    parser.add_argument("--errors", type=Path, default=Path("nao_processadas_flora_invasora.json"))
    parser.add_argument("--limit", type=int, help="Processa apenas N fichas (teste)")
    parser.add_argument("--delay", type=float, default=0.7)
    parser.add_argument("--timeout", type=int, default=30)
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO if args.verbose else logging.WARNING, format="%(levelname)s: %(message)s")
    try:
        records = load_json(args.existing)
    except (OSError, ValueError, json.JSONDecodeError) as exc:
        print(f"Erro ao ler JSON existente: {exc}", file=sys.stderr)
        return 2
    session = make_session()
    try:
        urls = discover_species(download(session, args.catalog_url, args.timeout), args.catalog_url)
    except requests.RequestException as exc:
        print(f"Não foi possível descarregar o catálogo: {exc}", file=sys.stderr)
        return 1
    if args.limit:
        urls = urls[: args.limit]
    if not urls:
        print("Não foram encontradas fichas de espécies; a estrutura da fonte pode ter mudado.", file=sys.stderr)
        return 1
    existing_keys = {key(item) for item in records if key(item) not in {"scientific:", "common:"}}
    report: dict[str, Any] = {"fonte_catalogo": args.catalog_url, "descobertas": len(urls), "adicionadas": 0, "duplicadas": [], "erros": [], "avisos": []}
    for number, url in enumerate(urls, 1):
        logging.info("[%s/%s] %s", number, len(urls), url)
        try:
            record, warnings = parse_species(download(session, url, args.timeout), url)
            record_key = key(record)
            if record_key in {"scientific:", "common:"}:
                report["erros"].append({"url": url, "erro": "Não foi possível identificar a espécie."})
            elif record_key in existing_keys:
                report["duplicadas"].append({"url": url, "chave": record_key})
            else:
                records.append(record)
                existing_keys.add(record_key)
                report["adicionadas"] += 1
                if warnings:
                    report["avisos"].append({"url": url, "avisos": warnings})
        except (requests.RequestException, ValueError) as exc:
            report["erros"].append({"url": url, "erro": str(exc)})
        if number < len(urls) and args.delay > 0:
            time.sleep(args.delay)
    save(args.output, records)
    save(args.errors, report)
    print(f"Concluído: {report['adicionadas']} adicionadas, {len(report['duplicadas'])} duplicadas, {len(report['erros'])} erros.")
    print(f"JSON final: {args.output}\nRelatório: {args.errors}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

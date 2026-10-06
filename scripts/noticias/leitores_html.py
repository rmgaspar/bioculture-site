#!/usr/bin/env python3
"""Leitores das listagens de notícias de organismos portugueses sem RSS.

Cada leitor devolve a mesma estrutura que `atualizar.fetch_feed`:
{title, url, summary, published (datetime UTC), source}. São frágeis por natureza
(dependem do HTML de cada site): se o site mudar e o leitor não encontrar nada,
`atualizar.py` regista a fonte como indisponível em vez de inventar resultados.
"""

from __future__ import annotations

import datetime as dt
import html
import re
import urllib.parse
import urllib.request

UA = "Mozilla/5.0 (compatible; bioCultura-news/1.0; +https://www.bioculture.pt)"
TZ_PT = dt.timezone(dt.timedelta(hours=1))  # as datas dos sites não trazem fuso; a hora exata não importa


def get(url: str, limit: int = 1_500_000) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=25) as response:
        return response.read(limit).decode("utf-8", "ignore")


def text(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", value or ""))).strip()


def utc(year: int, month: int, day: int) -> dt.datetime:
    return dt.datetime(year, month, day, 12, 0, tzinfo=TZ_PT).astimezone(dt.timezone.utc)


def ipma_date(value: str) -> dt.datetime | None:
    """A data vem como «Tue Oct 06 08:00:00 UTC 2026» ou, noutras versões da página, «6/10/26»."""
    try:
        return dt.datetime.strptime(value.replace(" UTC", ""), "%a %b %d %H:%M:%S %Y").replace(tzinfo=dt.timezone.utc)
    except ValueError:
        pass
    match = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{2,4})", value)
    if match:
        day, month, year = (int(g) for g in match.groups())
        return utc(year + (2000 if year < 100 else 0), month, day)
    return None


def ipma() -> list[dict]:
    """https://www.ipma.pt/pt/media/noticias/ — título, resumo e data (d/m/aa) por entrada."""
    base = "https://www.ipma.pt/pt/media/noticias/"
    page = re.sub(r"<!--.*?-->", "", get(base), flags=re.S)
    items = []
    for block in re.findall(r"<li class=\"none marbottom5 bdtop-generic\">(.*?)</li>", page, re.S):
        link = re.search(r'<a\s+href="([^"]+news\.detail\.jsp[^"]*)"\s+title="([^"]*)"', block)
        stamp = re.search(r"list_data[^>]*>\s*([^<]+?)\s*<", block)
        published = ipma_date(stamp.group(1)) if stamp else None
        if not (link and published):
            continue
        headline = text(re.search(r"<b>(.*?)</b>", block, re.S).group(1)) if re.search(r"<b>(.*?)</b>", block, re.S) else ""
        subtitle = html.unescape(link.group(2)).strip()
        summary = text(re.search(r"<p class=\"padright10[^>]*>(.*?)<span", block, re.S).group(1)) if re.search(r"<p class=\"padright10[^>]*>(.*?)<span", block, re.S) else ""
        # O título completo junta o tema (a negrito) e a manchete (atributo title).
        title = f"{headline}: {subtitle}" if headline and subtitle and headline.lower() not in subtitle.lower() else (subtitle or headline)
        items.append({
            "title": title, "url": urllib.parse.urljoin(base, html.unescape(link.group(1))),
            "summary": summary.rstrip(" .…"), "published": published, "source": "IPMA",
        })
    return items


def apa() -> list[dict]:
    """https://apambiente.pt/destaques — <time datetime>, título e primeiro parágrafo."""
    base = "https://apambiente.pt/destaques"
    page = get(base)
    items = []
    for block in re.findall(r"<article class=\"marg-b-20\">(.*?)</article>", page, re.S):
        stamp = re.search(r'<time datetime="([^"]+)"', block)
        link = re.search(r'<a href="(/destaque2/[^"]+)"[^>]*>(.*?)</a>', block, re.S)
        if not (stamp and link):
            continue
        summary = text(block.split("</h2>", 1)[-1])
        items.append({
            "title": text(link.group(2)), "url": urllib.parse.urljoin(base, link.group(1)), "summary": summary[:480],
            "published": dt.datetime.fromisoformat(stamp.group(1)).astimezone(dt.timezone.utc), "source": "Agência Portuguesa do Ambiente (APA)",
        })
    return items


def dgeg(limit: int = 12) -> list[dict]:
    """https://www.dgeg.gov.pt/pt/destaques/ — a listagem não tem data: lê-se a de cada página (Data/Hora da Notícia)."""
    base = "https://www.dgeg.gov.pt/pt/destaques/"
    page = get(base)
    seen, items = [], []
    for href in re.findall(r'href="(/pt/destaques/[^"/]+/)"', page):
        if href not in seen:
            seen.append(href)
    for href in seen[:limit]:
        try:
            detail = get(urllib.parse.urljoin(base, href), 400_000)
        except Exception:
            continue
        when = re.search(r"Data/Hora da Not[ií]cia:\s*(\d{2})/(\d{2})/(\d{4})", text(detail))
        if not when:
            continue
        day, month, year = (int(g) for g in when.groups())
        # O primeiro <h1> é "Destaques"; o da notícia é o seguinte.
        titles = [text(t) for t in re.findall(r"<h1[^>]*>(.*?)</h1>", detail.split('id="skip-main"', 1)[-1], re.S)]
        titles = [t for t in titles if t and t.lower() != "destaques"]
        if not titles:
            continue
        paragraphs = [text(p) for p in re.findall(r"<p[^>]*>(.*?)</p>", detail.split('id="skip-main"', 1)[-1], re.S)]
        paragraphs = [p for p in paragraphs if len(p) > 40]
        items.append({
            "title": titles[0], "url": urllib.parse.urljoin(base, href), "summary": (paragraphs[0] if paragraphs else "")[:480],
            "published": utc(year, month, day), "source": "DGEG",
        })
    return items


def dgadr() -> list[dict]:
    """https://www.dgadr.gov.pt/destaques — metadados schema.org (datePublished) em cada artigo."""
    base = "https://www.dgadr.gov.pt/destaques"
    page = get(base)
    items = []
    for block in re.findall(r"<article class=\"jl-article\".*?</article>", page, re.S):
        stamp = re.search(r'property="datePublished" content="([^"]+)"', block)
        link = re.search(r'<a href="(/destaques/[^"]+)"[^>]*>(.*?)</a>', block, re.S)
        if not (stamp and link):
            continue
        paragraph = re.search(r'property="text">\s*<p>(.*?)</p>', block, re.S)
        items.append({
            "title": text(link.group(2)), "url": urllib.parse.urljoin(base, link.group(1)),
            "summary": text(paragraph.group(1))[:480] if paragraph else "",
            "published": dt.datetime.fromisoformat(stamp.group(1)).astimezone(dt.timezone.utc), "source": "DGADR",
        })
    return items


LEITORES = {"ipma": ipma, "apa": apa, "dgeg": dgeg, "dgadr": dgadr}

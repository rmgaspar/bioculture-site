#!/usr/bin/env python3
"""Aplica a cada página os metadados de config/paginas.json.

Título do separador (formato «Título — bioCulture»), descrição, canonical, hreflang (PT/EN via
?lang=en), Open Graph e cartão do X/Twitter com a imagem de images/partilha/. Substitui o que já
existir, por isso pode correr-se sempre que a configuração mudar. Também regista os títulos em
inglês no dicionário do runtime (assets/lang/auto/en.json).
Uso: python3 scripts/seo/aplicar-metadados.py
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BEGIN, END = "<!-- seo:inicio -->", "<!-- seo:fim -->"


def slug(page: str) -> str:
    return page.replace("/", "-").removesuffix(".html")


def block(site: str, page: str, meta: dict) -> str:
    url = f"{site}/" if page == "index.html" else f"{site}/{page}"
    a = lambda v: html.escape(v, quote=True)
    og_title = meta["pt"].removesuffix(" — bioCulture")
    image = f"{site}/images/partilha/{slug(page)}.jpg"
    lines = [
        BEGIN,
        f'<meta name="description" content="{a(meta["desc"])}">',
        f'<link rel="canonical" href="{url}">',
        f'<link rel="alternate" hreflang="pt-PT" href="{url}">',
        f'<link rel="alternate" hreflang="en" href="{url}?lang=en">',
        f'<link rel="alternate" hreflang="x-default" href="{url}">',
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="bioCulture">',
        '<meta property="og:locale" content="pt_PT">',
        '<meta property="og:locale:alternate" content="en_GB">',
        f'<meta property="og:title" content="{a(og_title)}">',
        f'<meta property="og:description" content="{a(meta["desc"])}">',
        f'<meta property="og:url" content="{url}">',
        f'<meta property="og:image" content="{image}">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        f'<meta property="og:image:alt" content="{a(og_title)} — bioCulture">',
        '<meta name="twitter:card" content="summary_large_image">',
        END,
    ]
    return "\n        ".join(lines)


def apply(page: str, meta: dict, site: str) -> None:
    path = ROOT / page
    s = path.read_text()
    # Remove o bloco anterior e metadados soltos equivalentes.
    s = re.sub(re.escape(BEGIN) + r"[\s\S]*?" + re.escape(END) + r"\s*", "", s)
    s = re.sub(r'[ \t]*<meta\s[^>]*name="description"[^>]*>\s*\n?', "", s)
    s = re.sub(r'[ \t]*<meta\s+[^>]*(?:property="og:|name="twitter:)[^>]*>\s*\n?', "", s)
    s = re.sub(r'[ \t]*<link\s+[^>]*rel="(?:canonical|alternate)"[^>]*>\s*\n?', "", s)
    # O charset tem de estar nos primeiros 1024 bytes: passa a ser o primeiro elemento do <head>.
    s = re.sub(r'[ \t]*<meta\s+charset="[^"]*"\s*/?>\s*\n?', "", s)
    s = re.sub(r"(<head[^>]*>)", r'\1<meta charset="utf-8">', s, count=1)
    title = html.escape(meta["pt"], quote=False)
    s, n = re.subn(r"<title>[\s\S]*?</title>", f"<title>{title}</title>\n        {block(site, page, meta)}", s, count=1)
    if not n:
        raise SystemExit(f"{page}: sem <title>")
    path.write_text(s)


def main() -> None:
    config = json.loads((ROOT / "config" / "paginas.json").read_text())
    site = config["site"]
    for page, meta in config["paginas"].items():
        apply(page, meta, site)
    # Títulos em inglês: o runtime traduz o <title> pelo dicionário automático.
    auto = ROOT / "assets" / "lang" / "auto" / "en.json"
    dictionary = json.loads(auto.read_text())
    for meta in config["paginas"].values():
        dictionary[meta["pt"]] = meta["en"]
    auto.write_text(json.dumps(dictionary, ensure_ascii=False, indent=2) + "\n")
    print(f"{len(config['paginas'])} páginas atualizadas")


if __name__ == "__main__":
    main()

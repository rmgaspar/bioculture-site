#!/usr/bin/env python3
"""Cartões de partilha (Open Graph, 1200×630) para cada página de config/paginas.json.

Mesmo desenho dos topos do site: fundo verde-floresta, título em Georgia a branco, subtítulo em
verde-sálvia e a ilustração do topo recortada em círculo à direita. Gera images/partilha/<slug>.jpg.
Uso: python3 scripts/seo/gerar-partilha.py
"""
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "images" / "partilha"
FONTS = Path("/System/Library/Fonts/Supplemental")
W, H = 1200, 630
BG = (24, 52, 38)          # verde dos topos
INK = (255, 255, 255)
SAGE = (169, 195, 168)
CLAY = (214, 160, 128)

# Título e subtítulo do cartão (os mesmos dos topos das páginas).
CARDS = {
    "index.html": ("Ler o planeta.", "Cuidar do lugar."),
    "observatorio/observatorio-terra.html": ("Observatório da Terra.", "Mundo, Portugal e ilhas."),
    "observatorio/producao-agricola.html": ("Produção agrícola.", "O que o mundo cultiva e troca."),
    "observatorio/bioweb.html": ("A teia.", "Clima, vida, invasoras e pesticidas."),
    "observatorio/pressoes-humanas.html": ("Pressões diferentes.", "Efeitos que se cruzam."),
    "observatorio/limitar-ultrapassagem-1-5.html": ("Depois de 1,5 °C.", "Limitar o pico, acelerar a descida."),
    "observatorio/noticia-detalhe.html": ("Atualidade.", "O que muda no território."),
    "observatorio/noticias.html": ("Notícias.", "O que muda, por tema e por lugar."),
    "recursos/vida-e-recursos.html": ("Quatro sistemas.", "Uma só teia de vida."),
    "recursos/agua.html": ("Água.", "O sistema que liga tudo."),
    "recursos/ar.html": ("Ar.", "O vínculo invisível."),
    "recursos/solo.html": ("Solo.", "Onde a vida recomeça."),
    "recursos/douro-apoio-vindimas.html": ("Uva por vindimar.", "O que custa ao solo."),
    "recursos/mongolia-solo-cop17.html": ("Mongólia.", "Restaurar terra, sustentar vidas."),
    "ecossistemas/biodiversidade.html": ("Biodiversidade.", "Uma teia, não uma lista."),
    "ecossistemas/especie-detalhe.html": ("Espécies.", "Quem vive no território."),
    "energia/energia.html": ("Usar melhor.", "Produzir com cuidado."),
    "energia/transicao-etica.html": ("Renováveis.", "Com território."),
    "energia/mineracao.html": ("Mineração.", "O território sob a matéria."),
    "energia/pecuaria.html": ("Pecuária.", "Quando a escala pesa."),
    "energia/digital.html": ("Digital.", "O peso físico da nuvem."),
    "calendario/conhecimento-cuidar.html": ("Observar os ciclos.", "Agir com o lugar."),
    "calendario/calendario.html": ("Calendário de", "Regeneração."),
    "calendario/enologia.html": ("Vinha viva,", "vinho com lugar."),
    "calendario/horticola-detalhe.html": ("Hortícolas.", "Semear no tempo certo."),
    "services/services.html": ("Cuidar começa", "por uma boa escolha."),
    "services/servicos.html": ("Conhecer o lugar.", "Preparar a solução."),
    "services/produtos.html": ("Escolhas para", "um lugar mais vivo."),
    "services/produto-detalhe.html": ("Escolhas para", "um lugar mais vivo."),
    "manifesto.html": ("Não basta medir o mundo.", "É preciso voltar a pertencer-lhe."),
    "contactos.html": ("Este observatório", "também cresce contigo."),
    "privacidade.html": ("Privacidade.", "Sem rastreamento, sem publicidade."),
}


def slug(page: str) -> str:
    return page.replace("/", "-").removesuffix(".html")


def fit(draw, text, path, size, max_w, min_size=34):
    """Reduz o tamanho até o texto caber em no máximo duas linhas."""
    while size >= min_size:
        font = ImageFont.truetype(str(path), size)
        lines, line = [], ""
        for word in text.split():
            trial = f"{line} {word}".strip()
            if draw.textlength(trial, font=font) <= max_w:
                line = trial
            else:
                lines.append(line)
                line = word
        lines.append(line)
        if len(lines) <= 2 and all(draw.textlength(l, font=font) <= max_w for l in lines):
            return font, lines
        size -= 4
    return font, lines


def card(page: str, image: str, title: str, subtitle: str) -> Path:
    canvas = Image.new("RGB", (W, H), BG)
    # Luz suave do lado da ilustração, como nos topos.
    glow = Image.new("L", (W, H), 0)
    ImageDraw.Draw(glow).ellipse((620, -120, 1380, 760), fill=70)
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    canvas.paste(Image.new("RGB", (W, H), (58, 98, 72)), (0, 0), glow)

    # Ilustração em círculo com aro claro.
    src = Image.open(ROOT / image.lstrip("/")).convert("RGB")
    side = min(src.size)
    src = src.crop(((src.width - side) // 2, (src.height - side) // 2, (src.width + side) // 2, (src.height + side) // 2))
    d = 500
    src = src.resize((d, d), Image.LANCZOS)
    mask = Image.new("L", (d * 4, d * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, d * 4 - 1, d * 4 - 1), fill=255)
    mask = mask.resize((d, d), Image.LANCZOS)
    cx, cy = 1200 - 40 - d // 2, H // 2
    ring = 8
    ImageDraw.Draw(canvas).ellipse((cx - d // 2 - ring, cy - d // 2 - ring, cx + d // 2 + ring, cy + d // 2 + ring), fill=(244, 240, 230))
    canvas.paste(src, (cx - d // 2, cy - d // 2), mask)

    draw = ImageDraw.Draw(canvas)
    max_w = 560
    t_font, t_lines = fit(draw, title, FONTS / "Georgia Bold.ttf", 76, max_w)
    s_font, s_lines = fit(draw, subtitle, FONTS / "Georgia.ttf", 60, max_w)
    t_h = t_font.size * 1.08
    s_h = s_font.size * 1.12
    block = len(t_lines) * t_h + 10 + len(s_lines) * s_h
    y = (H - block) / 2 - 20
    for line in t_lines:
        draw.text((70, y), line, font=t_font, fill=INK)
        y += t_h
    y += 10
    for line in s_lines:
        draw.text((70, y), line, font=s_font, fill=SAGE)
        y += s_h

    mark = ImageFont.truetype(str(FONTS / "Georgia.ttf"), 30)
    small = ImageFont.truetype(str(FONTS / "Georgia Bold.ttf"), 14)
    draw.text((70, H - 92), "bioCulture", font=mark, fill=INK)
    draw.text((72, H - 52), "R E G E N E R A Ç Ã O   G L O B A L", font=small, fill=CLAY)

    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / f"{slug(page)}.jpg"
    canvas.save(target, "JPEG", quality=86, optimize=True, progressive=True)
    return target


def main():
    config = json.loads((ROOT / "config" / "paginas.json").read_text())
    for page, meta in config["paginas"].items():
        title, subtitle = CARDS[page]
        target = card(page, meta["img"], title, subtitle)
        print(f"{target.relative_to(ROOT)}  {target.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()

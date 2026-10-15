#!/usr/bin/env python3
"""Foto de contexto para as notícias cuja fonte não tem imagem utilizável.

Regra editorial (ver config/noticias_imagens.json): primeiro a imagem da fonte; se a fonte não tiver ou não a permitir,
uma fotografia da Wikimedia Commons com licença aberta (CC0, CC BY, CC BY-SA ou domínio público), com crédito, ligação à
origem e uma legenda do tema, guardada em media/noticias/ (nunca em /images/, para não levar a marca bioCulture).
Se nada servir (sem rede, sem resultado, sem conversor de imagem), a proposta fica com a ilustração bioCulture e a pessoa
que revê decide em /revisao.

A escolha é automática e só olha para o texto: o tema vem do título, a foto vem da pesquisa da Commons. A legenda diz o
tema («Foto de contexto: painéis solares») e a ligação do crédito leva à ficha da foto; quem revê vê a imagem na proposta.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MEDIA = ROOT / "media" / "noticias"
API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "bioCulture-site/1.0 (https://www.bioculture.pt; geral@bioculture.pt)"}
LARGURA = 960

# (expressão no título, pesquisa na Commons, tema em PT, tema em EN). A primeira que encaixar ganha.
TEMAS = [
    (r"\bhaze\b|smog|air quality|qualidade do ar|particulate|\bpm2", "smog haze city skyline", "neblina e poluição do ar", "haze and air pollution"),
    (r"wildfire|forest fire|incêndio|incendio|bushfire", "wildfire forest smoke", "incêndio florestal", "wildfire"),
    (r"flood|cheia|inunda", "flooded village", "cheia", "flood"),
    (r"drought|seca\b|dry spell", "drought cracked land", "seca", "drought"),
    (r"heat ?wave|onda de calor|extreme heat", "heat wave city sun", "calor extremo", "extreme heat"),
    (r"glacier|glaciar|ice sheet|arctic|antarctic|permafrost", "glacier ice", "gelo e glaciares", "ice and glaciers"),
    (r"sea level|nível do mar|coastal|coast\b|storm surge|hurricane|cyclone|typhoon", "coastal storm waves", "costa e tempestades", "coast and storms"),
    (r"coral|reef|recife", "coral reef", "recife de coral", "coral reef"),
    (r"fisher|fishing|aquaculture|pesca|aquacultura", "fishing boats", "pesca", "fishing"),
    (r"ocean|marine|oceano|seabed|deep.sea", "ocean waves sea", "oceano", "ocean"),
    (r"solar|photovoltaic|fotovolt", "solar panels", "painéis solares", "solar panels"),
    (r"offshore wind|wind (power|farm|turbine|energy)|eólic|eolic", "wind turbines", "energia eólica", "wind power"),
    (r"hydro(electric|power)|\bdam\b|barragem", "hydroelectric dam", "barragem", "dam"),
    (r"nuclear", "nuclear power plant", "central nuclear", "nuclear power plant"),
    (r"\bcoal\b|carvão", "coal power plant", "carvão", "coal"),
    (r"\boil\b|\bgas\b|\blng\b|petról|petrol|fossil", "oil refinery", "combustíveis fósseis", "fossil fuels"),
    (r"battery|batteries|bateria|storage", "battery energy storage", "armazenamento de energia", "energy storage"),
    (r"electric vehicle|\bev\b|veículos elétricos|electric car", "electric car charging", "veículos elétricos", "electric vehicles"),
    (r"\bgrid\b|transmission|electricity|eletricidade|power system", "electricity pylons", "rede elétrica", "power grid"),
    (r"aviation|aircraft|airline|airport|flight|jet fuel|aviação|avião|\bsaf\b", "airplane airport", "aviação", "aviation"),
    (r"shipping|vessel|maritime|ship\b|navio", "container ship", "transporte marítimo", "shipping"),
    (r"data cent|datacent|centros de dados|artificial intelligence|\bai\b", "data center servers", "centros de dados", "data centres"),
    (r"mining|\bmine\b|lithium|mineral|mineração", "open pit mine", "mineração", "mining"),
    (r"plastic|recycl|waste|resíduo|lixo|landfill", "recycling plastic waste", "resíduos", "waste"),
    (r"deforest|rainforest|amazon|desflorest", "rainforest deforestation", "floresta", "forest"),
    (r"forest|floresta|woodland|tree", "forest trees", "floresta", "forest"),
    (r"pollinator|bee\b|bees\b|insect|polinizador|abelha", "bee flower", "polinizadores", "pollinators"),
    (r"biodiversity|species|wildlife|extinction|biodiversidade|espécie", "wildlife nature reserve", "natureza e vida selvagem", "nature and wildlife"),
    (r"livestock|cattle|dairy|pecuária|gado|methane", "cattle pasture", "pecuária", "livestock"),
    (r"irrigation|rega\b|irrigat", "irrigation field", "rega", "irrigation"),
    (r"fertili|nitrogen|manure|azoto|fertiliz", "tractor field spreading", "fertilizantes", "fertilisers"),
    (r"soil|solo\b|erosion|erosão|desertif|carbon farming", "agricultural soil field", "solo agrícola", "agricultural soil"),
    (r"vineyard|wine|vinha|vinho|enolog", "vineyard grapes", "vinha", "vineyard"),
    (r"hunger|food security|famine|segurança alimentar|crop|harvest|farm|agricult|colheita", "farm field crops", "agricultura", "farming"),
    (r"groundwater|aquifer|well\b|aquífero|água subterrânea", "water well", "água subterrânea", "groundwater"),
    (r"drinking water|water quality|wastewater|sanea|água potável", "river water", "água", "water"),
    (r"\bwater\b|\bágua\b|river|lake|rio\b", "river landscape", "água e rios", "water and rivers"),
    (r"urban|city|cities|cidade|housing|building|construction|construção|edifíc", "city buildings urban", "cidade", "city"),
    (r"climate|clima|warming|aquecimento|emission|emissões|carbon|carbono", "climate landscape", "clima", "climate"),
]
# Pesquisa de recurso quando o título não encaixa em nenhum tema (por categoria do observatório).
CATEGORIAS = {
    "clima": ("glacier ice", "clima", "climate"), "agua": ("river landscape", "água e rios", "water and rivers"),
    "oceanos": ("ocean waves sea", "oceano", "ocean"), "solo": ("agricultural soil field", "solo agrícola", "agricultural soil"),
    "biodiversidade": ("wildlife nature reserve", "natureza e vida selvagem", "nature and wildlife"),
    "ar": ("smog haze city skyline", "poluição do ar", "air pollution"), "agricultura": ("farm field crops", "agricultura", "farming"),
    "pecuaria": ("cattle pasture", "pecuária", "livestock"), "energia": ("electricity pylons", "energia", "energy"),
    "mineracao": ("open pit mine", "mineração", "mining"), "impacto-digital": ("data center servers", "centros de dados", "data centres"),
    "enologia": ("vineyard grapes", "vinha", "vineyard"), "territorio": ("rural landscape village", "território", "land"),
    "pressoes": ("rural landscape village", "território", "land"), "saude": ("vegetable market", "alimentação", "food"),
    "conhecimento": ("nature landscape", "natureza", "nature"),
}

LICENCA = re.compile(r"^(CC0|CC BY(-SA)? [0-9]\.[0-9]|Public domain)$", re.I)
EXCLUIR = re.compile(r"map|diagram|chart|graph|logo|flag|poster|portrait|stamp|cartoon|screenshot|sign\b|painting|drawing|"
                     r"illustration|selfie|model\b|concert|\bvs\b|football|\.svg|\.png|\.gif|\.tif", re.I)


def _get(params: dict) -> dict:
    url = API + "?" + urllib.parse.urlencode({"format": "json", **params})
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30) as r:
        return json.load(r)


def tema(titulo: str, categoria_id: str) -> tuple[str, str, str]:
    """(pesquisa, tema PT, tema EN) para o título; recorre à categoria se nenhum tema encaixar."""
    low = titulo.lower()
    for padrao, consulta, pt, en in TEMAS:
        if re.search(padrao, low):
            return consulta, pt, en
    return CATEGORIAS.get(categoria_id, CATEGORIAS["conhecimento"])


def autor(artist_html: str) -> str:
    """Nome curto para o crédito: sem etiquetas, sem «from lugar», sem notas entre parênteses ou chavetas."""
    texto = re.sub(r"<[^>]+>", " ", artist_html or "")
    texto = re.sub(r"&[a-z]+;", " ", texto)
    texto = re.sub(r"\([^)]*\)|\[[^\]]*\]", " ", texto)
    texto = re.sub(r"\bfrom\b.*$", "", texto, flags=re.I)
    texto = re.sub(r"^\s*(user|utilizador|author|by)\s*:\s*", "", texto, flags=re.I)
    return re.sub(r"\s+", " ", texto).strip(" ·|,;:-")[:40]


def licenca(nome: str) -> tuple[str, str]:
    """(PT, EN) da licença no formato dos créditos do site."""
    if re.match(r"public domain", nome, re.I):
        return "domínio público", "public domain"
    return nome, nome


def candidatas(consulta: str, usadas: set[str], limite: int = 40) -> list[dict]:
    dados = _get({"action": "query", "generator": "search", "gsrsearch": consulta + " filetype:bitmap", "gsrnamespace": 6,
                  "gsrlimit": limite, "prop": "imageinfo", "iiprop": "url|size|mime|extmetadata", "iiurlwidth": 1400})
    saida = []
    for pagina in sorted(dados.get("query", {}).get("pages", {}).values(), key=lambda p: p.get("index", 0)):
        info = (pagina.get("imageinfo") or [{}])[0]
        meta = info.get("extmetadata", {})
        nome = (meta.get("LicenseShortName") or {}).get("value", "")
        ficha = info.get("descriptionurl", "")
        descricao = re.sub(r"<[^>]+>", " ", (meta.get("ImageDescription") or {}).get("value", ""))
        quem = autor((meta.get("Artist") or {}).get("value", ""))
        largura, altura = info.get("width", 0), info.get("height", 0)
        if (info.get("mime") != "image/jpeg" or not LICENCA.match(nome) or not quem or ficha in usadas
                or largura < 1400 or not 1.3 <= largura / max(altura, 1) <= 2.0
                or EXCLUIR.search(pagina["title"] + " " + descricao)):
            continue
        saida.append({"ficha": ficha, "miniatura": info.get("thumburl", ""), "autor": quem, "licenca": nome})
    return saida


def fotos_em_uso() -> set[str]:
    """Fichas da Commons já usadas em notícias (publicadas, propostas, arquivadas), para não repetir a mesma foto."""
    usadas = set()
    for ficheiro in ("noticias.json", "noticias_propostas.json", "noticias_arquivo.json", "noticias_rejeitadas.json"):
        caminho = ROOT / "data" / ficheiro
        if caminho.exists():
            usadas |= {n.get("imagem_pagina") for n in json.loads(caminho.read_text(encoding="utf-8")) if n.get("imagem_pagina")}
    return usadas


def converter(origem: Path, destino: Path) -> bool:
    """JPEG → WebP de 960 px com o ImageMagick; False se não houver conversor ou se falhar."""
    programa = shutil.which("magick") or shutil.which("convert")
    if not programa:
        return False
    comando = [programa, str(origem), "-resize", f"{LARGURA}x{LARGURA}>", "-quality", "80", str(destino)]
    try:
        subprocess.run(comando, check=True, capture_output=True, timeout=60)
    except Exception:
        return False
    return destino.exists() and destino.stat().st_size > 2000


def escolher(titulo: str, categoria_id: str, usadas: set[str] | None = None) -> dict | None:
    """Foto candidata para o título (sem a descarregar): ficha, miniatura, autor, licença e legendas."""
    consulta, pt, en = tema(titulo, categoria_id)
    usadas = fotos_em_uso() if usadas is None else usadas
    try:
        lista = candidatas(consulta, usadas)
        if not lista and consulta != CATEGORIAS.get(categoria_id, ("",))[0]:
            consulta, pt, en = CATEGORIAS.get(categoria_id, CATEGORIAS["conhecimento"])
            lista = candidatas(consulta, usadas)
    except Exception:
        return None
    return {**lista[0], "legenda_pt": f"Foto de contexto: {pt}.", "legenda_en": f"Context photo: {en}."} if lista else None


def aplicar(noticia: dict, descarregar: bool = True) -> bool:
    """Põe a foto de contexto na notícia (campos iguais aos das fotos escolhidas à mão). False = fica a ilustração."""
    foto = escolher((noticia.get("pt") or {}).get("titulo", ""), noticia.get("categoria_id", ""))
    if not foto:
        return False
    if descarregar:
        MEDIA.mkdir(parents=True, exist_ok=True)
        ficheiro = MEDIA / (re.sub(r"[^a-z0-9-]", "", noticia["id"].lower())[:70] + ".webp")
        with tempfile.TemporaryDirectory() as pasta:
            bruto = Path(pasta) / "foto.jpg"
            try:
                with urllib.request.urlopen(urllib.request.Request(foto["miniatura"], headers=UA), timeout=60) as r:
                    bruto.write_bytes(r.read())
            except Exception:
                return False
            if not converter(bruto, ficheiro):
                return False
        noticia["imagem"] = "/" + ficheiro.relative_to(ROOT).as_posix()
    lic_pt, lic_en = licenca(foto["licenca"])
    noticia["imagem_credito_pt"] = f"Foto de contexto: {foto['autor']} · {lic_pt} · Wikimedia Commons"
    noticia["imagem_credito_en"] = f"Context photo: {foto['autor']} · {lic_en} · Wikimedia Commons"
    noticia["imagem_pagina"] = foto["ficha"]
    noticia["imagem_contexto"] = {"pt": foto["legenda_pt"], "en": foto["legenda_en"]}
    return True

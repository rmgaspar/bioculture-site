#!/usr/bin/env python3
"""Procura e junta fotografias da Wikimedia Commons às páginas (data/fotos-capitulos.json + images/<pasta>/).

Duas utilizações:

  procurar  — folha de contacto com candidatos de licença aberta (CC0, CC BY, CC BY-SA, domínio público):
      python3 scripts/imagens/fotos-capitulos.py procurar saida.png "consulta 1" "consulta 2" …

  juntar    — descarrega, recorta e grava a fotografia e acrescenta a entrada ao JSON (autor, licença e origem vêm da Commons):
      python3 scripts/imagens/fotos-capitulos.py juntar especificacao.json
    Cada item da especificação:
      { "pagina": "mineracao", "id": "hero", "titulo": "File:….jpg", "pasta": "mineracao", "ficheiro": "hero",
        "legenda": {"pt": "…", "en": "…"}, "alt": {"pt": "…", "en": "…"},
        "recorte": [x0, y0, x1, y1] (frações 0–1, opcional), "largura": 1200, "proporcao": "3 / 2" (opcional) }

As fotografias são de terceiros: a licença tem de ser CC0, CC BY, CC BY-SA ou domínio público (o teste scripts/tests/bioweb-fotos.test.mjs confirma).
"""
import io
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw

Image.MAX_IMAGE_PIXELS = None
ROOT = Path(__file__).resolve().parents[2]
API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "bioCulture-site/1.0 (https://www.bioculture.pt; geral@bioculture.pt)"}
ABERTAS = re.compile(r"^(CC0|CC BY( \d\.\d)?|CC BY-SA( \d\.\d)?|Public domain)")


def api(**params):
    params["format"] = "json"
    with urllib.request.urlopen(urllib.request.Request(f"{API}?{urllib.parse.urlencode(params)}", headers=UA), timeout=60) as r:
        return json.load(r)


def baixar(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read()


def limpo(html):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", html or "")).strip()


def procurar(saida, consultas, por_consulta=8, largura_min=1200):
    candidatos = {}
    for consulta in consultas:
        try:
            dados = api(action="query", generator="search", gsrsearch=consulta, gsrnamespace=6, gsrlimit=por_consulta + 6,
                        prop="imageinfo", iiprop="url|size|extmetadata", iiurlwidth=420)
        except Exception as erro:  # a Commons às vezes demora
            print("falhou:", consulta, erro)
            continue
        n = 0
        for p in dados.get("query", {}).get("pages", {}).values():
            ii = (p.get("imageinfo") or [{}])[0]
            meta = ii.get("extmetadata", {})
            licenca = meta.get("LicenseShortName", {}).get("value", "")
            if not ABERTAS.match(licenca) or ii.get("width", 0) < largura_min or not ii.get("thumburl"):
                continue
            if p["title"].lower().endswith((".pdf", ".webm", ".ogv", ".gif", ".svg", ".tif", ".tiff")):
                continue
            if p["title"] in candidatos:
                continue
            candidatos[p["title"]] = (licenca, ii["width"], ii["height"], ii["thumburl"], consulta)
            n += 1
            if n >= por_consulta:
                break
    itens = list(candidatos.items())
    colunas, L, A = 5, 300, 210
    folha = Image.new("RGB", (colunas * L, ((len(itens) + colunas - 1) // colunas) * A), "white")
    desenho = ImageDraw.Draw(folha)
    for i, (titulo, v) in enumerate(itens):
        try:
            im = Image.open(io.BytesIO(baixar(v[3]))).convert("RGB")
            im.thumbnail((L, A - 14))
            folha.paste(im, ((i % colunas) * L, (i // colunas) * A))
        except Exception:
            pass
        desenho.text(((i % colunas) * L + 3, (i // colunas) * A + A - 13), str(i), fill="red")
        print(i, titulo[:100], v[0], f"{v[1]}x{v[2]}", "·", v[4][:30])
    folha.save(saida)
    Path(saida).with_suffix(".json").write_text(json.dumps([[t, v[0]] for t, v in itens], ensure_ascii=False), encoding="utf-8")


def juntar(especificacao):
    itens = json.loads(Path(especificacao).read_text(encoding="utf-8"))
    caminho = ROOT / "data/fotos-capitulos.json"
    dados = json.loads(caminho.read_text(encoding="utf-8"))
    for item in itens:
        d = api(action="query", titles=item["titulo"], prop="imageinfo", iiprop="url|size|extmetadata", iiurlwidth=max(item.get("largura", 1200) * 2, 2000))
        ii = list(d["query"]["pages"].values())[0]["imageinfo"][0]
        meta = ii["extmetadata"]
        licenca = meta["LicenseShortName"]["value"]
        if not ABERTAS.match(licenca):
            raise SystemExit(f"{item['titulo']}: licença não permitida ({licenca})")
        im = Image.open(io.BytesIO(baixar(ii.get("thumburl") or ii["url"]))).convert("RGB")
        if item.get("recorte"):
            w, h = im.size
            x0, y0, x1, y1 = item["recorte"]
            im = im.crop((int(w * x0), int(h * y0), int(w * x1), int(h * y1)))
        largura = item.get("largura", 1200)
        if im.size[0] > largura:
            im = im.resize((largura, round(largura * im.size[1] / im.size[0])), Image.LANCZOS)
        pasta = ROOT / "images" / item["pasta"]
        pasta.mkdir(parents=True, exist_ok=True)
        destino = pasta / f"{item['ficheiro']}.webp"
        im.save(destino, quality=82, method=6)
        autor = limpo(meta.get("Artist", {}).get("value")) or "Autor desconhecido"
        autor = re.sub(r"\s*(\(|\[).*$", "", autor) if len(autor) > 60 else autor
        publico = licenca.lower().startswith("public")
        nome = "domínio público" if publico else licenca
        entrada = {
            "ficheiro": f"{item['pasta']}/{item['ficheiro']}.webp",
            "legenda": item["legenda"],
            "alt": item["alt"],
            "autor": item.get("autor") or autor,
            "licenca": nome,
            "licenca_en": "public domain" if publico else licenca,
            "pagina": "https://commons.wikimedia.org/wiki/" + item["titulo"].replace(" ", "_"),
        }
        if not publico:
            m = re.match(r"^(CC0|CC BY-SA|CC BY)(?: (\d\.\d))?", licenca)
            tipo = {"CC0": "publicdomain/zero", "CC BY-SA": "licenses/by-sa", "CC BY": "licenses/by"}[m.group(1)]
            entrada["licenca_url"] = f"https://creativecommons.org/{tipo}/{m.group(2) or ('1.0' if m.group(1) == 'CC0' else '4.0')}/"
        if item.get("proporcao"):
            entrada["proporcao"] = item["proporcao"]
        dados.setdefault(item["pagina"], {})[item["id"]] = entrada
        print(f"{item['pagina']}/{item['id']}: {destino.relative_to(ROOT)} {im.size} · {entrada['autor']} · {nome}")
    caminho.write_text(json.dumps(dados, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    if len(sys.argv) >= 4 and sys.argv[1] == "procurar":
        procurar(sys.argv[2], sys.argv[3:])
    elif len(sys.argv) == 3 and sys.argv[1] == "juntar":
        juntar(sys.argv[2])
    else:
        print(__doc__)

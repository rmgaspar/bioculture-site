#!/usr/bin/env python3
"""Gera as imagens das publicações para Facebook e Instagram (social/<pasta>/NN-nome-K.png).

Estilo igual ao das publicações da Sophia (verde escuro, laranja, serifa). Os números vêm dos ficheiros de dados do site
sempre que existem, para não os copiar à mão.

Uso:
    python3 scripts/social/gerar.py              # gera tudo em social/pack-AAAA-MM-DD/
"""
from __future__ import annotations

import collections
import datetime as dt
import json
import math
import unicodedata
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "social" / f"pack-{dt.date.today().isoformat()}"
W = 1080
M = 84
BG1, BG2 = (36, 71, 53), (24, 50, 38)
ACC, WHITE, MUTED, CARD, LINE = (232, 168, 124), (255, 255, 255), (166, 191, 165), (38, 72, 56), (62, 98, 78)
GREEN, AMBER, CORAL, BLUE, GREY = (27, 175, 122), (237, 161, 0), (235, 104, 52), (42, 120, 214), (150, 165, 155)
F = "/System/Library/Fonts/Supplemental/"


def font(size, bold=False, serif=True):
    nome = ("Georgia Bold.ttf" if bold else "Georgia.ttf") if serif else ("Arial Bold.ttf" if bold else "Arial.ttf")
    return ImageFont.truetype(F + nome, size)


def dados(nome):
    return json.loads((ROOT / "data" / nome).read_text(encoding="utf-8"))


def norm(s):
    return "".join(c for c in unicodedata.normalize("NFD", s.lower()) if unicodedata.category(c) != "Mn").strip()


def num(v):
    return f"{int(v):,}".replace(",", " ")


def quebrar(d, texto, f, largura):
    linhas, atual = [], ""
    for palavra in texto.split():
        teste = (atual + " " + palavra).strip()
        if d.textlength(teste, font=f) <= largura:
            atual = teste
        else:
            if atual:
                linhas.append(atual)
            atual = palavra
    if atual:
        linhas.append(atual)
    return linhas


def texto(d, xy, t, f, cor, largura, espaco=1.18):
    x, y = xy
    for linha in quebrar(d, t, f, largura):
        d.text((x, y), linha, font=f, fill=cor)
        y += int(f.size * espaco)
    return y


class Tela:
    def __init__(self, altura=1350):
        self.H = altura
        fundo = Image.new("RGB", (W, altura), BG2)
        px = fundo.load()
        for y in range(altura):
            for x in range(0, W, 4):
                t = max(0.0, 1 - (math.hypot(x - W, y) / 1500))
                c = tuple(int(BG2[i] + (BG1[i] - BG2[i]) * t) for i in range(3))
                for k in range(4):
                    if x + k < W:
                        px[x + k, y] = c
        self.im = fundo
        self.d = ImageDraw.Draw(fundo)
        self.y = 0

    def marca(self, y=70):
        d = self.d
        logo = Image.open(ROOT / "images" / "bioculture-mark-v3.png").convert("RGB").resize((76, 76), Image.LANCZOS)
        mascara = Image.new("L", (76, 76), 0)
        ImageDraw.Draw(mascara).ellipse((0, 0, 75, 75), fill=255)
        self.im.paste(logo, (M, y), mascara)
        d.text((M + 94, y - 2), "bioCulture", font=font(38), fill=WHITE)
        d.text((M + 94, y + 48), "REGENERAÇÃO GLOBAL", font=font(17, True, False), fill=ACC)
        return y + 118

    def pilula(self, y, t):
        f = font(27, True, False)
        w = int(self.d.textlength(t, font=f)) + 52
        self.d.rounded_rectangle((M, y, M + w, y + 58), radius=29, fill=ACC)
        self.d.text((M + 26, y + 14), t, font=f, fill=BG2)
        return y + 58 + 38

    def titulo(self, y, t, tam=76, cor=WHITE):
        f = font(tam, True)
        return texto(self.d, (M, y), t, f, cor, W - 2 * M, 1.12) + 14

    def sub(self, y, t, tam=40, cor=MUTED):
        return texto(self.d, (M, y), t, font(tam), cor, W - 2 * M, 1.22) + 10

    def rodape(self, t):
        n = len(quebrar(self.d, t, font(24, False, False), W - 2 * M))
        y = self.H - 60 - n * 32 - 18
        self.d.line((M, y, W - M, y), fill=LINE, width=2)
        texto(self.d, (M, y + 22), t, font(24, False, False), MUTED, W - 2 * M, 1.3)

    def factos(self, y, itens):
        n = len(itens)
        gap = 24
        w = (W - 2 * M - gap * (n - 1)) // n
        for i, (v, l) in enumerate(itens):
            x = M + i * (w + gap)
            self.d.rounded_rectangle((x, y, x + w, y + 196), radius=24, fill=CARD, outline=LINE, width=2)
            tam = 50
            while self.d.textlength(v, font=font(tam, True)) > w - 40 and tam > 28:
                tam -= 2
            self.d.text((x + 24, y + 26), v, font=font(tam, True), fill=WHITE)
            texto(self.d, (x + 24, y + 26 + tam + 14), l, font(25, False, False), MUTED, w - 44, 1.25)
        return y + 196 + 30

    def guardar(self, nome):
        OUT.mkdir(parents=True, exist_ok=True)
        self.im.save(OUT / nome, optimize=True)
        print(nome)


def foto_topo(t, ficheiro, altura=560, recorte=(0.5, 0.5)):
    im = Image.open(ROOT / "images" / ficheiro).convert("RGB")
    r = max(W / im.width, altura / im.height)
    im = im.resize((int(im.width * r) + 1, int(im.height * r) + 1), Image.LANCZOS)
    x = int((im.width - W) * recorte[0])
    y = int((im.height - altura) * recorte[1])
    im = im.crop((x, y, x + W, y + altura))
    t.im.paste(im, (0, 0))
    # esbatido para o fundo verde
    sombra = Image.new("RGBA", (W, 180), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sombra)
    for i in range(180):
        sd.line((0, i, W, i), fill=BG2 + (int(255 * (i / 179) ** 2.2),))
    t.im.paste(sombra, (0, altura - 180), sombra)
    t.d = ImageDraw.Draw(t.im)


def credito(ficheiro_chave, curta, grupo="inicio"):
    f = dados("fotos-capitulos.json")
    e = f[grupo][ficheiro_chave]
    return e["ficheiro"], f"{curta} Foto: {e['autor']} · {e['licenca']} · Wikimedia Commons"


# ---------- modelos ----------
def capa(nome, pilula, titulo, sub, factos, rodape, tam=76, foto=None, altura=1350):
    t = Tela(altura)
    if foto:
        foto_topo(t, foto[0], recorte=foto[1] if len(foto) > 1 else (0.5, 0.5))
        topo = Image.new("RGBA", (W, 190), (0, 0, 0, 0))
        td = ImageDraw.Draw(topo)
        for i in range(190):
            td.line((0, i, W, i), fill=(10, 24, 17, int(170 * (1 - i / 189) ** 1.6)))
        t.im.paste(topo, (0, 0), topo)
        t.d = ImageDraw.Draw(t.im)
        t.marca(50)
        y = 590
        t.pilula(y, pilula)
        y = t.titulo(y + 96, titulo, tam)
    else:
        y = t.marca()
        y += 40
        y = t.pilula(y, pilula)
        y = t.titulo(y, titulo, tam)
    if sub:
        y = t.sub(y + 6, sub, 36 if foto else 40)
    if factos:
        nlin = len(quebrar(t.d, rodape, font(24, False, False), W - 2 * M))
        fy = t.H - 60 - nlin * 32 - 18
        t.factos(y + 40 if not foto else max(y + 10, fy - 196 - 40), factos)
    t.rodape(rodape)
    t.guardar(nome)


def lista(nome, pilula, titulo, itens, rodape, cta=None, altura=1350, tam=70, corpo=33):
    t = Tela(altura)
    y = t.marca() + 30
    y = t.pilula(y, pilula)
    y = t.titulo(y, titulo, tam)
    y += 22
    d = t.d
    for i, item in enumerate(itens, 1):
        cab, corpo_t = item if isinstance(item, tuple) else (None, item)
        d.ellipse((M, y, M + 66, y + 66), fill=ACC)
        d.text((M + 33, y + 33), str(i), font=font(32, True), fill=BG2, anchor="mm")
        x = M + 98
        yy = y
        if cab:
            yy = texto(d, (x, yy - 2), cab, font(corpo + 2, True, False), WHITE, W - x - M, 1.2)
        yy = texto(d, (x, yy - (0 if cab else 0)), corpo_t, font(corpo, False, False), WHITE if not cab else MUTED, W - x - M, 1.28)
        y = max(y + 90, yy) + 34
    if cta:
        h = 150
        yc = t.H - 112 - 30 - h - 16
        d.rounded_rectangle((M, yc, W - M, yc + h), radius=26, fill=ACC)
        d.text((M + 36, yc + 28), cta[0], font=font(46, True), fill=BG2)
        texto(d, (M + 36, yc + 94), cta[1], font(26, True, False), BG2, W - 2 * M - 72, 1.2)
    t.rodape(rodape)
    t.guardar(nome)


def barras(nome, pilula, titulo, linhas, rodape, sub=None, nota=None, tam=68, formato=num, altura=1350, cor_fixa=None):
    t = Tela(altura)
    y = t.marca() + 30
    y = t.pilula(y, pilula)
    y = t.titulo(y, titulo, tam)
    if sub:
        y = t.sub(y, sub, 34)
    y += 20
    d = t.d
    mx = max(v for _, v, _ in linhas)
    for rot, v, cor in linhas:
        yy = texto(d, (M, y), rot, font(29, False, False), WHITE, W - 2 * M - 20, 1.22)
        d.rounded_rectangle((M, yy + 6, W - M, yy + 6 + 34), radius=10, fill=CARD)
        largura = max(14, int((W - 2 * M) * v / mx))
        d.rounded_rectangle((M, yy + 6, M + largura, yy + 6 + 34), radius=10, fill=cor_fixa or cor)
        etiqueta = formato(v)
        f = font(26, True, False)
        wt = d.textlength(etiqueta, font=f)
        if largura > wt + 30:
            d.text((M + largura - wt - 14, yy + 12), etiqueta, font=f, fill=BG2)
        else:
            d.text((M + largura + 12, yy + 12), etiqueta, font=f, fill=WHITE)
        y = yy + 6 + 34 + 30
    if nota:
        texto(d, (M, y + 4), nota, font(29, False, False), MUTED, W - 2 * M, 1.3)
    t.rodape(rodape)
    t.guardar(nome)


def empilhadas(nome, pilula, titulo, linhas, rodape, sub=None, nota=None, tam=62):
    t = Tela()
    y = t.marca() + 30
    y = t.pilula(y, pilula)
    y = t.titulo(y, titulo, tam)
    if sub:
        y = t.sub(y, sub, 33)
    y += 4
    d = t.d
    cores = {"c": GREEN, "d": CORAL, "o": GREY}
    for rot, total, partes, txt in linhas:
        d.text((M, y), rot, font=font(31, True, False), fill=WHITE)
        tw = d.textlength(total, font=font(27, False, False))
        d.text((W - M - tw, y + 3), total, font=font(27, False, False), fill=MUTED)
        y += 44
        soma = sum(p[1] for p in partes)
        x = M
        for k, v, et in partes:
            w = max(6, int((W - 2 * M) * v / soma))
            d.rectangle((x, y, x + w, y + 48), fill=cores[k])
            if et and w > 90:
                d.text((x + w / 2, y + 24), et, font=font(25, True, False), fill=WHITE if k != "o" else BG2, anchor="mm")
            x += w + 2
        y += 48 + 10
        y = texto(d, (M, y), txt, font(25, False, False), MUTED, W - 2 * M, 1.3) + 16
    # legenda
    x = M
    for k, et in (("c", "Concordância"), ("d", "Discordância"), ("o", "Outras / sem classificação")):
        d.rectangle((x, y, x + 20, y + 20), fill=cores[k])
        d.text((x + 30, y - 4), et, font=font(25, False, False), fill=MUTED)
        x += 40 + int(d.textlength(et, font=font(25, False, False))) + 26
    y += 46
    if nota:
        texto(d, (M, y), nota, font(28, False, False), WHITE, W - 2 * M, 1.3)
    t.rodape(rodape)
    t.guardar(nome)


def mapa(nome, pilula, titulo, rodape):
    geo = dados("participa-geo.json")
    z = dados("zaer_critico.json")["consultas_participa"]
    atuais = [r for k in ("abertas", "em_analise") for r in z[k] if not r.get("alerta_qualidade")]
    por = {}
    for r in atuais:
        for m in r.get("municipios") or []:
            o = por.setdefault(norm(m), {"nome": m, "n": 0, "abertas": 0})
            o["n"] += 1
            o["abertas"] += 1 if r["estado_consulta"] == "Aberta" else 0
    t = Tela()
    y = t.marca() + 30
    y = t.pilula(y, pilula)
    y = t.titulo(y, titulo.format(n=len(por)), 64)
    d = t.d
    top_y = y + 20
    alto = t.H - 112 - 30 - top_y - 10
    esc = min(alto / geo["altura"], 420 / geo["largura"])
    ox, oy = M, top_y

    def p(q):
        return (ox + q[0] * esc, oy + q[1] * esc)

    d.polygon([p(q) for q in geo["contorno"]], fill=CARD, outline=LINE)
    for k, o in por.items():
        q = geo["concelhos"].get(k)
        if not q:
            continue
        cx, cy = p(q)
        cor = GREEN if o["abertas"] else AMBER
        r = 7 + o["n"] * 4
        halo = Image.new("RGBA", (int(r * 5), int(r * 5)), (0, 0, 0, 0))
        ImageDraw.Draw(halo).ellipse((0, 0, r * 5 - 1, r * 5 - 1), fill=cor + (60,))
        t.im.paste(halo, (int(cx - r * 2.5), int(cy - r * 2.5)), halo)
        d = ImageDraw.Draw(t.im)
        d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=cor, outline=WHITE, width=2)
    t.d = d = ImageDraw.Draw(t.im)
    x0 = M + 420 + 50
    d.text((x0, top_y), "Concelhos mais visados", font=font(30, True), fill=WHITE)
    yy = top_y + 66
    top = sorted(por.values(), key=lambda o: (-o["n"], o["nome"]))[:6]
    mx = max(o["n"] for o in top)
    for o in top:
        d.text((x0, yy), o["nome"], font=font(28, False, False), fill=WHITE)
        yy += 40
        w = int((W - M - x0) * o["n"] / mx)
        d.rounded_rectangle((x0, yy, x0 + w, yy + 24), radius=8, fill=GREEN if o["abertas"] else AMBER)
        d.text((x0 + w + 12, yy - 3), f"{o['n']}", font=font(26, True, False), fill=WHITE)
        yy += 50
    yy += 10
    for cor, et in ((GREEN, "Com consulta aberta"), (AMBER, "Só em análise")):
        d.ellipse((x0, yy + 4, x0 + 20, yy + 24), fill=cor)
        d.text((x0 + 32, yy), et, font=font(25, False, False), fill=MUTED)
        yy += 40
    t.rodape(rodape)
    t.guardar(nome)


def so_imagem(tela_nome):
    pass


def main():
    z = dados("zaer_critico.json")
    ps = z["pszaer"]
    rf = ps["consulta_publica"]["relatorio_final"]
    sol = ps["areas_mapeadas"]["solar"]["proposta_menos_10km_subestacao"]
    eol = ps["areas_mapeadas"]["eolica_terrestre"]["proposta_poligonos_maiores_20ha"]
    fa = z["consultas_participa"]["factos_participacao"]

    # 01 · PSZAER
    capa("01-pszaer-1.png", "PSZAER · PROGRAMA NACIONAL", "Onde o Estado propõe acelerar as renováveis.",
         "Solar e eólica em terra. Proposta de maio de 2026.",
         [(f"{num(sol['area_ha'])} ha", f"de solar, em {sol['poligonos']} polígonos"), (f"{num(eol['area_ha'])} ha", f"de eólica, em {eol['poligonos']} polígonos"), (num(rf["participacoes"]), "participações na consulta")],
         "bioculture.pt/energia/transicao-etica · Foto: pedrik · CC BY 2.0 · Wikimedia Commons", tam=66,
         foto=("renovaveis/zaer-norte-lisboa.webp", (0.5, 0.4)))
    tip = rf["tipologia_pct"]
    barras("01-pszaer-2.png", "O QUE DISSERAM AS PARTICIPAÇÕES", f"{num(rf['participacoes'])} participações, 94% de discordância.",
           [("Discordância", tip["discordancia"], CORAL), ("Reclamação", tip["reclamacao"], AMBER), ("Sugestão", tip["sugestao"], BLUE), ("Concordância", tip["concordancia"], GREEN), ("Comentário geral", tip["geral"], GREY)],
           "Relatório de Envolvimento e Consulta Pública do PSZAER", formato=lambda v: f"{v}%",
           nota=f"{str(rf['modelo_pct']).replace('.', ',')}% eram participações-modelo, com o texto repetido. A Guarda foi o concelho mais mencionado: {rf['concelho_mais_mencionado']['mencoes']} menções.", tam=64)
    barras("01-pszaer-3.png", "DE QUE FALARAM", "Biodiversidade e solos, à cabeça.",
           [(x["pt"], x["n"], AMBER) for i, x in enumerate(rf["temas"][:5])],
           "Relatório de Envolvimento e Consulta Pública do PSZAER", nota="Cada participação pode tratar vários temas, por isso as barras não somam o total.", tam=68)
    lista("01-pszaer-4.png", "COMO LER ESTES NÚMEROS", "Uma mancha no mapa não é um projeto.",
          [("Não se somam.", "As áreas solar e eólica podem sobrepor-se; nunca devem ser somadas como ocupação total."),
           ("É potencial.", "As manchas indicam potencial após critérios nacionais; o desenho final depende do projeto e do licenciamento."),
           ("A rede pesa.", "A ligação à rede pode exigir linhas e subestações fora da mancha, com impactos próprios.")],
          "bioculture.pt/energia/transicao-etica", cta=("Instantâneo completo", "bioculture.pt/energia/transicao-etica#zaer"), tam=64)

    # 02 · mediana vs média
    barras("02-participacoes.png", "PARTICIPA.PT · 2026", "8 151 participações é muito?",
           [("Mediana dos projetos de 2026", fa["participacoes_mediana"], GREEN), ("Média dos projetos", fa["participacoes_media"], AMBER), ("Central solar de Sophia", fa["participacoes_maxima"], CORAL)],
           "Consultas de projetos de renováveis, 2026 · Participa.pt", sub="A Sophia teve cerca de 55 vezes mais do que o caso típico.",
           nota=f"Sozinha pesa {round(fa['participacoes_maxima'] / fa['participacoes_total'] * 100)}% das participações dos projetos de 2026. Sem ela, a média desce de {fa['participacoes_media']} para {fa['participacoes_media_sem_maxima']}: a mediana descreve melhor o caso típico.", tam=70)

    # 03 · concordam / discordam
    lp = z["consultas_participa"]["leitura_participacoes"]["posicoes"]
    ap = {x["id"]: x for x in lp}
    empilhadas("03-concordam.png", "RELATÓRIOS DA APA", "Quem concorda e quem discorda?",
               [("Programa Setorial das ZAER", "8 381 participações", [("c", 1, ""), ("d", 94, "94%"), ("o", 5, "")], "Reclamação 3%, sugestão 1%, comentário geral 1%."),
                ("Parque Eólico do Paiva", "590", [("c", 25, ""), ("d", 549, "cerca de 93%"), ("o", 16, "")], "25 concordam: emprego, contrapartidas e acessos."),
                ("Planalto Branco (solar)", "69", [("d", 62, "62"), ("o", 7, "7")], "Cinco sugestões e dois comentários gerais. Nenhuma concordância."),
                ("Alcoutim, 1.ª consulta (eólico)", "13", [("c", 2, "2"), ("d", 9, "9"), ("o", 2, "2")], "Uma geral e uma sugestão.")],
               "Relatórios de consulta pública da APA e do PSZAER", nota="Não são todas contra, e a divisão só se conhece quando a APA publica o relatório.", tam=54)

    # 04 · consultas abertas (feed e story)
    ab = sorted(z["consultas_participa"]["abertas"], key=lambda r: r["fim"])
    def dd(v):
        m = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
        a = dt.date.fromisoformat(v)
        return f"{a.day} {m[a.month - 1]}"
    nomes = {"vigia": "Sobreequipamento do Parque Eólico de Vigia (Tarouca)", "vilar": "Solar flutuante e eólico de Vilar-Tabuaço", "ruiva": "Central solar Terra Ruiva"}
    itens = []
    for r in ab:
        k = "vigia" if "vigia" in r["url"] else "vilar" if "vilar" in r["url"] else "ruiva"
        itens.append((f"{nomes[k]}", f"Até {dd(r['fim'])} · {num(r['participacoes'])} participações até agora"))
    for nome, alt in (("04-abertas-feed.png", 1350), ("04-abertas-story.png", 1920)):
        lista(nome, "CONSULTAS ABERTAS AGORA", "Ainda vais a tempo de participar.", itens,
              f"Verificado no Participa.pt a {dt.date.today().strftime('%d/%m/%Y')} · bioculture.pt/energia/transicao-etica",
              cta=("Comenta em participa.pt", "Regista-te grátis e carrega em «Seguir» para receberes avisos"), altura=alt, tam=72, corpo=34)

    # 05 · mapa
    mapa("05-mapa.png", "ONDE ESTÃO AS CONSULTAS", "{n} concelhos com consultas de renováveis.", "Participa.pt · pontos indicativos por concelho · bioculture.pt/energia/transicao-etica")

    # 06 · território
    lista("06-territorio.png", "PARECERES DAS COMISSÕES DE AVALIAÇÃO", "Por trás de cada mancha há árvores, aves e lobos.",
          [("Sophia (projeto inicial)", "1 541 sobreiros e azinheiras a cortar ou arrancar e 24 aves ameaçadas, entre elas a águia-imperial-ibérica."),
           ("Alcoutim", "Indícios de 13 territórios de águia-de-Bonelli e de 1 a 2 de águia-imperial-ibérica num raio de 10 km."),
           ("Paiva", "Impactes muito significativos no lobo-ibérico, dentro da área da alcateia da Lapa.")],
          "Pareceres da Comissão de Avaliação (APA) · fichas em bioculture.pt/energia/transicao-etica#consultas", tam=62, corpo=33)

    # 07 · Finlândia · 08 · Mongólia · 09 · Barroso
    f, c = credito("foco-finlandia", "Corte raso no sul da Finlândia (ilustrativa; não é um dos locais da Google).")
    capa("07-finlandia.png", "CENTROS DE DADOS · FINLÂNDIA", "A floresta cortada antes de avaliar.",
         "A autoridade finlandesa mandou parar as obras de dois centros de dados da Google até a avaliação de impacte estar concluída.",
         [("530 ha", "de floresta abatida, segundo a Google"), ("400 mil", "árvores abatidas (estimativa do Guardian)"), ("130 ha", "a replantar em Muhos")],
         c + " · bioculture.pt/recursos/google-finlandia-floresta", tam=64, foto=(f, (0.5, 0.45)))
    f, c = credito("foco-mongolia", "Estepe junto ao maciço Baga Gazaryn Chuluu, na Mongólia.")
    capa("08-mongolia.png", "SOLO · COP17", "O que a Mongólia revela sobre solo, clima e alimento.",
         "A crise não cabe num único número: aquecimento, aridez, pressão sobre as pastagens e o dzud de 2023–2024.",
         [("76,9%", "do território afetado por degradação"), ("+2,25 °C", "na temperatura média anual em 80 anos"), ("8,1 M", "animais perdidos no dzud")],
         c + " · bioculture.pt/recursos/mongolia-solo-cop17", tam=58, foto=(f, (0.5, 0.5)))
    f, c = credito("foco-barroso", "Capela de Santa Maria, em Covas do Barroso (Boticas).")
    capa("09-barroso.png", "LÍTIO · BOTICAS", "Mina do Barroso: ainda não há extração.",
         "A declaração de impacte ambiental favorável condicionada é de maio de 2023. Covas do Barroso integra o sistema agrícola do Barroso reconhecido pela FAO.",
         [("5,4 km²", "de área do projeto"), ("T4 2026", "pedido de licença ambiental (promotor)"), ("fev. 2027", "decisão prevista do regulador")],
         c + " · bioculture.pt/energia/mineracao#casos", tam=60, foto=(f, (0.5, 0.5)))

    # 10 · destaques
    ds = dados("destaques.json")
    capa("10-destaques-1.png", "DESTAQUE · PRESSÕES HUMANAS", "Um parque solar, 568 hectares de floresta.",
         "Em Santarém e Cartaxo, 189 MWp de potência instalada custaram mais de 200 sobreiros abatidos.",
         [("189 MWp", "de potência instalada"), ("568 ha", "de floresta"), ("200+", "sobreiros abatidos")],
         "Foto: Bextrel · CC BY-SA 4.0 (um parque solar no Algarve, para ilustrar a escala) · bioculture.pt/energia/transicao-etica", tam=62,
         foto=("destaques/solar-parque.webp", (0.5, 0.5)))
    capa("10-destaques-2.png", "DESTAQUE · OBSERVATÓRIO GLOBAL", "Mesmo no cenário mais otimista, 1,8 °C.",
         "Ultrapassar 1,5 °C não torna todos os futuros iguais: cada fração de grau e cada ano acima do limite aumentam o risco.", None,
         "Foto: NASA · domínio público · bioculture.pt/observatorio/limitar-ultrapassagem-1-5", tam=66,
         foto=("destaques/clima-degelo.webp", (0.5, 0.5)))
    capa("10-destaques-3.png", "DESTAQUE · VETORES DE PRESSÃO", "Aviação: o peso de cada viagem.",
         "Escolhe uma rota ou dois aeroportos e vê o que um voo gasta e afeta: CO₂, combustível, óxidos de azoto e ruído.",
         None, "Foto: NASA Earth Observatory · domínio público · bioculture.pt/energia/aviacao", tam=66,
         foto=("aviacao/miniatura.webp", (0.5, 0.5)))

    # 11 · problemas da horta
    pr = {x["id"]: x for x in dados("problemas-horta.json")["problemas"]}
    grupos = collections.Counter(x["grupo"] for x in pr.values())
    capa("11-horta-problemas-1.png", "PROBLEMAS NA HORTA", "O que fazer quando a horta não corre bem?",
         "Respostas curtas por sintoma, com as causas mais prováveis e o que fazer primeiro.",
         [(str(len(pr)), "problemas com resposta"), (str(grupos["doencas"]), "de doenças"), (str(grupos["pragas"]), "de pragas")],
         "bioculture.pt · Conhecimento para cuidar · Problemas na horta", tam=70)
    for i, k in enumerate(("tomate-fundo-preto", "folhas-amarelas", "lesmas-e-caracois"), 2):
        x = pr[k]["pt"]
        lista(f"11-horta-problemas-{i}.png", "PROBLEMAS NA HORTA", x["titulo"] + "?",
              [("Porquê", x["resumo"]), ("Fazer", x["fazer"][0]), ("Fazer", x["fazer"][1])],
              "bioculture.pt · Problemas na horta", tam=58, corpo=33)

    # 12 · técnicas
    dc = {x["id"]: x for x in dados("dicas.json")}
    capa("12-tecnicas-1.png", "TÉCNICAS DE HORTA", "Cuidar do solo e da água, sem pesticidas.",
         "Fichas práticas com materiais, passos e erros a evitar.",
         [(str(len(dc)), "técnicas"), (str(len({x["categoria"] for x in dc.values()})), "temas, do solo à biodiversidade"), ("Sem", "pesticidas, herbicidas nem adubos sintéticos")],
         "bioculture.pt · Soluções naturais · Técnicas", tam=70)
    for i, (k, tit, extra) in enumerate((("folhas-molde", "Húmus de folhas: recolher no outono", None), ("captacao-chuva", "Captar a chuva: instalar antes da época chuvosa", None),
                                         ("adubo-verde", "Adubação verde: o solo nunca nu", None), ("mulching-organico", "Mulching: cobrir o solo", None)), 2):
        x = dc[k]
        passos = x["passos"]
        itens = [(None, x["resumo"])] + [(None, p) for p in passos[:3]] + [("Evitar", x["erros_evitar"][0])]
        lista(f"12-tecnicas-{i}.png", x["nivel"].upper() + " · " + x["categoria"].upper(), tit, itens, "bioculture.pt · Técnicas · " + x["titulo"], tam=56, corpo=31)

    # 13 · o que mais
    ap_ = dados("apoios.json")["apoios"] if "apoios" in dados("apoios.json") else None
    n_apoios = len(ap_) if ap_ else 16
    gl = dados("glossario.json")
    n_gl = len(gl if isinstance(gl, list) else gl.get("termos", gl))
    pl = dados("planeador-horta.json")
    lista("13-mais.png", "E MAIS NO BIOCULTURE", "Ferramentas para decidir com fontes.",
          [("Planeador de horta", f"{len(pl['culturas'])} culturas com épocas e um esquema de rotação de 3 e 4 anos, segundo o RHS."),
           ("Glossário", f"{n_gl} termos de ambiente, solo e energia, em português claro."),
           ("Apoios agrícolas (PEPAC)", f"{n_apoios} apoios do IFAP explicados, com ligação às regras oficiais."),
           ("Sementes de conservação", "8 variedades do Catálogo Nacional de Variedades de 2026, com a região de origem.")],
          "bioculture.pt", tam=64, corpo=32)


if __name__ == "__main__":
    main()

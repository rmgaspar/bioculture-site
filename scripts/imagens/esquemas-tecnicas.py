#!/usr/bin/env python3
"""Gera os esquemas próprios das fichas de técnicas (images/dicas/tecnicas/esquema-*.svg), em português e em inglês.

Cada esquema leva as legendas dentro do desenho. A versão inglesa tem o sufixo «-en».
Uso: python3 scripts/imagens/esquemas-tecnicas.py
"""
import math
from pathlib import Path

DEST = Path(__file__).resolve().parents[2] / "images/dicas/tecnicas"
BG, INK, MUTE = "#f1efe3", "#20342a", "#4a554e"
VERDE, VERM, AZUL, ARG, SOLO, SOLO2, AMBAR = "#4c7a34", "#b5483a", "#3f7aa8", "#c9a77f", "#8a6a4a", "#4b3a28", "#c98a1a"


def t(x, y, s, size=16, w=400, fill=INK, a="middle"):
    return f'<text x="{x}" y="{y}" font-size="{size}" font-weight="{w}" fill="{fill}" text-anchor="{a}">{s}</text>'


def linhas(x, y, ls, size=14, w=400, fill=INK, a="middle", lh=18):
    return "".join(t(x, y + i * lh, l, size, w, fill, a) for i, l in enumerate(ls))


def certo(x, y, r=16):
    return (f'<circle cx="{x}" cy="{y}" r="{r}" fill="{VERDE}"/><path d="M{x-r*.42:.1f} {y}l{r*.35:.1f} {r*.45:.1f} {r*.7:.1f}-{r*.85:.1f}" '
            f'stroke="#fff" stroke-width="{r*.22:.1f}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>')


def errado(x, y, r=16):
    return (f'<circle cx="{x}" cy="{y}" r="{r}" fill="{VERM}"/><path d="M{x-r*.4:.1f} {y-r*.4:.1f}l{r*.8:.1f} {r*.8:.1f}M{x+r*.4:.1f} {y-r*.4:.1f}l-{r*.8:.1f} {r*.8:.1f}" '
            f'stroke="#fff" stroke-width="{r*.22:.1f}" stroke-linecap="round"/>')


def seta(x1, y1, x2, y2, cor=MUTE, w=3):
    a = math.atan2(y2 - y1, x2 - x1); h = 9
    p1 = (x2 - h * math.cos(a - .5), y2 - h * math.sin(a - .5)); p2 = (x2 - h * math.cos(a + .5), y2 - h * math.sin(a + .5))
    return (f'<path d="M{x1} {y1}L{x2} {y2}" stroke="{cor}" stroke-width="{w}" stroke-linecap="round"/>'
            f'<path d="M{p1[0]:.1f} {p1[1]:.1f}L{x2} {y2}L{p2[0]:.1f} {p2[1]:.1f}" fill="none" stroke="{cor}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>')


def guia(x1, y1, x2, y2, cor=MUTE):
    return f'<path d="M{x1} {y1}L{x2} {y2}" stroke="{cor}" stroke-width="1.6" stroke-dasharray="3 3"/><circle cx="{x2}" cy="{y2}" r="3" fill="{cor}"/>'


def planta(x, base, alto=80, cor=VERDE):
    return (f'<g fill="none" stroke="{cor}" stroke-width="5" stroke-linecap="round"><path d="M{x} {base}v-{alto}M{x} {base-alto*.5:.0f}c-16-7-26-18-28-32M{x} {base-alto*.7:.0f}c14-5 24-14 26-26"/></g>'
            f'<g fill="#6f9a4a"><ellipse cx="{x-28}" cy="{base-alto*.5-34:.0f}" rx="11" ry="6" transform="rotate(-40 {x-28} {base-alto*.5-34:.0f})"/>'
            f'<ellipse cx="{x+26}" cy="{base-alto*.7-28:.0f}" rx="11" ry="6" transform="rotate(40 {x+26} {base-alto*.7-28:.0f})"/><ellipse cx="{x}" cy="{base-alto-4}" rx="6" ry="9"/></g>')


def svg(corpo):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400" role="img" font-family="Georgia, serif">'
            f'<rect width="600" height="400" fill="{BG}"/>{corpo}</svg>')


# 1 ───────────────────────────────────────────────────────── onde cortar na poda
def corte_poda(L):
    S = {"pt": dict(a=("Longe demais", ["deixa um cepo", "que seca"]), b=("Certo", ["logo acima da gema,", "inclinado para o lado oposto"]),
                    c=("Rente e virado", ["para a gema: a água", "escorre para ela"]), g="gema", d="cepo"),
         "en": dict(a=("Too far", ["leaves a stub", "that dies back"]), b=("Right", ["just above the bud,", "sloping away from it"]),
                    c=("Too close", ["and sloping towards the bud:", "water runs onto it"]), g="bud", d="stub")}[L]
    o = []
    def ramo(cx, ye, yd, gy):
        return (f'<polygon points="{cx-17},312 {cx-17},{ye} {cx+17},{yd} {cx+17},312" fill="{SOLO}"/>'
                f'<ellipse cx="{cx+24}" cy="{gy}" rx="10" ry="17" fill="#6f9a4a"/>')
    o.append(ramo(100, 96, 96, 262))
    o.append(f'<path d="M62 96h76M62 262h76" stroke="{VERM}" stroke-width="2.5" stroke-dasharray="6 5"/>')
    o.append(seta(150, 130, 150, 100, VERM, 2.5) + seta(150, 228, 150, 258, VERM, 2.5))
    o.append(t(150, 184, S["d"], 15, 700, VERM))
    o.append(ramo(300, 226, 196, 262) + f'<path d="M283 226L317 196" stroke="{VERDE}" stroke-width="5"/>')
    o.append(f'<path d="M270 214c-8 10-14 18-18 28" fill="none" stroke="{AZUL}" stroke-width="3.5" stroke-dasharray="1 7" stroke-linecap="round"/>')
    o.append(ramo(500, 196, 232, 262) + f'<path d="M483 196L517 232" stroke="{VERM}" stroke-width="5"/>')
    o.append(f'<path d="M538 212c-6 8-9 12-9 17a9 9 0 0 0 18 0c0-5-3-9-9-17z" fill="{AZUL}" opacity=".9"/>')
    for cx in (100, 300, 500):
        o.append(guia(cx + 58, 296, cx + 31, 270) + t(cx + 62, 302, S["g"], 14, 600, MUTE, "start"))
    o.append(errado(100, 38) + certo(300, 38) + errado(500, 38))
    for cx, (tit, ls), cor in ((100, S["a"], VERM), (300, S["b"], VERDE), (500, S["c"], VERM)):
        o.append(t(cx, 346, tit, 17, 700, cor) + linhas(cx, 367, ls, 14, 400, MUTE, "middle", 17))
    o.append('<rect y="312" width="600" height="8" fill="#c9a77f"/>')
    return svg("".join(o))


# 2 ───────────────────────────────────────────────────────── enxertia de garfo
def enxertia(L):
    S = {"pt": dict(t=[("Cortes inclinados", "com «língua»"), ("Encaixar, com o", "câmbio a coincidir"), ("Ligar e selar", "o corte")], g="garfo", p="porta-enxerto", c="câmbio", m="mastique"),
         "en": dict(t=[("Sloping cuts", "with a “tongue”"), ("Fit together, with", "the cambium matching"), ("Tie and seal", "the cut")], g="scion", p="rootstock", c="cambium", m="sealant")}[L]
    defs = (f'<defs><g id="porta"><path d="M70 380V262l44-48V380z" fill="{SOLO}"/><path d="M70 262l44-48" stroke="#a8cf78" stroke-width="5" stroke-linecap="round"/></g>'
            f'<g id="garfo"><path d="M76 120v135l32-35V120z" fill="#7aa857"/><path d="M76 255l32-35" stroke="#a8cf78" stroke-width="5" stroke-linecap="round"/>'
            f'<circle cx="92" cy="152" r="5" fill="#3f6a2a"/><circle cx="92" cy="190" r="5" fill="#3f6a2a"/></g></defs>')
    o = [defs, '<g stroke-linejoin="round" stroke-linecap="round">']
    o.append(f'<use href="#porta"/><path d="M92 238v40" stroke="{SOLO2}" stroke-width="3.5"/>'
             f'<g transform="translate(0 -62)"><use href="#garfo"/><path d="M92 238v-34" stroke="{SOLO2}" stroke-width="3.5"/></g>')
    o.append('<path d="M150 118v46M140 154l10 12 10-12" fill="none" stroke="#6a746e" stroke-width="4"/>')
    o.append('<g transform="translate(200 0)"><use href="#porta"/><use href="#garfo"/><path d="M70 262l6-7M108 220l6-6" stroke="#a8cf78" stroke-width="7"/></g>')
    o.append(f'<g transform="translate(400 0)"><use href="#porta"/><use href="#garfo"/><g fill="none" stroke="#efe9d4" stroke-width="8"><path d="M64 276l56-14M64 262l56-14M64 248l56-14M64 234l56-14M64 220l56-14M66 206l50-10"/></g><circle cx="92" cy="120" r="11" fill="{AMBAR}"/></g>')
    o.append('</g>')
    o.append(guia(138, 86, 110, 108) + t(142, 84, S["g"], 14, 600, MUTE, "start"))
    o.append(guia(138, 320, 114, 340) + t(142, 324, S["p"], 14, 600, MUTE, "start"))
    o.append(guia(336, 262, 312, 238, VERDE) + t(340, 270, S["c"], 14, 600, VERDE, "start"))
    o.append(guia(524, 128, 508, 122, AMBAR) + t(528, 132, S["m"], 14, 600, AMBAR, "start"))
    o.append('<g stroke="#6a746e" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M165 360h28M183 351l10 9-10 9"/><path d="M365 360h28M383 351l10 9-10 9"/></g>')
    for i, cx in enumerate((20, 220, 420)):
        o.append(f'<circle cx="{cx+18}" cy="34" r="17" fill="{VERDE}"/>' + t(cx + 18, 41, str(i + 1), 19, 700, "#fff"))
        a, b = S["t"][i]
        o.append(t(cx + 42, 30, a, 15, 700, INK, "start") + t(cx + 42, 48, b, 14, 400, MUTE, "start"))
    o.append('<path d="M0 380h600" stroke="#c9c2ac" stroke-width="2"/>')
    return svg("".join(o))


# 3 ───────────────────────────────────────────────────────── ervas anuais e perenes
def infestantes(L):
    S = {"pt": dict(an="Anual", an2="raiz curta", pe="Perene", pe2="rizoma e bolbos", c1=["Cortar rente ao solo,", "antes de dar semente"], c2=["Cortar não chega: arrancar", "com a parte subterrânea"], corte="corte", riz="rizoma", bol="bolbos", raiz="raiz"),
         "en": dict(an="Annual", an2="short roots", pe="Perennial", pe2="rhizome and bulbs", c1=["Cut level with the soil,", "before it sets seed"], c2=["Cutting is not enough: pull", "it with its underground part"], corte="cut", riz="rhizome", bol="bulbs", raiz="root")}[L]
    o = [f'<rect y="170" width="600" height="230" fill="{ARG}"/><path d="M0 170h600" stroke="{SOLO}" stroke-width="4"/><path d="M300 70V400" stroke="#b08d64" stroke-width="2" stroke-dasharray="3 6"/>']
    o.append(f'<g fill="none" stroke="{VERDE}" stroke-width="5" stroke-linecap="round"><path d="M150 170c0-30 0-52-4-84M150 134c-20-7-32-22-34-38M150 116c18-5 30-20 32-36"/></g>'
             f'<g fill="#6f9a4a"><ellipse cx="116" cy="92" rx="12" ry="7" transform="rotate(-40 116 92)"/><ellipse cx="184" cy="76" rx="12" ry="7" transform="rotate(40 184 76)"/></g>')
    o.append('<g fill="none" stroke="#f1efe3" stroke-width="3.5" stroke-linecap="round"><path d="M150 170c-6 12-12 22-20 28M150 170c0 16 0 28 2 38M150 170c8 10 14 20 24 26"/></g>')
    o.append(f'<path d="M92 170h116" stroke="{VERM}" stroke-width="3" stroke-dasharray="6 5"/>')
    o.append(guia(214, 176, 226, 140, VERM) + t(230, 138, S["corte"], 14, 700, VERM, "start"))
    o.append(guia(172, 196, 196, 220, "#fff") + t(202, 226, S["raiz"], 14, 600, "#fff", "start"))
    o.append(f'<g fill="none" stroke="{VERDE}" stroke-width="5" stroke-linecap="round"><path d="M420 170c0-28 0-50-3-84M420 134c-20-7-32-20-34-36M420 118c16-5 28-16 30-32"/></g>'
             f'<g fill="#6f9a4a"><ellipse cx="388" cy="100" rx="11" ry="6" transform="rotate(-40 388 100)"/><ellipse cx="450" cy="88" rx="11" ry="6" transform="rotate(40 450 88)"/></g>')
    o.append('<path d="M326 226c40 6 70-12 100-6s70 18 130 6" fill="none" stroke="#f1efe3" stroke-width="7" stroke-linecap="round"/>')
    o.append(f'<g fill="none" stroke="{VERDE}" stroke-width="4" stroke-linecap="round"><path d="M356 223c2-14 2-24 0-34M496 224c-2-12-2-22 0-30M546 230c0-10 0-18-2-26"/></g>')
    o.append('<g fill="#f1efe3"><ellipse cx="346" cy="262" rx="12" ry="9"/><ellipse cx="476" cy="266" rx="12" ry="9"/><ellipse cx="548" cy="254" rx="10" ry="8"/></g><path d="M426 220v32M356 223v24M496 224v34M546 230v18" stroke="#f1efe3" stroke-width="3"/>')
    o.append(f'<path d="M326 170h244" stroke="{VERM}" stroke-width="3" stroke-dasharray="6 5"/>')
    o.append(guia(398, 224, 398, 286, "#fff") + t(398, 304, S["riz"], 14, 600, "#fff") + guia(476, 276, 500, 296, "#fff") + t(512, 308, S["bol"], 14, 600, "#fff"))
    o.append(t(150, 30, S["an"], 22, 700, INK) + t(150, 52, S["an2"], 14, 400, MUTE) + t(450, 30, S["pe"], 22, 700, INK) + t(450, 52, S["pe2"], 14, 400, MUTE))
    o.append(certo(40, 350, 15) + linhas(66, 346, S["c1"], 14, 600, "#fff", "start", 18))
    o.append(errado(330, 350, 15) + linhas(356, 346, S["c2"], 14, 600, "#fff", "start", 18))
    return svg("".join(o))


# 4 ───────────────────────────────────────────────────────── quando lavrar
def lavoura(L):
    S = {"pt": dict(tit="Quando mexer na terra", leg=[("Mexer", VERDE), ("Evitar: solo encharcado", "#9cc2e0"), ("Evitar: calor", "#e8b25a")], pa="uma pá", pa2="de profundidade", palha="cobrir logo com palha"),
         "en": dict(tit="When to work the soil", leg=[("Work it", VERDE), ("Avoid: waterlogged soil", "#9cc2e0"), ("Avoid: heat", "#e8b25a")], pa="one spade", pa2="deep", palha="cover with straw at once")}[L]
    meses = [("J", "#9cc2e0"), ("F", "#9cc2e0"), ("M", "#6f9a4a"), ("A", "#e6e1cf"), ("M", "#e6e1cf"), ("J", "#e8b25a"), ("J", "#e8b25a"), ("A", "#e8b25a"), ("S", "#e6e1cf"), ("O", "#6f9a4a"), ("N", "#6f9a4a"), ("D", "#9cc2e0")]
    o = [t(300, 32, S["tit"], 21, 700, INK)]
    for i, (m, c) in enumerate(meses):
        x = 36 + i * 46
        o.append(f'<rect x="{x}" y="52" width="42" height="52" rx="8" fill="{c}"/>' + t(x + 21, 85, m, 19, 700, "#fff" if c == "#6f9a4a" else INK))
    for i, (txt, cor) in enumerate(S["leg"]):
        x = 36 + i * 188
        o.append(f'<rect x="{x}" y="120" width="14" height="14" rx="3" fill="{cor}"/>' + t(x + 22, 132, txt, 14, 600, MUTE, "start"))
    o.append(f'<rect x="30" y="184" width="540" height="196" rx="14" fill="{ARG}"/><rect x="30" y="184" width="540" height="40" rx="14" fill="{SOLO}"/><path d="M60 226h500M60 290h500" stroke="#b08d64" stroke-width="2" stroke-dasharray="3 6"/>')
    o.append(f'<g stroke-linejoin="round" stroke-linecap="round"><path d="M200 152v46" stroke="#6a4b2c" stroke-width="10"/><path d="M184 152h32" stroke="#6a4b2c" stroke-width="9"/><path d="M178 198h44v46c0 14-10 24-22 30-12-6-22-16-22-30z" fill="#6a746e"/><path d="M244 198v76M236 206l8-8 8 8M236 266l8 8 8-8" fill="none" stroke="{INK}" stroke-width="3"/></g>')
    o.append(t(262, 232, S["pa"], 15, 700, INK, "start") + t(262, 252, S["pa2"], 15, 400, INK, "start"))
    o.append('<g stroke="#e0b94a" stroke-width="5" stroke-linecap="round"><path d="M360 182l22-8M386 184l24-6M414 182l22-8M440 184l24-6M470 182l24-8M500 184l22-6"/><path d="M370 192l24-6M400 194l24-6M430 192l24-6M460 194l24-6M490 192l24-6"/></g>')
    o.append(t(430, 292, S["palha"], 15, 600, "#fff") + certo(300, 340, 17))
    return svg("".join(o))


# 5 ───────────────────────────────────────────────────────── sementeira direta
def sementeira(L):
    S = {"pt": dict(tit="Profundidade de sementeira", f="profundidade = 2 a 3 vezes o diâmetro", s=["semente pequena", "semente média", "semente grande"]),
         "en": dict(tit="Sowing depth", f="depth = 2 to 3 times the diameter", s=["small seed", "medium seed", "large seed"])}[L]
    o = [t(300, 32, S["tit"], 21, 700, INK), f'<rect y="110" width="600" height="290" fill="{ARG}"/><rect y="110" width="600" height="12" fill="{SOLO}"/><path d="M0 110h600" stroke="#6a4b2c" stroke-width="3"/>']
    for cx, r, prof in ((110, 9, 34), (300, 15, 60), (490, 22, 90)):
        cy = 122 + prof
        o.append(f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="#6a4b2c"/>')
        o.append(f'<path d="M{cx-r} {cy+r+12}h{2*r}M{cx-r} {cy+r+6}v12M{cx+r} {cy+r+6}v12" fill="none" stroke="#f1efe3" stroke-width="2.5"/>' + t(cx, cy + r + 34, "Ø", 15, 700, "#f1efe3"))
        o.append(f'<path d="M{cx+r+22} 126V{cy-r+2}" stroke="{INK}" stroke-width="2.5"/><path d="M{cx+r+17} 134l5-8 5 8M{cx+r+17} {cy-r-6}l5 8 5-8" fill="none" stroke="{INK}" stroke-width="2.5" stroke-linecap="round"/>')
    for cx, s in zip((110, 300, 490), S["s"]):
        o.append(t(cx, 340, s, 15, 600, "#fff"))
    o.append(f'<g fill="none" stroke="{VERDE}" stroke-width="5" stroke-linecap="round"><path d="M300 110v-50M300 90c-14-5-22-14-24-26M300 76c12-4 20-12 22-22"/></g><g fill="#6f9a4a"><ellipse cx="278" cy="64" rx="10" ry="6" transform="rotate(-40 278 64)"/><ellipse cx="322" cy="54" rx="10" ry="6" transform="rotate(40 322 54)"/></g>')
    o.append(f'<rect x="130" y="358" width="340" height="30" rx="15" fill="{INK}"/>' + t(300, 379, S["f"], 15, 700, "#fff"))
    return svg("".join(o))


# 6 ───────────────────────────────────────────────────────── composto à superfície
def composto_camada(L):
    S = {"pt": dict(ok=["Certo: camada fina", "de composto maduro"], no=["Errado: enterrado fundo,", "as raízes não chegam"], c="composto maduro", cm="1–3 cm", e="composto enterrado", solo="solo"),
         "en": dict(ok=["Right: a thin layer", "of mature compost"], no=["Wrong: buried deep,", "the roots do not reach it"], c="mature compost", cm="1–3 cm", e="buried compost", solo="soil")}[L]
    o = [f'<rect x="30" y="170" width="260" height="170" rx="12" fill="{ARG}"/><rect x="30" y="170" width="260" height="24" rx="8" fill="{SOLO2}"/>']
    o.append(planta(160, 170, 90))
    o.append(f'<path d="M262 170v24M255 170h14M255 194h14" stroke="{INK}" stroke-width="2.5" fill="none"/>' + t(250, 160, S["cm"], 15, 700, INK, "end"))
    o.append(guia(120, 256, 100, 196, "#fff") + t(126, 262, S["c"], 14, 600, "#fff", "start"))
    o.append(t(160, 322, S["solo"], 14, 400, "#f1efe3"))
    o.append(f'<rect x="310" y="170" width="260" height="170" rx="12" fill="{ARG}"/><path d="M310 182h260" stroke="{SOLO}" stroke-width="3"/>')
    o.append(f'<rect x="334" y="252" width="212" height="52" rx="10" fill="{SOLO2}"/>' + t(440, 284, S["e"], 14, 600, "#f1efe3"))
    o.append(seta(440, 196, 440, 244, VERM, 3))
    o.append(certo(160, 40, 17) + errado(440, 40, 17))
    o.append(linhas(160, 366, S["ok"], 14, 700, VERDE, "middle", 17) + linhas(440, 366, S["no"], 14, 700, VERM, "middle", 17))
    return svg("".join(o))


# 7 ───────────────────────────────────────────────────────── alternativas à esterilização
def alternativas(L):
    S = {"pt": dict(tit="Em vez de esterilizar o solo", n=["Rodar as culturas", "Cobrir o solo", "Juntar matéria orgânica", "Escolher variedades resistentes"]),
         "en": dict(tit="Instead of sterilising the soil", n=["Rotate the crops", "Cover the soil", "Add organic matter", "Choose resistant varieties"])}[L]
    o = [t(300, 30, S["tit"], 21, 700, INK)]
    fundos = ["#e4eadb", "#efe6cc", "#ecdfd2", "#e3edf2"]
    pos = [(30, 50), (310, 50), (30, 220), (310, 220)]
    for (x, y), f in zip(pos, fundos):
        o.append(f'<rect x="{x}" y="{y}" width="260" height="154" rx="18" fill="{f}"/>')
    # rotação
    o.append(f'<circle cx="160" cy="108" r="20" fill="#a66f50"/><circle cx="208" cy="148" r="20" fill="#e8b25a"/><circle cx="112" cy="148" r="20" fill="#6f9a4a"/>')
    o.append(f'<g fill="none" stroke="{INK}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M172 126l22 14M136 148h46M126 132l22-18"/></g>')
    # cobertura
    o.append(f'<rect x="350" y="120" width="180" height="44" rx="8" fill="{ARG}"/><rect x="350" y="106" width="180" height="20" rx="6" fill="{SOLO}"/><g stroke="#e0b94a" stroke-width="6" stroke-linecap="round"><path d="M360 100l28-9M394 102l28-9M428 100l28-9M462 102l28-9M492 100l30-9"/><path d="M376 90l24-7M414 88l24-7M452 90l24-7"/></g>')
    # matéria orgânica
    o.append(f'<path d="M96 348c0-40 30-70 64-76 34 6 64 36 64 76z" fill="{SOLO2}"/><g fill="none" stroke="#c9b189" stroke-width="4" stroke-linecap="round"><path d="M120 332c16-10 34-10 50 0M158 316c16-8 32-8 46 0"/></g><path d="M160 272c-3-16 4-28 18-34-2 16-8 28-18 34z" fill="{VERDE}"/>')
    # variedades resistentes
    o.append('<path d="M440 246l50 17v34c0 27-22 41-50 52-28-11-50-25-50-52v-34z" fill="#2f6f9e"/><path d="M416 304l17 19 31-37" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>')
    for (x, y), n in zip(pos, S["n"]):
        o.append(t(x + 130, y + 144, n, 15, 700, INK))
    return svg("".join(o))


# 8 ───────────────────────────────────────────────────────── chá de composto
def cha(L):
    S = {"pt": dict(a=("Chá de composto caseiro", ["varia de lote para lote"]), b=("Composto maduro à superfície", ["previsível e sem riscos"]), ou="em vez de", cm="1–3 cm"),
         "en": dict(a=("Home-made compost tea", ["varies from batch to batch"]), b=("Mature compost on the surface", ["predictable and safe"]), ou="instead of", cm="1–3 cm")}[L]
    o = []
    o.append(f'<path d="M80 110h120l-14 190c-1 12-10 20-22 20h-48c-12 0-21-8-22-20z" fill="#8a96a0"/><path d="M87 160h106l-10 140c-1 10-8 16-18 16h-50c-10 0-17-6-18-16z" fill="#8a5a3c"/><ellipse cx="140" cy="110" rx="60" ry="10" fill="#6a746e"/><g fill="#d9c7a3" opacity=".9"><circle cx="120" cy="140" r="7"/><circle cx="152" cy="130" r="10"/><circle cx="168" cy="152" r="6"/></g>')
    o.append(f'<g fill="none" stroke="{VERM}" stroke-width="3" stroke-dasharray="3 7" stroke-linecap="round"><path d="M110 92c-10-14 8-24 0-38M170 92c-10-14 8-24 0-38"/></g>')
    o.append(errado(140, 24, 15))
    o.append(seta(238, 214, 292, 214, MUTE, 3) + t(265, 196, S["ou"], 14, 600, MUTE))
    o.append(f'<rect x="330" y="230" width="240" height="120" rx="12" fill="{ARG}"/><rect x="330" y="214" width="240" height="22" rx="8" fill="{SOLO2}"/>')
    o.append(planta(450, 214, 90))
    o.append(f'<path d="M550 214v22M544 214h12M544 236h12" stroke="{INK}" stroke-width="2.5" fill="none"/>')
    o.append(certo(450, 24, 15))
    o.append(t(140, 352, S["a"][0], 15, 700, VERM) + linhas(140, 372, S["a"][1], 14, 400, MUTE))
    o.append(t(450, 372, S["b"][0], 15, 700, VERDE) + linhas(450, 391, S["b"][1], 14, 400, MUTE) if False else "")
    o.append(t(450, 370, S["b"][0], 15, 700, VERDE) + t(450, 390, S["b"][1][0], 14, 400, MUTE))
    return svg("".join(o))


# 9 ───────────────────────────────────────────────────────── caderno de campo
def caderno(L):
    S = {"pt": dict(cab="Canteiro", cols=["Chuva", "Rega", "Semeado", "Colhido"], tit="Um caderno simples", nota="uma linha por canteiro"),
         "en": dict(cab="Bed", cols=["Rain", "Watering", "Sown", "Harvested"], tit="A simple notebook", nota="one row per bed")}[L]
    o = [f'<rect x="64" y="22" width="480" height="356" rx="16" fill="#fffdf6" stroke="#d6cfba" stroke-width="3"/>']
    for y in (78, 134, 190, 246, 302):
        o.append(f'<circle cx="64" cy="{y}" r="9" fill="#8a96a0"/>')
    o.append(t(300, 56, S["tit"], 20, 700, INK))
    xs = [208, 296, 384, 472]
    o.append(t(120, 98, S["cab"], 13, 700, MUTE))
    for x, c in zip(xs, S["cols"]):
        o.append(t(x, 98, c, 13, 700, MUTE))
    o.append('<path d="M92 110h430" stroke="#d6cfba" stroke-width="3"/>')
    ic = {0: f'<path d="M0-8c-5 7-8 10-8 15a8 8 0 0 0 16 0c0-5-3-8-8-15z" transform="translate(0 6)" fill="none" stroke="{AZUL}" stroke-width="3.5"/>'}
    for r in range(3):
        y = 150 + r * 76
        o.append(f'<rect x="96" y="{y-26}" width="48" height="52" rx="10" fill="#e4eadb"/>' + t(120, y + 9, str(r + 1), 28, 700, INK))
        if r < 2: o.append(f'<path d="M92 {y+38}h430" stroke="#d6cfba" stroke-width="3"/>')
    marcas = [(0, 0, "chuva"), (0, 1, "rega"), (1, 0, "chuva"), (1, 2, "semear"), (2, 1, "rega"), (2, 3, "colher"), (0, 3, "colher"), (2, 0, "chuva")]
    for r, c, k in marcas:
        x, y = xs[c], 150 + r * 76
        if k == "chuva": o.append(f'<path d="M{x} {y-12}c-5 7-8 10-8 15a8 8 0 0 0 16 0c0-5-3-8-8-15z" fill="{AZUL}"/>')
        if k == "rega": o.append(f'<path d="M{x-12} {y-4}h22v10a4 4 0 0 1-4 4h-14a4 4 0 0 1-4-4zM{x+10} {y+1}l10-8" fill="none" stroke="{AZUL}" stroke-width="3" stroke-linecap="round"/>')
        if k == "semear": o.append(f'<path d="M{x} {y+12}v-20M{x} {y-2}c-9 0-14-5-14-12 9 0 14 5 14 12zM{x} {y+4}c8 0 12-4 12-10-8 0-12 4-12 10z" fill="none" stroke="{VERDE}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>')
        if k == "colher": o.append(certo(x, y, 14))
    o.append(t(300, 366, S["nota"], 13, 400, MUTE))
    return svg("".join(o))


ESQUEMAS = {
    "esquema-corte-poda": corte_poda, "esquema-enxertia": enxertia, "esquema-infestantes": infestantes, "esquema-lavoura": lavoura,
    "esquema-sementeira-direta": sementeira, "esquema-composto-camada": composto_camada, "esquema-alternativas-esterilizar": alternativas,
    "esquema-chaz-composto": cha, "esquema-caderno-campo": caderno,
}

if __name__ == "__main__":
    for nome, fn in ESQUEMAS.items():
        for L, suf in (("pt", ""), ("en", "-en")):
            (DEST / f"{nome}{suf}.svg").write_text(fn(L), encoding="utf-8")
    print(len(ESQUEMAS) * 2, "esquemas escritos em", DEST)

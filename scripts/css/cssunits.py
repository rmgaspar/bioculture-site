"""Leitura de CSS em unidades (regra simples ou regra dentro de @media/@supports), preservando a ordem.

Usado pelos scripts de consolidação: permite comparar regras entre ficheiros pelo seu conteúdo
normalizado e voltar a escrever o CSS sem alterar o significado de cada regra."""
import re


def units(css: str):
    """Lista de (contexto, seletor, corpo) pela ordem do ficheiro; @media aninhados ficam no contexto."""
    css = re.sub(r"/\*[\s\S]*?\*/", "", css)
    out = []

    def walk(text, ctx):
        pos = 0
        while True:
            op = text.find("{", pos)
            if op < 0:
                return
            head = text[pos:op].strip()
            depth, i = 1, op + 1
            while i < len(text) and depth:
                depth += {"{": 1, "}": -1}.get(text[i], 0)
                i += 1
            body = text[op + 1:i - 1]
            if head.startswith(("@media", "@supports", "@layer", "@container")):
                walk(body, ctx + (" ".join(head.split()),))
            else:
                out.append((ctx, " ".join(head.split()), body.strip()))
            pos = i

    walk(css, ())
    return out


def key(unit):
    ctx, sel, body = unit
    decl = ";".join(x.strip() for x in re.sub(r"\s+", " ", body).split(";") if x.strip())
    return (ctx, sel, decl)


def render(unit_list):
    lines = []
    for ctx, sel, body in unit_list:
        decls = [d.strip() for d in body.split(";") if d.strip()]
        inner = sel + " {\n" + "".join(f"    {d};\n" for d in decls) + "}"
        for c in reversed(ctx):
            inner = c + " {\n" + "\n".join("    " + l for l in inner.split("\n")) + "\n}"
        lines.append(inner)
    return "\n".join(lines) + "\n"


def dedupe_keep_last(unit_list):
    seen, out = set(), []
    for u in reversed(unit_list):
        k = key(u)
        if k in seen:
            continue
        seen.add(k)
        out.append(u)
    return list(reversed(out))

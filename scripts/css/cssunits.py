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


def remove_units(css: str, keys_to_remove: set) -> str:
    """Remove do texto original as regras cujas chaves estão em keys_to_remove, preservando comentários,
    formatação e tudo o resto. Blocos @media que fiquem vazios são retirados."""
    def strip(text, ctx):
        out, pos = [], 0
        while True:
            op = _next_brace(text, pos)
            if op < 0:
                out.append(text[pos:])
                return "".join(out)
            head_start = _head_start(text, pos, op)
            head = re.sub(r"/\*[\s\S]*?\*/", "", text[head_start:op]).strip()
            depth, i = 1, op + 1
            while i < len(text) and depth:
                depth += {"{": 1, "}": -1}.get(text[i], 0)
                i += 1
            body = text[op + 1:i - 1]
            out.append(text[pos:head_start])
            if head.startswith(("@media", "@supports", "@layer", "@container")):
                inner = strip(body, ctx + (" ".join(head.split()),))
                if re.sub(r"/\*[\s\S]*?\*/", "", inner).strip():
                    out.append(text[head_start:op + 1] + inner + "}")
            else:
                k = key((ctx, " ".join(head.split()), body.strip()))
                if k not in keys_to_remove:
                    out.append(text[head_start:i])
            pos = i

    def _next_brace(text, pos):
        # ignora chavetas dentro de comentários
        while True:
            op = text.find("{", pos)
            if op < 0:
                return -1
            c_open = text.rfind("/*", 0, op)
            c_close = text.rfind("*/", 0, op)
            if c_open > c_close:
                end = text.find("*/", op)
                pos = end + 2 if end >= 0 else len(text)
                continue
            return op

    def _head_start(text, pos, op):
        # o seletor começa depois do último fecho de comentário/regra antes da chaveta
        seg = text[pos:op]
        last = max(seg.rfind("*/") + 2 if seg.rfind("*/") >= 0 else 0, seg.rfind(";") + 1)
        lead = len(seg[last:]) - len(seg[last:].lstrip())
        return pos + last + lead

    cleaned = strip(css, ())
    cleaned = re.sub(r"\n[ \t]+(?=\n)", "\n", cleaned)
    return re.sub(r"\n{3,}", "\n\n", cleaned)

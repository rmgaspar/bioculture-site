#!/usr/bin/env python3
"""Traduz as notícias publicadas que ainda não têm as duas línguas (PT e EN).

Notícias em português recebem `en`; notícias cuja fonte está em inglês ficam com o
original em `en` e a tradução em `pt`. Usa o GitHub Models com o GITHUB_TOKEN da Action
(permissão `models: read`). Se o serviço falhar, não bloqueia nada: avisa e deixa as
notícias como estavam, para a execução seguinte tentar de novo.
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NEWS = ROOT / "data" / "noticias.json"
PROPOSALS = ROOT / "data" / "noticias_propostas.json"
CATALOG = "https://models.github.ai/catalog/models"
CHAT = "https://models.github.ai/inference/chat/completions"
PREFERRED = ("openai/gpt-4.1", "openai/gpt-4o", "openai/gpt-4.1-mini", "openai/gpt-4o-mini", "openai/gpt-5-mini")

EN_WORDS = {"the", "of", "and", "to", "in", "for", "is", "are", "with", "on", "that", "as", "by", "from", "this", "will", "has", "have"}
PT_WORDS = {"de", "da", "do", "das", "dos", "e", "em", "para", "que", "os", "as", "um", "uma", "com", "no", "na", "por", "se", "ao"}


def looks_english(text: str) -> bool:
    words = re.findall(r"[a-zà-ÿ]+", text.lower())
    en = sum(1 for w in words if w in EN_WORDS)
    pt = sum(1 for w in words if w in PT_WORDS)
    return en >= 2 and en > pt * 1.5


def call(url: str, token: str, payload: dict | None = None) -> str:
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
    }
    request = urllib.request.Request(url, data=json.dumps(payload).encode() if payload else None, headers=headers)
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            body = response.read().decode("utf-8", "replace")
            if not body.lstrip().startswith(("{", "[")):
                raise RuntimeError(f"resposta inesperada de {url} (HTTP {response.status}, {response.headers.get('content-type')}): {body[:200]!r}")
            return body
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"HTTP {error.code} em {url}: {error.read().decode('utf-8', 'replace')[:300]}") from error


def choose_model(token: str) -> str:
    available = {item.get("id") for item in json.loads(call(CATALOG, token))}
    for model in PREFERRED:
        if model in available:
            return model
    raise RuntimeError(f"nenhum dos modelos previstos está disponível ({sorted(x for x in available if x)[:8]}…)")


def translate(token: str, model: str, rows: list[dict], target: str) -> list[dict]:
    language = {"pt": "European Portuguese (Portugal)", "en": "English"}[target]
    payload = [{"id": str(i), "title": r["title"], "summary": r["summary"]} for i, r in enumerate(rows)]
    prompt = (
        f"Translate the title and summary of every item into {language}. They are news items for an environmental, "
        "biodiversity and agriculture website. Keep numbers, units, proper names, acronyms and scientific names. "
        "Natural, concise, no commentary. Return only a JSON array of objects with the same id and the fields title and summary.\n"
        + json.dumps(payload, ensure_ascii=False)
    )
    body = json.loads(call(CHAT, token, {"model": model, "temperature": 0.1, "messages": [{"role": "user", "content": prompt}]}))
    content = re.sub(r"^```(?:json)?\s*|\s*```$", "", body["choices"][0]["message"]["content"].strip())
    by_id = {str(x["id"]): x for x in json.loads(content)}
    if len(by_id) != len(rows) or any(not by_id[str(i)].get("title") for i in range(len(rows))):
        raise RuntimeError("tradução incompleta")
    return [{"title": by_id[str(i)]["title"].strip(), "summary": (by_id[str(i)].get("summary") or "").strip()} for i in range(len(rows))]


def body(summary: str, item: dict, language: str) -> str:
    label = "Fonte original:" if language == "pt" else "Original source:"
    url = html.escape(item.get("url", ""), quote=True)
    return f"<p>{html.escape(summary)}</p><p><strong>{label}</strong> <a href=\"{url}\" rel=\"noopener noreferrer\">{html.escape(item.get('fonte', ''))}</a>.</p>"


def entry(title: str, summary: str, item: dict, language: str) -> dict:
    return {"titulo": title, "resumo_biocultura": summary, "corpo": body(summary, item, language)}


def pending(rows: list[dict]) -> list[dict]:
    """Notícias automáticas (sem curadoria bilingue) a que falta uma das línguas."""
    return [r for r in rows if r.get("pt") and not r.get("en")]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--file", default=str(NEWS))
    parser.add_argument("--batch-size", type=int, default=12)
    parser.add_argument("--probe", action="store_true", help="só verifica se o serviço responde")
    args = parser.parse_args()
    path = Path(args.file)
    token = os.environ.get("GITHUB_TOKEN", "")
    rows = json.loads(path.read_text(encoding="utf-8"))
    todo = pending(rows)
    print(f"{len(todo)} notícia(s) por traduzir em {path.name}.")
    if args.probe or todo:
        if not token:
            print("::warning::Sem GITHUB_TOKEN: tradução ignorada.")
            return 0
        try:
            model = choose_model(token)
        except Exception as error:
            print(f"::warning::Serviço de tradução indisponível: {error}")
            return 0
        print(f"Modelo: {model}")
    if args.probe or not todo:
        return 0

    done = 0
    for start in range(0, len(todo), args.batch_size):
        batch = todo[start : start + args.batch_size]
        groups = {"en": [], "pt": []}  # língua de destino
        for item in batch:
            pt = item["pt"]
            groups["pt" if looks_english(pt["titulo"] + " " + pt.get("resumo_biocultura", "")) else "en"].append(item)
        try:
            for target, items in groups.items():
                if not items:
                    continue
                source = [{"title": i["pt"]["titulo"], "summary": i["pt"].get("resumo_biocultura", "")} for i in items]
                translated = translate(token, model, source, target)
                for item, original, result in zip(items, source, translated):
                    if target == "en":
                        item["en"] = entry(result["title"], result["summary"], item, "en")
                    else:  # a fonte está em inglês: o original passa a `en` e a tradução a `pt`
                        item["en"] = entry(original["title"], original["summary"], item, "en")
                        item["pt"] = entry(result["title"], result["summary"], item, "pt")
                    item["idioma_original"] = "en" if target == "pt" else "pt"
                    done += 1
        except Exception as error:
            print(f"::warning::Tradução interrompida: {error}")
            break
        path.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{done}/{len(todo)} traduzidas")
        time.sleep(0.5)
    return 0


if __name__ == "__main__":
    sys.exit(main())

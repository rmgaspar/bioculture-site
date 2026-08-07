#!/usr/bin/env python3
import argparse
import json
import os
import re
import time
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup, Comment

ROOT = Path(__file__).resolve().parents[1]
LANGUAGES = {"en": "English"}
NATIONAL_PAGES = {"observatorio/observatorio-terra.html", "observatorio/vetores-pressao.html"}
IGNORED_HTML = {"generic.html", "elements.html", "sidebar.html", "observario.html", "suporte.html", "servicos/bioenergia.html"}
IGNORED_KEYS = {
    "id", "key", "slug", "imagem", "image", "logo", "url", "href", "lat", "lon", "latitude", "longitude",
    "nome_cientifico", "scientific_name", "fonte", "fonte_original", "url_fonte_original", "publicado_em", "capturado_em",
}
URL_RE = re.compile(r"^(?:https?://|/|[\w.-]+\.(?:jpg|jpeg|png|webp|svg))", re.I)
LETTER_RE = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿ]")

def clean(value):
    return re.sub(r"\s+", " ", str(value)).strip()

def eligible(value, key=""):
    value = clean(value)
    if not value or len(value) < 2 or key.lower() in IGNORED_KEYS or URL_RE.match(value):
        return False
    if not LETTER_RE.search(value) or value in {"true", "false", "null", "-"}:
        return False
    return "<" not in value and ">" not in value

def collect_json(value, output, key=""):
    if isinstance(value, dict):
        for child_key, child in value.items():
            collect_json(child, output, child_key)
    elif isinstance(value, list):
        for child in value:
            collect_json(child, output, key)
    elif isinstance(value, str) and eligible(value, key):
        output.add(clean(value))

def collect_html(path, output):
    soup = BeautifulSoup(path.read_text(encoding="utf-8"), "html.parser")
    for script in soup.find_all("script"):
        source = script.get_text(" ")
        for match in re.finditer(r'''(?s)(["'`])((?:\\.|(?!\1).)*?)\1''', source):
            text = clean(match.group(2))
            if (" " in text or re.search(r"[À-ÖØ-öø-ÿ]", text)) and not text.startswith((".", "#", "[")):
                if not any(token in text for token in ("${", "=>", "{", "}", ";", "=")) and eligible(text):
                    output.add(text)
    for tag in soup(["script", "style", "code", "pre"]):
        tag.decompose()
    for node in soup.find_all(string=True):
        if isinstance(node, Comment) or node.parent.find_parent(attrs={"data-no-translate": True}):
            continue
        text = clean(node)
        if eligible(text): output.add(text)
    for tag in soup.find_all(True):
        for attr in ("placeholder", "title", "aria-label"):
            if tag.has_attr(attr) and eligible(tag[attr]): output.add(clean(tag[attr]))

def collect_all():
    strings = set()
    for path in ROOT.rglob("*.html"):
        rel = path.relative_to(ROOT).as_posix()
        if rel in NATIONAL_PAGES or rel in IGNORED_HTML or rel.startswith("backups/"): continue
        collect_html(path, strings)
    for path in (ROOT / "data").glob("*.json"):
        if path.name in {"observatorio_terra.json", "pressao_vetores.json", "noticias.json", "noticias_arquivo.json"}: continue
        try: collect_json(json.loads(path.read_text(encoding="utf-8")), strings)
        except Exception: pass
    return sorted(strings)

def translate_batch(token, language, batch, model):
    items = [{"id": str(i), "text": text} for i, text in enumerate(batch)]
    prompt = (
        f"Translate every item from European Portuguese into {LANGUAGES[language]}. "
        "This is an environmental, biodiversity and organic-agriculture website. Preserve numbers, units, proper place names, "
        "scientific names and punctuation. Use clear, natural language. Return only a JSON array with the same id and a target field.\n"
        + json.dumps(items, ensure_ascii=False)
    )
    payload = json.dumps({"model": model, "temperature": 0.1, "messages": [{"role": "user", "content": prompt}]}).encode()
    request = urllib.request.Request("https://models.github.ai/inference/chat/completions", data=payload, headers={
        "Authorization": f"Bearer {token}", "Content-Type": "application/json", "Accept": "application/vnd.github+json"
    })
    with urllib.request.urlopen(request, timeout=120) as response:
        content = json.loads(response.read())["choices"][0]["message"]["content"].strip()
    content = re.sub(r"^```(?:json)?\s*|\s*```$", "", content)
    translated = json.loads(content)
    by_id = {str(item["id"]): clean(item["target"]) for item in translated}
    if len(by_id) != len(batch): raise RuntimeError("Incomplete translation batch")
    return [by_id[str(i)] for i in range(len(batch))]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--language", choices=LANGUAGES, required=True)
    parser.add_argument("--max-items", type=int, default=600)
    parser.add_argument("--batch-size", type=int, default=20)
    parser.add_argument("--model", default="openai/gpt-4.1-mini")
    args = parser.parse_args()
    token = os.environ.get("GITHUB_TOKEN")
    if not token: raise SystemExit("GITHUB_TOKEN is required")
    target = ROOT / "assets" / "lang" / "auto" / f"{args.language}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    catalog = json.loads(target.read_text(encoding="utf-8")) if target.exists() else {}
    all_strings = collect_all()
    missing = [text for text in all_strings if text not in catalog][:args.max_items]
    for start in range(0, len(missing), args.batch_size):
        batch = missing[start:start + args.batch_size]
        results = translate_batch(token, args.language, batch, args.model)
        catalog.update(dict(zip(batch, results)))
        target.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{args.language}: {min(start + len(batch), len(missing))}/{len(missing)} translated")
        time.sleep(0.4)
    remaining = max(0, len(all_strings) - len(catalog))
    print(json.dumps({"language": args.language, "catalog": len(catalog), "remaining": remaining}))

if __name__ == "__main__": main()

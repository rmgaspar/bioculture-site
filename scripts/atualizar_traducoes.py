#!/usr/bin/env python3
import argparse
import json
import os
import re
import time
import urllib.error
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup, Comment

ROOT = Path(__file__).resolve().parents[1]
LANGUAGES = {"en": "English"}
NATIONAL_PAGES = {"observatorio/observatorio-terra.html", "observatorio/vetores-pressao.html"}
IGNORED_HTML = {"servicos/bioenergia.html"}
URL_RE = re.compile(r"^(?:https?://|/|[\w.-]+\.(?:jpg|jpeg|png|webp|svg))", re.I)
LETTER_RE = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿ]")


def clean(value):
    return re.sub(r"\s+", " ", str(value)).strip()


def eligible(value):
    value = clean(value)
    if not value or len(value) < 2 or URL_RE.match(value):
        return False
    if not LETTER_RE.search(value) or value in {"true", "false", "null", "-"}:
        return False
    return "<" not in value and ">" not in value


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
        if eligible(text):
            output.add(text)
    for tag in soup.find_all(True):
        for attr in ("placeholder", "title", "aria-label"):
            if tag.has_attr(attr) and eligible(tag[attr]):
                output.add(clean(tag[attr]))


def collect_editorial():
    strings = set()
    for path in ROOT.rglob("*.html"):
        rel = path.relative_to(ROOT).as_posix()
        if rel in NATIONAL_PAGES or rel in IGNORED_HTML or rel.startswith("backups/"):
            continue
        collect_html(path, strings)
    return sorted(strings)


MODEL = "claude-haiku-4-5-20251001"


def anthropic(prompt, key):
    payload = json.dumps({"model": MODEL, "max_tokens": 8000, "temperature": 0.1, "messages": [{"role": "user", "content": prompt}]}).encode()
    request = urllib.request.Request(
        "https://api.anthropic.com/v1/messages", data=payload,
        headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            return json.loads(response.read())["content"][0]["text"]
    except urllib.error.HTTPError as error:
        raise RuntimeError(f"Anthropic devolveu HTTP {error.code}: {error.read().decode('utf-8', errors='replace')[:300]}") from error


def translate_batch(key, language, batch):
    items = [{"id": str(i), "text": text} for i, text in enumerate(batch)]
    prompt = (
        f"Translate every item from European Portuguese into {LANGUAGES[language]}. "
        "This is an environmental, biodiversity and organic-agriculture website. Preserve numbers, units, proper place names, "
        "scientific names and punctuation. Use clear, natural language. Return only a JSON array with the same id and a target field.\n"
        + json.dumps(items, ensure_ascii=False)
    )
    content = anthropic(prompt, key).strip()
    content = re.sub(r"^```(?:json)?\s*|\s*```$", "", content)
    translated = json.loads(content)
    by_id = {str(item["id"]): clean(item["target"]) for item in translated}
    if len(by_id) != len(batch):
        raise RuntimeError("Incomplete translation batch")
    return [by_id[str(i)] for i in range(len(batch))]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--language", choices=LANGUAGES, required=True)
    parser.add_argument("--max-items", type=int, default=1500)
    parser.add_argument("--batch-size", type=int, default=40)
    args = parser.parse_args()
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        print("::warning::Falta o segredo ANTHROPIC_API_KEY do repositório: tradução do site ignorada.")
        return
    target = ROOT / "assets" / "lang" / "auto" / f"{args.language}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    catalog = json.loads(target.read_text(encoding="utf-8")) if target.exists() else {}
    all_strings = collect_editorial()
    missing = [text for text in all_strings if text not in catalog][: args.max_items]
    for start in range(0, len(missing), args.batch_size):
        batch = missing[start : start + args.batch_size]
        results = translate_batch(key, args.language, batch)
        catalog.update(dict(zip(batch, results)))
        target.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{args.language}: {min(start + len(batch), len(missing))}/{len(missing)} translated")
        time.sleep(0.4)
    remaining = len([text for text in all_strings if text not in catalog])
    print(json.dumps({"language": args.language, "editorial_total": len(all_strings), "catalog": len(catalog), "remaining": remaining}))


if __name__ == "__main__":
    main()

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
IGNORED_HTML = {"generic.html", "elements.html", "sidebar.html", "observario.html", "suporte.html", "servicos/bioenergia.html"}
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


def github_request(url, token, data=None):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2026-03-10",
    }
    request = urllib.request.Request(url, data=data, headers=headers)
    try:
        return urllib.request.urlopen(request, timeout=120)
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"GitHub Models devolveu HTTP {error.code}: {detail}") from error


def choose_model(token):
    url = "https://models.github.ai/catalog/models?api-version=2026-03-10"
    with github_request(url, token) as response:
        catalog = json.loads(response.read())
    available = {item.get("id") for item in catalog}
    preferred = (
        "openai/gpt-5-mini",
        "openai/gpt-5",
        "openai/gpt-4.1",
        "openai/gpt-4o-mini",
        "openai/gpt-4o",
    )
    for model in preferred:
        if model in available:
            print(f"Modelo selecionado automaticamente: {model}")
            return model
    compatible = [
        item.get("id") for item in catalog
        if item.get("id") and "text" in item.get("supported_input_modalities", ["text"])
        and "text" in item.get("supported_output_modalities", ["text"])
    ]
    if not compatible:
        raise RuntimeError("A conta não apresenta nenhum modelo de texto disponível no GitHub Models.")
    print(f"Modelo selecionado automaticamente: {compatible[0]}")
    return compatible[0]


def translate_batch(token, language, batch, model):
    items = [{"id": str(i), "text": text} for i, text in enumerate(batch)]
    prompt = (
        f"Translate every item from European Portuguese into {LANGUAGES[language]}. "
        "This is an environmental, biodiversity and organic-agriculture website. Preserve numbers, units, proper place names, "
        "scientific names and punctuation. Use clear, natural language. Return only a JSON array with the same id and a target field.\n"
        + json.dumps(items, ensure_ascii=False)
    )
    payload = json.dumps({"model": model, "temperature": 0.1, "messages": [{"role": "user", "content": prompt}]}).encode()
    url = "https://models.github.ai/inference/chat/completions?api-version=2026-03-10"
    with github_request(url, token, payload) as response:
        content = json.loads(response.read())["choices"][0]["message"]["content"].strip()
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
    parser.add_argument("--model", default="auto")
    args = parser.parse_args()
    token = os.environ.get("GITHUB_TOKEN")
    if not token:
        raise SystemExit("GITHUB_TOKEN is required")
    if args.model == "auto":
        args.model = choose_model(token)
    target = ROOT / "assets" / "lang" / "auto" / f"{args.language}.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    catalog = json.loads(target.read_text(encoding="utf-8")) if target.exists() else {}
    all_strings = collect_editorial()
    missing = [text for text in all_strings if text not in catalog][: args.max_items]
    for start in range(0, len(missing), args.batch_size):
        batch = missing[start : start + args.batch_size]
        results = translate_batch(token, args.language, batch, args.model)
        catalog.update(dict(zip(batch, results)))
        target.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"{args.language}: {min(start + len(batch), len(missing))}/{len(missing)} translated")
        time.sleep(0.4)
    remaining = len([text for text in all_strings if text not in catalog])
    print(json.dumps({"language": args.language, "editorial_total": len(all_strings), "catalog": len(catalog), "remaining": remaining}))


if __name__ == "__main__":
    main()

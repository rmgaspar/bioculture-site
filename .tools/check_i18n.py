#!/usr/bin/env python3
from pathlib import Path
import re
import json

ROOT = Path(".")
EXCLUDE = {
    "observatorio/observatorio-terra.html",
    "observatorio/vetores-pressao.html",
}

def norm_rel(path: Path) -> str:
    return path.as_posix().lstrip("./")

def has_runtime(html: str) -> bool:
    return "biocultura-i18n-runtime.js" in html

def has_lang_selector(html: str) -> bool:
    return 'id="lang-selector"' in html or "id=&quot;lang-selector&quot;" in html

def has_selected_lang_read(html: str) -> bool:
    return "selected_lang" in html

def is_translation_page(path: Path) -> bool:
    rel = norm_rel(path)
    return rel.endswith(".html") and rel not in EXCLUDE

report = []

for p in sorted(ROOT.rglob("*.html")):
    rel = norm_rel(p)
    if rel in EXCLUDE:
        continue
    html = p.read_text(encoding="utf-8", errors="ignore")
    report.append({
        "file": rel,
        "runtime": has_runtime(html),
        "langSelector": has_lang_selector(html),
        "selectedLangRefs": html.count("selected_lang"),
        "isTranslationPage": is_translation_page(p),
    })

missing_runtime = [r["file"] for r in report if r["isTranslationPage"] and not r["runtime"]]
missing_selector = [r["file"] for r in report if r["isTranslationPage"] and not r["langSelector"]]
low_selected_refs = [r["file"] for r in report if r["isTranslationPage"] and r["selectedLangRefs"] < 1]

print("=== PAGES WITHOUT i18n RUNTIME ===")
print("\n".join(missing_runtime) or "None")

print("\n=== PAGES WITHOUT lang-selector ===")
print("\n".join(missing_selector) or "None")

print("\n=== PAGES WITH NO selected_lang REFERENCES ===")
print("\n".join(low_selected_refs) or "None")

print("\n=== SUMMARY ===")
print(json.dumps({
    "pages": len(report),
    "missingRuntime": len(missing_runtime),
    "missingSelector": len(missing_selector),
    "lowSelectedLangRefs": len(low_selected_refs),
}, ensure_ascii=False, indent=2))

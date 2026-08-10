# merge_page_into_jsons.py
import json
import os

PAGE_FILE = "index.extracted.json"
PT_FILE = "assets/lang/pt.json"
EN_FILE = "assets/lang/en.json"

def load_json(path):
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def deep_merge(target, source):
    for key, value in source.items():
        if isinstance(value, dict) and isinstance(target.get(key), dict):
            deep_merge(target[key], value)
        else:
            target[key] = value
    return target

def main():
    page = load_json(PAGE_FILE)
    if "index" not in page:
        raise SystemExit("index.extracted.json não contém a chave 'index'.")

    index_block = page["index"]

    pt = load_json(PT_FILE)
    pt.setdefault("index", {})
    deep_merge(pt["index"], index_block)
    save_json(PT_FILE, pt)

    en = load_json(EN_FILE)
    en.setdefault("index", {})
    deep_merge(en["index"], index_block)
    save_json(EN_FILE, en)

    print(f"Moved index content into {PT_FILE} and {EN_FILE}")

if __name__ == "__main__":
    main()

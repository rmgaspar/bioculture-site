# merge_index_into_jsons.py
import json
import os

INDEX_FILE = "index.extracted.json"
PT_FILE = "assets/lang/pt.json"
EN_FILE = "assets/lang/en.json"

def deep_merge(target, source):
    for key, value in source.items():
        if (
            key in target
            and isinstance(target[key], dict)
            and isinstance(value, dict)
        ):
            deep_merge(target[key], value)
        else:
            target[key] = value
    return target

def load_json(path):
    if not os.path.exists(path):
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_json(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def main():
    index_data = load_json(INDEX_FILE)

    pt = load_json(PT_FILE)
    pt = deep_merge(pt, index_data)
    save_json(PT_FILE, pt)

    en = load_json(EN_FILE)
    # mantém o en.json intacto por agora
    save_json(EN_FILE, en)

    print(f"Merged index into {PT_FILE}")
    print(f"Kept {EN_FILE} unchanged")

if __name__ == "__main__":
    main()

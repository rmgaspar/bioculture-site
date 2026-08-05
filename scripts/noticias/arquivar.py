#!/usr/bin/env python3
"""Retira da listagem as notícias expiradas, preservando-as num arquivo."""

import datetime as dt
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ACTIVE_PATH = ROOT / "data" / "noticias.json"
ARCHIVE_PATH = ROOT / "data" / "noticias_arquivo.json"


def main() -> int:
    today = dt.date.today()
    active = json.loads(ACTIVE_PATH.read_text(encoding="utf-8"))
    archive = json.loads(ARCHIVE_PATH.read_text(encoding="utf-8")) if ARCHIVE_PATH.exists() else []
    keep, expired = [], []
    archived_ids = {item.get("id") for item in archive}
    for item in active:
        expiry = item.get("expira_em")
        should_archive = False
        if expiry and not item.get("permanente", False):
            try:
                should_archive = dt.date.fromisoformat(expiry) < today
            except ValueError:
                pass
        if should_archive:
            item["estado"] = "arquivada"
            if item.get("id") not in archived_ids:
                expired.append(item)
        else:
            keep.append(item)
    if not expired:
        print("Nenhuma notícia expirou.")
        return 0
    ACTIVE_PATH.write_text(json.dumps(keep, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    ARCHIVE_PATH.write_text(json.dumps(expired + archive, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{len(expired)} notícia(s) movida(s) para o arquivo.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

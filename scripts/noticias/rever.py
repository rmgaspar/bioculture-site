#!/usr/bin/env python3
"""Move uma proposta editorial para publicação ou para o registo de recusas."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROPOSALS = ROOT / "data" / "noticias_propostas.json"
PUBLISHED = ROOT / "data" / "noticias.json"
REJECTED = ROOT / "data" / "noticias_rejeitadas.json"


def read(path: Path) -> list[dict]:
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else []


def write(path: Path, rows: list[dict]) -> None:
    path.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("aprovar", "recusar"))
    parser.add_argument("news_id")
    args = parser.parse_args()

    proposals = read(PROPOSALS)
    selected = next((row for row in proposals if row.get("id") == args.news_id), None)
    if not selected:
        raise SystemExit(f"Proposta não encontrada: {args.news_id}")

    proposals = [row for row in proposals if row.get("id") != args.news_id]
    write(PROPOSALS, proposals)

    if args.action == "aprovar":
        selected["estado"] = "publicada"
        published = [row for row in read(PUBLISHED) if row.get("id") != args.news_id]
        published.append(selected)
        published.sort(
            key=lambda row: (int(row.get("prioridade", row.get("relevancia", 0))), row.get("publicado_em", row.get("data", ""))),
            reverse=True,
        )
        write(PUBLISHED, published)
    else:
        rejected = read(REJECTED)
        rejected.insert(0, {"id": selected["id"], "url": selected["url"]})
        write(REJECTED, rejected)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

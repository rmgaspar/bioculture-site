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


def decide(action: str, news_id: str) -> bool:
    """Aplica uma decisão; devolve False se a proposta já não está na fila."""
    proposals = read(PROPOSALS)
    selected = next((row for row in proposals if row.get("id") == news_id), None)
    if not selected:
        return False

    write(PROPOSALS, [row for row in proposals if row.get("id") != news_id])

    if action == "aprovar":
        selected["estado"] = "publicada"
        published = [row for row in read(PUBLISHED) if row.get("id") != news_id]
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
    return True


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=("aprovar", "recusar", "lote"))
    parser.add_argument("news_id", help="identificador da notícia; em «lote», uma lista «id:aprovar,id:recusar»")
    args = parser.parse_args()

    if args.action != "lote":
        if not decide(args.action, args.news_id):
            raise SystemExit(f"Proposta não encontrada: {args.news_id}")
        return 0

    # Lote vindo da página de revisão: uma decisão repetida ou já tomada não bloqueia as restantes.
    done = skipped = 0
    for pair in args.news_id.split(","):
        news_id, _, action = pair.partition(":")
        if action not in ("aprovar", "recusar") or not news_id:
            raise SystemExit(f"Decisão inválida: {pair!r}")
        if decide(action, news_id):
            done += 1
            print(f"{action}: {news_id}")
        else:
            skipped += 1
            print(f"já não estava na fila: {news_id}")
    print(f"{done} decisão(ões) aplicada(s), {skipped} ignorada(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

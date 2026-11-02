#!/usr/bin/env python3
"""Tira dos ficheiros de dados os países de config/paises-excluidos.json (idempotente).

Corre-se depois de qualquer atualização feita à mão; os scripts de dados já aplicam o mesmo filtro ao escrever.
Uso: python3 scripts/dados/excluir_paises.py [--dry-run]
"""
import argparse

import comum
import excluidos


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    comum.SECO = ap.parse_args().dry_run
    mudou = []
    for nome in sorted(excluidos.FICHEIROS):
        if (comum.DADOS / nome).exists() and comum.escrever_se_mudou(nome, comum.ler(nome)):
            mudou.append(nome)
    print("Alterados:" if mudou else "Nada a retirar.", *mudou)


if __name__ == "__main__":
    main()

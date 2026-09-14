#!/usr/bin/env python3
"""Valida a base de pesquisa sem dependências externas."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def validar(root=ROOT):
    def read(name):
        return json.loads((root / name).read_text())

    def check(condition, message):
        if not condition:
            raise ValueError(message)

    def index(rows, label):
        check(isinstance(rows, list), f'{label}: deve ser uma lista')
        ids = [r['id'] for r in rows]
        check(all(isinstance(i, str) and re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', i) for i in ids), f'{label}: ID inválido')
        check(len(ids) == len(set(ids)), f'{label}: IDs repetidos')
        return set(ids)

    config = read('catalogo/config.json')
    check(config['versao'] == 1 and config['fase'] == 'pesquisa', 'A base suporta apenas a fase de pesquisa')
    check(config['catalogo_publico'] is False and config['vendas_ativas'] is False, 'Publicação e vendas devem estar desativadas')
    categories = index(read('catalogo/categorias.json'), 'categorias')
    sources = index(read('catalogo/fontes.json'), 'fontes')
    solutions = read('catalogo/solucoes.json')
    solution_ids = index(solutions, 'soluções')
    crop_ids = index(read('data/horticolas.json'), 'culturas')
    pest_ids = index(read('data/pragas.json'), 'pragas')
    for row in solutions:
        ident = row['id']
        check(row['categoria_id'] in categories, f'{ident}: categoria desconhecida')
        check(row['nome']['pt'] and 'en' in row['nome'], f'{ident}: nome em falta')
        check(row['tipo'] in ('pratica', 'solucao'), f'{ident}: tipo inválido')
        check(row['estado'] == 'rascunho', f'{ident}: apenas rascunhos nesta fase')
        check(row['prioridade_pesquisa'] in (1, 2), f'{ident}: prioridade inválida')
        check(set(row['culturas_ids']) <= crop_ids, f'{ident}: cultura desconhecida')
        check(set(row['pragas_ids']) <= pest_ids, f'{ident}: praga desconhecida')
        check(row['proveniencia'] in sources, f'{ident}: proveniência desconhecida')
        for field in ('evidencia', 'agricultura_biologica', 'autorizacao_portugal'):
            review = row[field]
            check(review['estado'] in ('por_verificar', 'em_revisao', 'verificado'), f'{ident}: estado de revisão inválido')
            check(set(review['fontes']) <= sources, f'{ident}: fonte desconhecida')
            if review['estado'] == 'verificado':
                check(review['fontes'] and row['data_verificacao'], f'{ident}: verificação sem fonte/data')
                check(all(s != 'conversa-inicial' for s in review['fontes']), f'{ident}: briefing não valida alegações')
    products = read('catalogo/produtos.json')
    index(products, 'produtos')
    template_keys = set(read('catalogo/modelos/produto.json'))
    for row in products:
        check(template_keys <= set(row), f"{row['id']}: campos do modelo em falta")
        check(row['solucao_id'] in solution_ids, f"{row['id']}: solução desconhecida")
        check(row['estado'] == 'rascunho' and row['publicado'] is False and row['venda_ativa'] is False, f"{row['id']}: produto ativo nesta fase")
        for field in ('embalagem', 'preco_referencia', 'dose'):
            value = row[field]['quantidade' if field == 'embalagem' else 'valor']
            check(value is None or (type(value) in (int, float) and value > 0), f"{row['id']}: {field} deve ser positivo ou null")
    return len(solutions), len(products)


if __name__ == '__main__':
    try:
        solutions, products = validar()
        print(f'Catálogo válido: {solutions} soluções em pesquisa; {products} produtos; vendas desativadas.')
    except (ValueError, KeyError, TypeError, OSError) as error:
        raise SystemExit(f'Catálogo inválido: {error}')

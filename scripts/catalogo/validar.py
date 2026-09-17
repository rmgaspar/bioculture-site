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
    check(isinstance(config['produtos_publico'], bool), 'produtos_publico deve ser booleano')
    categories = index(read('catalogo/categorias.json'), 'categorias')
    sources = index(read('catalogo/fontes.json'), 'fontes')
    solutions = read('catalogo/solucoes.json')
    solution_ids = index(solutions, 'soluções')
    crop_ids = set(read('data/horticolas_master.json').keys())
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

    def translated(value):
        return isinstance(value, dict) and bool(value.get('pt')) and bool(value.get('en'))

    published = 0
    for row in products:
        ident = row['id']
        check(template_keys <= set(row), f'{ident}: campos do modelo em falta')
        check(row['solucao_id'] in solution_ids, f'{ident}: solução desconhecida')
        check(row['estado'] in ('rascunho', 'revisto', 'publicado'), f'{ident}: estado inválido')
        check(isinstance(row['beneficios'], list), f'{ident}: beneficios deve ser uma lista')
        for beneficio in row['beneficios']:
            check(translated(beneficio), f'{ident}: benefício sem pt/en')
        if row['publicado']:
            check(row['estado'] != 'rascunho', f'{ident}: produto publicado não pode ficar em rascunho')
            check(translated(row['nome']), f'{ident}: nome em falta para publicação')
            check(translated(row['descricao_curta']), f'{ident}: descrição curta em falta para publicação')
            check(translated(row['descricao']), f'{ident}: descrição em falta para publicação')
            published += 1
        if row['venda_ativa']:
            check(row['publicado'], f'{ident}: só pode vender-se um produto publicado')
            preco = row['preco_referencia']
            check(isinstance(preco['valor'], (int, float)) and preco['valor'] > 0, f'{ident}: preço de referência em falta para venda ativa')
            check(bool(preco['moeda']), f'{ident}: moeda em falta para venda ativa')
            embalagem = row['embalagem']
            check(isinstance(embalagem['quantidade'], (int, float)) and embalagem['quantidade'] > 0 and bool(embalagem['unidade']),
                  f'{ident}: embalagem em falta para venda ativa')
        for field in ('embalagem', 'preco_referencia', 'dose'):
            value = row[field]['quantidade' if field == 'embalagem' else 'valor']
            check(value is None or (type(value) in (int, float) and value > 0), f'{ident}: {field} deve ser positivo ou null')
    return len(solutions), len(products), published


if __name__ == '__main__':
    try:
        solutions, products, published = validar()
        print(f'Catálogo válido: {solutions} soluções em pesquisa; {products} produtos ({published} publicados).')
    except (ValueError, KeyError, TypeError, OSError) as error:
        raise SystemExit(f'Catálogo inválido: {error}')

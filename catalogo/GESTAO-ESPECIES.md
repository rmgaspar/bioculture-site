# Prevenção e soluções nas fichas de espécies

A página `ecossistemas/especie-detalhe.html` usa os registos especializados de `data/pragas.json` e `data/flora_invasora.json`, dando-lhes prioridade sobre o inventário geral quando o ID ou o nome científico coincide.

As 57 fichas de pragas apresentam diagnóstico, prevenção e intervenção sem repetir o resumo inicial. As 111 fichas de invasoras apresentam também deteção, dispersão, segurança, resíduos, monitorização, restauro e fontes que já constavam do inventário. Isto melhora a apresentação; não constitui uma nova validação científica de todos os registos existentes.

## Orientações adicionais documentadas

`data/gestao-solucoes.json` contém oito perfis para nove fichas:

- Pulgões.
- Mosca-branca-do-tabaco e mosca-branca-das-estufas.
- Ácaro-rajado.
- Borboleta-branca-da-couve: o âmbito da referência adicional é Pieris rapae.
- Lesmas e caracóis.
- Acacia dealbata (mimosa).
- Carpobrotus edulis (chorão).
- Cortaderia selloana (erva-das-pampas).

Cada perfil tem alvos explícitos, contexto, passos, opções condicionais, avaliação, fontes e data de revisão. Os novos textos estão em português e inglês. As restantes fichas conservam os conteúdos do inventário e não recebem automaticamente um tratamento por pertencerem a um grupo semelhante.

As fontes estrangeiras sustentam orientações técnicas, não autorizações em Portugal. Não foram adicionados marcas, doses, preços, vendas ou alegações de certificação de produtos. Os IDs de soluções relacionam os temas com a base de pesquisa; o navegador não carrega a pasta `catalogo/`.

## Manutenção e verificação

Para acrescentar uma orientação, confirmar a espécie-alvo, documentar o âmbito da fonte e preencher ambos os idiomas. Não usar o nome de uma família para recomendar a mesma intervenção a todos os seus organismos.

Executar:

```sh
node scripts/validar-gestao.mjs
node scripts/tests/especie-detalhe.test.mjs
node scripts/build-pages.mjs
```

A validação de dados está integrada no build. Os testes cobrem a renderização das 168 fichas, prioridade dos dados especializados, ausência do suplemento opcional, escape de fontes e textos novos em inglês. A verificação visual no navegador não foi concluída: a ferramenta foi bloqueada pela revisão automática devido ao limite de utilização.

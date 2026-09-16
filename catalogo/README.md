# Preparação do catálogo bioCulture

Fase atual: **pesquisa**, mercado inicial Portugal. Esta pasta não é incluída no build de GitHub Pages. Existe um índice informativo em `services/produtos.html`, acessível pelo hub `services/services.html`. Não existem produtos comerciais publicados ou mecanismos de encomenda.

## Estrutura

- `config.json`: fase, idiomas, mercado e bloqueio de publicação/venda. `produtos_publico` liga/desliga a exportação de fichas de produto (independente do índice informativo das 40 soluções, que continua sempre ativo via `indice_informativo_publico`).
- `categorias.json`: sete famílias, com nomes PT/EN.
- `solucoes.json`: 40 temas de pesquisa provenientes da conversa inicial; não são produtos comerciais nem recomendações validadas. Prioridade 1 recupera os primeiros temas sugeridos nessa conversa, desdobrando calcário/dolomita e armadilhas/feromonas.
- `fontes.json`: proveniência e futuras fontes verificadas.
- `produtos.json`: lista inicialmente vazia; cada produto futuro referencia uma solução.
- `modelos/`: fichas para produto, fornecedor e cotação. Os exemplos não são dados reais.

## Publicar um produto com informação completa, ainda sem venda

O modelo `produtos.json` separa claramente conteúdo editorial (sempre seguro de publicar) de venda (só sai quando decidires):

- `publicado: true` mostra o produto no site — nome, descrição curta e longa, benefícios, modo de aplicação e imagem — com a etiqueta "Brevemente disponível", sem preço nem botão de encomenda.
- `venda_ativa: true` (só válido se `publicado` também for `true`) acrescenta o preço de `preco_referencia` e o botão "Contactar para encomendar". Exige `preco_referencia.valor`, `preco_referencia.moeda` e `embalagem` preenchidos.

Ou seja: para lançar um produto, preenche toda a ficha com `publicado: false`; quando quiseres mostrá-lo (mesmo sem vender), muda só `publicado` para `true`; quando estiver disponível para encomenda, muda `venda_ativa` para `true` e preenche o preço. Não é preciso tocar em mais nada. `scripts/catalogo/validar.py` obriga nome/descrições preenchidos antes de `publicado`, e preço/embalagem antes de `venda_ativa`.

Os campos `agricultura_biologica`, `autorizacao_portugal`, `documentos` e `fontes` nunca são exportados publicamente — servem só para o teu controlo interno de conformidade. Uma alegação de "biológico" ou "autorizado em Portugal" só deve aparecer no site depois de implementares esse texto deliberadamente, com a fonte à mão.

`null` significa desconhecido; listas vazias significam ainda não preenchidas. Os nomes das 40 soluções e das sete famílias estão disponíveis em português e inglês. A inclusão de um tema não confirma eficácia, certificação, autorização, disponibilidade ou interesse comercial. As avaliações por estrelas e os preços da conversa não foram importados como factos.

## Preencher a pesquisa

1. Escolher uma solução e procurar documentação do fabricante e fontes técnicas primárias.
2. Criar uma fonte com ID único, URL, título, entidade e data de consulta; associá-la à verificação relevante.
3. Preencher função, organismo/princípio ativo, riscos e evidência apenas com suporte documental. Registar culturas e pragas pelos IDs existentes em `data/horticolas.json` e `data/pragas.json`.
4. Criar uma ficha comercial copiando `modelos/produto.json` para a lista em `produtos.json`. A embalagem, formulação e referência identificam o produto concreto. Preencher também a descrição pública (`descricao_curta`, `descricao`, `beneficios`, `modo_aplicacao`, `imagem`) — ver "Publicar um produto" acima para quando ligar `publicado`/`venda_ativa`.
5. Registar a avaliação documental do produto concreto, incluindo usos, fontes e data. A avaliação de uma solução genérica não se transfere automaticamente para uma marca/formulação.
6. Executar `python3 scripts/catalogo/validar.py`. O build também executa este comando e interrompe-se se a validação falhar.

## Fornecedores e negociação

Guardar dados reais de fornecedores e cotações em `catalogo/local/`, pasta ignorada pelo Git e excluída do build. Copiar os modelos para essa pasta ao iniciar a pesquisa. Não guardar contactos privados, preços de compra ou margens em `data/` ou nos modelos versionados. Servir a raiz do repositório com um servidor HTTP expõe ficheiros locais; para uma pré-visualização partilhada, servir apenas `.pages-dist/`.

Para cada candidato, recolher: fabricante/distribuidor/revendedor, catálogo, condições de revenda, encomenda mínima, embalagem, preço e IVA, transporte, prazo de entrega, armazenamento, validade, rastreabilidade e documentação. Não há fornecedores selecionados nesta versão.

Comparar preços só após conhecer quantidade e unidade: converter g para kg ou ml para L; não converter volume em massa sem densidade. Separar preço público de referência e cotação de compra. Custos por aplicação exigem uma dose documentada e uma unidade de área/volume compatível; ficam por calcular nesta fase.

## Publicação futura

Os indicadores em JSON descrevem a fase, não constituem controlo de acesso por si só. O build usa uma lista explícita de pastas públicas e verifica que `catalogo/` não entrou no resultado. O exportador `scripts/catalogo/exportar-indice.mjs` gera `data/solucoes-catalogo.json` usando uma lista explícita de campos: para as 40 soluções em estudo, identificadores, nomes, famílias, estado de pesquisa e links para orientações públicas; para produtos com `publicado: true` em `produtos.json`, a ficha comercial-editorial (nome, descrições, benefícios, modo de aplicação, imagem e, só quando `venda_ativa: true`, preço). Nunca exporta fontes, documentos, dados de fornecedores, cotações ou notas internas de verificação.

Não existe carrinho de compras nem checkout: `venda_ativa` mostra um preço de referência e um botão que encaminha para `contactos.html`, não processa pagamentos. Implementar uma loja real (encomendas, stock, faturação) continua a exigir trabalho próprio; isto só liga/desliga o que é mostrado.

Validar produto a produto, completar traduções e rever preços antes de ligar `venda_ativa`. O índice informativo acompanha os nomes e famílias da base de pesquisa; as orientações técnicas e as fichas comerciais mantêm revisão própria.

## Hub de soluções naturais

- `services/services.html`: entrada para produtos e serviços.
- `services/produtos.html`: índice das soluções em estudo, com pesquisa, sete filtros de família e orientações relacionadas quando disponíveis.
- `services/servicos.html`: áreas de apoio de `data/services.json`, guias existentes e calculadora solar.

O sinalizador `indice_informativo_publico` permite este índice editorial das 40 soluções. `produtos_publico` permite, adicionalmente, a exportação de fichas de produto individuais publicadas em `produtos.json` — cada produto controla a sua própria visibilidade e venda com `publicado`/`venda_ativa`. `catalogo_publico` e `vendas_ativas` (globais) continuam a `false`: não existe um catálogo/loja de site inteiro, só produtos publicados um a um. O build gera novamente o índice; editar o ficheiro gerado diretamente não preserva alterações.

Os links antigos do hub com `#biofossa`, `#chuva`, `#solar` e `#solo` encaminham para os guias na página de serviços. O antigo `#agua` encaminha para a captação de chuva.

Verificação: `node scripts/tests/solutions-hub.test.mjs`. O teste cobre filtragem, PT/EN, campos públicos, relações e compatibilidade dos links. A inspeção visual continua pendente devido ao bloqueio anterior da ferramenta de navegador.

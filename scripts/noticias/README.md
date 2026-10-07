# Notícias com aprovação editorial

O processo consulta as fontes selecionadas às segundas e quintas-feiras
(`.github/workflows/propor-noticias.yml`). Cada sugestão fica em
`data/noticias_propostas.json`, que o site não carrega nas listagens, e nada é
publicado sem decisão humana.

**Decidir.** A página privada `/revisao` (fora dos motores de pesquisa) mostra as
propostas com imagem, resumo, pontuação e ligação para o original. Cada uma tem
**Aprovar** ou **Recusar**; carregando em «Aplicar decisões» a página dispara
`decidir-noticias.yml`, que move as aprovadas para `data/noticias.json` e guarda
as recusadas em `data/noticias_rejeitadas.json` (só o identificador e a ligação,
para não voltarem a ser propostas). Demora cerca de 2 minutos até o site
refletir. A página precisa de uma chave do GitHub só para este repositório
(permissão *Actions: Read and write*), guardada apenas no navegador de quem a
configura. Sempre que há propostas novas abre-se (ou recebe um comentário) uma
única issue «Notícias à espera de decisão» com a ligação para a página.

**Filtro.** `atualizar.py` só propõe o que tem ligação clara aos temas: palavras
inteiras (não pedaços de palavras), mínimo de termos por fonte (as generalistas,
como a RTP, pedem dois), secções de URL permitidas, títulos e fontes bloqueados
em `config/noticias_fontes.json` (desporto, ofertas de emprego…) e um máximo por
fonte e execução. `python3 scripts/noticias/atualizar.py --reavaliar` volta a
aplicar os critérios à fila existente e retira o que expirou.

Antes de aprovar, confirma sempre a ligação original, a data, o resumo, a
categoria e a pontuação. O processo não copia o artigo completo; usa a imagem da
fonte original e, só se não existir, uma imagem local da categoria.

Ao aprovar, o prazo da notícia nunca fica abaixo de 30 dias a contar do dia da
aprovação (o prazo original conta desde a publicação na fonte).

As fontes e os limites encontram-se em `config/noticias_fontes.json`. As fontes
primárias e científicas recebem maior autoridade editorial; jornalismo de
referência é usado para atualidade e contexto. Google News deixa de ser a via
normal sempre que existe um RSS/Atom direto e estável.

**Fontes.** A lista está organizada por organização: ONU (Notícias, PNUA, FAO, UNFCCC,
UNCCD, UNDRR), WMO, IPCC, IPBES, IUCN, IEA, IRENA, EEA, Copernicus, Comissão Europeia,
NASA, NOAA, ESA, Nature, Science e jornalismo de referência. Quando uma organização não
tem RSS, a pesquisa no Google Notícias restringe-se à secção de notícias do próprio site
(`site:wmo.int/news`); consultar só o domínio devolve páginas estáticas, circulares e
ofertas de emprego. A pontuação mínima é 60, porque notícias de organizações
internacionais sem menção a Portugal ficam por volta de 61.

Os organismos portugueses sem RSS (IPMA, APA, DGEG, DGADR) são lidos diretamente das
listagens de notícias dos próprios sites por `scripts/noticias/leitores_html.py`
(`"leitor"` em `config/noticias_fontes.json`). Dependem do HTML de cada site: se um
mudar e o leitor deixar de encontrar notícias, a fonte aparece como indisponível nos
registos da Action em vez de devolver resultados inventados. O ICNF está desativado
(`"ativa": false`): o site carrega as notícias por JavaScript e não tem RSS.

Quando uma fonte só existe como pesquisa no Google Notícias, a ligação que o
RSS devolve é uma página de redireccionamento, não o artigo — `atualizar.py`
resolve-a automaticamente para a publicação original antes de guardar a
proposta, para que "Abrir publicação original" abra sempre a notícia real.
Se a resolução falhar (fonte instável, formato alterado), a ligação do Google
é mantida sem interromper o resto do processo.

As notícias com prazo terminado saem das listagens e passam para
`data/noticias_arquivo.json`. As ligações antigas continuam acessíveis na página
de detalhe; o histórico não é apagado.

## Selo de tipo e «Continuar no bioCulture»

- Cada notícia tem `tipo_conteudo` (notícia, estudo, comunicado, opinião, explicador, observação da Terra…). Nas automáticas é atribuído em `content_type()` (`atualizar.py`) pela fonte e pelo título/URL (opinião e explicador); corrige à mão em `data/noticias.json` se for preciso. O selo aparece na página da notícia e nos cartões.
- A página da notícia mostra «Continuar no bioCulture»: páginas de leitura e de ação ligadas ao tema (`BioCultureNews.relatedPages` e `related()` no runtime). Para ligar um tema a novas páginas, edita `relatedPages`.
- Notícias de clima sem tema próprio recebem ações de **adaptação** (calor, seca, fogo, cheias, El Niño: cobrir o solo, agrofloresta, captar chuva) ou de **redução de emissões** (fotovoltaico, compostagem, energia consciente), escolhidas em `BioCultureNews.climateKind()` pelas palavras do título; as listas estão em `climateActions`.


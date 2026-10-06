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

As fontes e os limites encontram-se em `config/noticias_fontes.json`. As fontes
primárias e científicas recebem maior autoridade editorial; jornalismo de
referência é usado para atualidade e contexto. Google News deixa de ser a via
normal sempre que existe um RSS/Atom direto e estável.

Quando uma fonte só existe como pesquisa no Google Notícias, a ligação que o
RSS devolve é uma página de redireccionamento, não o artigo — `atualizar.py`
resolve-a automaticamente para a publicação original antes de guardar a
proposta, para que "Abrir publicação original" abra sempre a notícia real.
Se a resolução falhar (fonte instável, formato alterado), a ligação do Google
é mantida sem interromper o resto do processo.

As notícias com prazo terminado saem das listagens e passam para
`data/noticias_arquivo.json`. As ligações antigas continuam acessíveis na página
de detalhe; o histórico não é apagado.

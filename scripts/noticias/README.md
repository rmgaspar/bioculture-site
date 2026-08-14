# Notícias com aprovação editorial

O processo consulta fontes selecionadas duas vezes por dia. Cada sugestão fica
em `data/noticias_propostas.json`, que nunca é carregado pelo site, e abre uma
notificação individual no GitHub. O corpo visível da notificação contém apenas
a ligação original, para permitir a leitura integral na própria publicação.

Depois de ler, responder `/aprovar` ou `/recusar`. A primeira decisão move a
entrada para `data/noticias.json`; a segunda guarda apenas o identificador e a
ligação em `data/noticias_rejeitadas.json`, evitando que volte a ser proposta.

Antes de aprovar, confirme sempre a ligação original, a data, o resumo, a
categoria e a pontuação. O processo não copia o artigo completo e utiliza uma
imagem local da categoria, evitando cópia ou ligação direta a imagens editoriais.

As fontes e os limites encontram-se em `config/noticias_fontes.json`. As fontes
primárias e científicas recebem maior autoridade editorial; jornalismo de
referência é usado para atualidade e contexto. Google News deixa de ser a via
normal sempre que existe um RSS/Atom direto e estável.

As notícias com prazo terminado saem das listagens e passam para
`data/noticias_arquivo.json`. As ligações antigas continuam acessíveis na página
de detalhe; o histórico não é apagado.

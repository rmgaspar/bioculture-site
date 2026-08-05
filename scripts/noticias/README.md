# Notícias com aprovação editorial

O processo consulta fontes autorizadas duas vezes por dia e prepara no máximo
seis propostas. Nada é publicado diretamente: o GitHub cria um pedido chamado
“Notícias ambientais para aprovação”. Rever e integrar esse pedido constitui a
aprovação editorial e desencadeia a publicação normal do site.

Antes de aprovar, confirme sempre a ligação original, a data, o resumo, a
categoria e a pontuação. O processo não copia o artigo completo e utiliza uma
imagem local da categoria, evitando cópia ou ligação direta a imagens editoriais.

As fontes e os limites encontram-se em `config/noticias_fontes.json`. Uma fonte
nova deve disponibilizar RSS/Atom, ter autorização para redistribuir os seus
metadados e ser testada antes de ser marcada como ativa.

As notícias com prazo terminado saem das listagens e passam para
`data/noticias_arquivo.json`. As ligações antigas continuam acessíveis na página
de detalhe; o histórico não é apagado.

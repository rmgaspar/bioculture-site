import { readFileSync } from 'node:fs';

/* Estado dos atributos curados do mapa das consultas (Renováveis e território), partilhado pelo
   build e pelo teste: diz quais pertencem a consultas em curso, quais já encerraram (limpeza por
   fazer, não é erro) e quais não existem em lado nenhum (id errado — isso é erro). */
export function estadoDoMapa() {
  const z = JSON.parse(readFileSync('data/zaer_critico.json', 'utf8')).consultas_participa;
  const meta = JSON.parse(readFileSync('data/consultas-mapa.json', 'utf8')).itens;
  const atuais = [...(z.abertas || []), ...(z.em_analise || [])];
  const abertas = new Set(atuais.map((x) => x.id));
  // A página só desenha no mapa as consultas sem alerta de qualidade (ver assets/js/pages/energia-transicao-etica-2.js).
  const noMapa = atuais.filter((x) => !x.alerta_qualidade).map((x) => x.id);
  const encerradas = new Set((z.encerradas || []).map((x) => x.id));
  const ids = Object.keys(meta);
  return {
    meta,
    abertas,
    // Atributos de consultas que entretanto encerraram: saem do mapa sozinhos, podem ser apagados.
    fechadas: ids.filter((id) => !abertas.has(id) && encerradas.has(id)),
    // Atributos sem consulta nenhuma: id mal escrito ou removido do Participa.
    desconhecidas: ids.filter((id) => !abertas.has(id) && !encerradas.has(id)),
    // Consultas que o mapa desenha e ainda não têm atributos: entram sem tamanho.
    sem: noMapa.filter((id) => !meta[id]),
  };
}

/* Linhas de aviso para quem está a correr o build ou os testes (vazio quando não há nada a dizer). */
export function avisosDoMapa(estado = estadoDoMapa()) {
  const linhas = [];
  if (estado.fechadas.length)
    linhas.push(`Mapa das consultas: ${estado.fechadas.length} atributo(s) de consultas já encerradas, podem sair de data/consultas-mapa.json: ${estado.fechadas.join(', ')}`);
  if (estado.sem.length)
    linhas.push(`Mapa das consultas: ${estado.sem.length} consulta(s) em curso sem atributos, entram no mapa sem tamanho: ${estado.sem.join(', ')}`);
  return linhas;
}

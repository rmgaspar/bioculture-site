import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';

// Notícias cuja fonte não tem imagem: foto de contexto (Wikimedia Commons) em media/noticias/, com crédito, licença que
// permite uso comercial, ligação à origem e legenda do que mostra em PT e EN. Nunca com a marca bioCulture (fora de /images/).
const noticias = JSON.parse(readFileSync('data/noticias.json', 'utf8'));
const PERMITIDA = /(CC0|CC BY(-SA)? \d\.\d|domínio público|public domain)/;
let n = 0;
for (const x of noticias) {
  if (!x.imagem?.startsWith('/media/noticias/')) continue;
  n++;
  assert(existsSync(x.imagem.slice(1)), x.id + ': ficheiro em falta');
  assert(/^Foto de contexto: .+ · .+ · Wikimedia Commons$/.test(x.imagem_credito_pt), x.id + ': crédito PT');
  assert(/^Context photo: .+ · .+ · Wikimedia Commons$/.test(x.imagem_credito_en), x.id + ': crédito EN');
  assert(PERMITIDA.test(x.imagem_credito_pt), x.id + ': licença não permitida');
  assert(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(x.imagem_pagina), x.id + ': sem ligação à origem');
  assert(x.imagem_contexto?.pt && x.imagem_contexto?.en, x.id + ': falta legenda PT/EN');
}
assert(n >= 20, 'esperadas as fotos de contexto');
assert(readFileSync('scripts/build-pages.mjs', 'utf8').includes('"media"'), 'a pasta media tem de ir para o site');
console.log(`Fotos de contexto das notícias validadas: ${n}.`);

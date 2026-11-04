#!/usr/bin/env node
/* O que semear, plantar e colher num mês, com o mesmo código e os mesmos dados do Planeador de horta do site
   (assets/js/biocultura-seasonal.js + funções de planeador-horta.js + data/horticolas_master.json, culturas de data/planeador-horta.json).
   Uso: node scripts/social/horta_mes.mjs 11        (mês 1-12; escreve JSON no stdout) */
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const R = join(dirname(fileURLToPath(import.meta.url)), '..', '..') + '/';
const mes = (parseInt(process.argv[2], 10) || new Date().getMonth() + 1) - 1;
const win = {};
const ctx = vm.createContext({ window: win, document: { getElementById: () => null, querySelectorAll: () => [], addEventListener() {} }, localStorage: {}, console });
vm.runInContext(readFileSync(R + 'assets/js/biocultura-seasonal.js', 'utf8'), ctx);
const src = readFileSync(R + 'assets/js/pages/planeador-horta.js', 'utf8');
vm.runInContext(src.slice(0, src.indexOf('window.BioCulturaPlaneador = {')) + 'window.BioCulturaPlaneador = { janelas, rotulo };})();', ctx);
const P = win.BioCulturaPlaneador, seasonal = win.BioCulturaSeasonal;
const master = JSON.parse(readFileSync(R + 'data/horticolas_master.json', 'utf8'));
const plan = JSON.parse(readFileSync(R + 'data/planeador-horta.json', 'utf8'));
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const nome = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
const out = { mes: mes + 1, semear: [], plantar: [], colher: [], colher_estimado: [] };
for (const c of plan.culturas) {
  const f = master[c.id];
  if (!f) continue;
  const j = P.janelas(f, seasonal);
  if (j.S[mes]) out.semear.push({ id: c.id, nome: nome(f.nome), janela: P.rotulo(j.S, MESES, 'todo o ano'), ficha: f.sementeira });
  if (j.T[mes]) out.plantar.push({ id: c.id, nome: nome(f.nome), janela: P.rotulo(j.T, MESES, 'todo o ano'), ficha: f.plantacao_ou_transplante });
  if (j.C[mes]) (j.estimada ? out.colher_estimado : out.colher).push({ id: c.id, nome: nome(f.nome), janela: j.estimada ? '' : P.rotulo(j.C, MESES, 'todo o ano'), ficha: f.colheita });
}
console.log(JSON.stringify(out, null, 1));

const test = require('node:test');
const assert = require('node:assert/strict');
const { TESTS, sumaTest, progresoTest } = require('../js/tests.js');

const porId = id => TESTS.find(t => t.id === id);

test('hay 10 tests y cada pregunta tiene opciones o es numérica', () => {
  assert.equal(TESTS.length, 10);
  TESTS.forEach(t => t.items.forEach(it => assert.ok(it.num || it.ops || t.ops, t.id + '.' + it.id)));
});

test('HIT-6 puntúa con la tabla de la hoja (6, 8, 10, 11, 13)', () => {
  const t = porId('hit6');
  const r = {};
  t.items.forEach(it => { r['hit6.' + it.id] = 4; }); // "Siempre"
  assert.equal(t.res(t, r).lineas[0], 'Puntuación: 78 (de 36 a 78)');
  assert.deepEqual(progresoTest(t, r), { resp: 6, total: 6 });
});

test('MIDAS suma solo las preguntas 1 a 5 y da el grado', () => {
  const t = porId('midas');
  const r = { 'midas.q1': 2, 'midas.q2': 3, 'midas.q3': 4, 'midas.q4': 2, 'midas.q5': 0, 'midas.a': 30, 'midas.b': 7 };
  const res = t.res(t, r);
  assert.equal(res.lineas[0], 'Puntuación total (preguntas 1 a 5): 11');
  assert.equal(res.lineas[1], 'Grado MIDAS: Discapacidad moderada');
  assert.ok(res.hecho);
});

test('BDI-2: las opciones 1a/1b cuentan 1 punto', () => {
  const t = porId('bdi');
  assert.deepEqual(sumaTest(t, { 'bdi.i16': 2, 'bdi.i18': 6 }), { suma: 4, resp: 2 });
});

test('HADS separa ansiedad y depresión', () => {
  const t = porId('hads');
  const r = { 'hads.a1': 0, 'hads.d1': 3 }; // A.1 "Casi todo el día" = 3; D.1 "Ya no disfruto" = 3
  const res = t.res(t, r);
  assert.equal(res.lineas[0], 'Ansiedad (A): 3 de 21');
  assert.ok(res.lineas[1].startsWith('Depresión (D): 3 de 21'));
  assert.equal(res.hecho, false);
});

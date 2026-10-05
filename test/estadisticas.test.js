const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../js/estadisticas.js');

const meds = [
  { id: 'suma', nombre: 'Sumatriptán 50 mg', tipo: 'triptan' },
  { id: 'ibu', nombre: 'Ibuprofeno 600 mg', tipo: 'aine' },
  { id: 'topi', nombre: 'Topiramato 50 mg', tipo: 'preventivo' }
];

function ep(inicio, fin, intensidad, extra) {
  return Object.assign({ id: inicio, inicio, fin, intensidad, tomas: [] }, extra);
}

test('un episodio que cruza la medianoche cuenta dos días', () => {
  assert.deepEqual(E.diasDeEpisodio(ep('2026-03-31T22:00', '2026-04-01T06:00', 5)),
    ['2026-03-31', '2026-04-01']);
  assert.equal(E.duracionHoras(ep('2026-03-31T22:00', '2026-04-01T06:00', 5)), 8);
});

test('episodio sin fin ocupa solo su día y no tiene duración', () => {
  const e = ep('2026-04-02T10:00', '', 4);
  assert.deepEqual(E.diasDeEpisodio(e), ['2026-04-02']);
  assert.equal(E.duracionHoras(e), null);
});

test('filtrarRango incluye episodios que tocan el borde del rango', () => {
  const eps = [ep('2026-03-31T22:00', '2026-04-01T06:00', 5), ep('2026-03-15T10:00', '2026-03-15T12:00', 3)];
  assert.equal(E.filtrarRango(eps, '2026-04-01', '2026-04-30').length, 1);
});

test('resumen cuenta días, intensidad y medicación aguda (no preventiva)', () => {
  const eps = [
    ep('2026-04-01T08:00', '2026-04-01T20:00', 8, {
      sintomas: ['náuseas', 'fotofobia'],
      tomas: [
        { medId: 'suma', hora: '2026-04-01T09:00', eficacia: 'completa' },
        { medId: 'topi', hora: '2026-04-01T21:00' }
      ]
    }),
    ep('2026-04-03T08:00', '2026-04-04T08:00', 4, {
      sintomas: ['fotofobia'],
      tomas: [{ medId: 'ibu', hora: '2026-04-04T07:00', eficacia: 'parcial' }]
    })
  ];
  const r = E.resumen(eps, meds, '2026-04-01', '2026-04-30');
  assert.equal(r.numEpisodios, 2);
  assert.equal(r.diasCefalea, 3);
  assert.equal(r.diasIntensos, 1);
  assert.equal(r.intensidadMedia, 6);
  assert.equal(r.duracionMediaHoras, 18);
  assert.equal(r.diasMedicacionAguda, 2);
  assert.deepEqual(Object.keys(r.tomasPorDia).sort(), ['2026-04-01', '2026-04-04']);
  assert.deepEqual(r.sintomas[0], { clave: 'fotofobia', n: 2 });
  const suma = r.eficacia.find(x => x.medId === 'suma');
  assert.equal(suma.completa, 1);
  const topi = r.eficacia.find(x => x.medId === 'topi');
  assert.equal(topi.sinDato, 1);
});

test('alerta de abuso con 10 días de triptán en un mes', () => {
  const eps = [];
  for (let d = 1; d <= 10; d++) {
    const dia = '2026-05-' + String(d).padStart(2, '0');
    eps.push(ep(dia + 'T08:00', dia + 'T12:00', 6, { tomas: [{ medId: 'suma', hora: dia + 'T08:30' }] }));
  }
  const [mayo] = E.abusoPorMes(eps, meds, '2026-05-01', '2026-05-31');
  assert.equal(mayo.diasMedicacion, 10);
  assert.deepEqual(mayo.alertas, [{ tipo: 'triptan', dias: 10, umbral: 10 }]);

  const nueve = E.abusoPorMes(eps.slice(1), meds, '2026-05-01', '2026-05-31');
  assert.deepEqual(nueve[0].alertas, []);
});

test('AINE no alerta hasta 15 días, pero la combinación con triptán sí a los 10', () => {
  const eps = [];
  for (let d = 1; d <= 10; d++) {
    const dia = '2026-06-' + String(d).padStart(2, '0');
    eps.push(ep(dia + 'T08:00', dia + 'T12:00', 5, {
      tomas: [{ medId: d <= 5 ? 'suma' : 'ibu', hora: dia + 'T08:30' }]
    }));
  }
  const [junio] = E.abusoPorMes(eps, meds, '2026-06-01', '2026-06-30');
  assert.deepEqual(junio.alertas, [{ tipo: 'varios', dias: 10, umbral: 10 }]);
});

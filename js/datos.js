/*
 * Persistencia en localStorage y copia de seguridad.
 */
(function (global) {
  'use strict';

  var CLAVE = 'diario-migranas:v1';

  function vacio() {
    return { version: 1, ajustes: { paciente: '', neurologa: '' }, meds: [], episodios: [], inyecciones: [], importado: null };
  }

  function normalizar(d) {
    var base = vacio();
    if (!d || typeof d !== 'object') return base;
    return {
      version: 1,
      ajustes: Object.assign(base.ajustes, d.ajustes || {}),
      meds: Array.isArray(d.meds) ? d.meds : [],
      episodios: Array.isArray(d.episodios) ? d.episodios.filter(function (e) {
        return e && typeof e.inicio === 'string';
      }) : [],
      // Administraciones de preventivos (p. ej. inyección mensual): [{ id, medId, fecha }]
      inyecciones: Array.isArray(d.inyecciones) ? d.inyecciones.filter(function (x) {
        return x && typeof x.fecha === 'string';
      }) : [],
      // Datos del diario anterior que esta app aún no muestra (cuestionarios…); se conservan tal cual.
      importado: d.importado && typeof d.importado === 'object' ? d.importado : null
    };
  }

  function cargar() {
    try {
      return normalizar(JSON.parse(localStorage.getItem(CLAVE)));
    } catch (e) {
      return vacio();
    }
  }

  function guardar(datos) {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
  }

  function id() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function descargar(nombre, contenido, tipo) {
    var blob = new Blob([contenido], { type: tipo });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = nombre;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function csvCelda(v) {
    var s = v === null || v === undefined ? '' : String(v);
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  // CSV con ";" como separador para que Excel en español lo abra bien.
  function aCSV(datos) {
    var meds = {};
    datos.meds.forEach(function (m) { meds[m.id] = m.nombre; });
    var cab = ['inicio', 'fin', 'intensidad', 'localizacion', 'tipo_dolor', 'sintomas', 'aura',
      'desencadenantes', 'medicacion', 'limitacion', 'notas'];
    var filas = datos.episodios.slice()
      .sort(function (a, b) { return a.inicio.localeCompare(b.inicio); })
      .map(function (e) {
        var tomas = (e.tomas || []).map(function (t) {
          return (meds[t.medId] || '?') + ' ' + (t.hora || '').replace('T', ' ') + (t.eficacia ? ' (' + t.eficacia + ')' : '');
        });
        return [e.inicio.replace('T', ' '), (e.fin || '').replace('T', ' '), e.intensidad,
          (e.localizacion || []).join(', '), (e.caracter || []).join(', '), (e.sintomas || []).join(', '),
          e.aura ? 'sí' : 'no', (e.desencadenantes || []).join(', '), tomas.join(' | '),
          e.discapacidad || '', e.notas || ''].map(csvCelda).join(';');
      });
    return '﻿' + [cab.join(';')].concat(filas).join('\r\n');
  }

  global.Datos = {
    cargar: cargar,
    guardar: guardar,
    normalizar: normalizar,
    id: id,
    descargar: descargar,
    aCSV: aCSV
  };
})(this);

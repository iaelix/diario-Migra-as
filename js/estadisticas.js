/*
 * Cálculos puros sobre los episodios (sin acceso al DOM ni a localStorage),
 * para poder probarlos con `node --test`.
 *
 * Fechas: los episodios guardan `inicio` y `fin` como "YYYY-MM-DDTHH:mm"
 * en hora local; los días se representan como "YYYY-MM-DD".
 */
(function (global) {
  'use strict';

  // Tipos de medicación aguda y umbral de días/mes a partir del cual la
  // ICHD-3 considera cefalea por uso excesivo de medicación.
  var UMBRAL_ABUSO = {
    triptan: 10,
    ergotico: 10,
    opioide: 10,
    combinado: 10,
    aine: 15,
    analgesico: 15
  };

  var EFICACIAS = ['completa', 'parcial', 'nada'];

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function aDia(fecha) {
    return fecha.getFullYear() + '-' + pad(fecha.getMonth() + 1) + '-' + pad(fecha.getDate());
  }

  function parseFecha(texto) {
    // "YYYY-MM-DD" o "YYYY-MM-DDTHH:mm", interpretado en hora local.
    var p = texto.split(/[-T:]/).map(Number);
    return new Date(p[0], p[1] - 1, p[2], p[3] || 0, p[4] || 0);
  }

  function sumarDias(dia, n) {
    var f = parseFecha(dia);
    f.setDate(f.getDate() + n);
    return aDia(f);
  }

  function diasEntre(desde, hasta) {
    var dias = [];
    for (var d = desde; d <= hasta; d = sumarDias(d, 1)) dias.push(d);
    return dias;
  }

  // Días naturales que abarca un episodio (si no tiene fin, solo el de inicio).
  function diasDeEpisodio(ep) {
    var desde = ep.inicio.slice(0, 10);
    var hasta = ep.fin ? ep.fin.slice(0, 10) : desde;
    if (hasta < desde) hasta = desde;
    return diasEntre(desde, hasta);
  }

  function duracionHoras(ep) {
    if (!ep.fin) return null;
    var h = (parseFecha(ep.fin) - parseFecha(ep.inicio)) / 36e5;
    return h >= 0 ? h : null;
  }

  // Episodios que tocan algún día del rango [desde, hasta] (ambos incluidos).
  function filtrarRango(episodios, desde, hasta) {
    return episodios.filter(function (ep) {
      var dias = diasDeEpisodio(ep);
      return dias[dias.length - 1] >= desde && dias[0] <= hasta;
    });
  }

  // Las tomas guardan fecha y hora ("YYYY-MM-DDTHH:mm"); si falta, se
  // asume el día de inicio del episodio.
  function diaDeToma(ep, toma) {
    return (toma.hora || ep.inicio).slice(0, 10);
  }

  function contar(lista) {
    var c = {};
    lista.forEach(function (x) { c[x] = (c[x] || 0) + 1; });
    return Object.keys(c)
      .map(function (k) { return { clave: k, n: c[k] }; })
      .sort(function (a, b) { return b.n - a.n || a.clave.localeCompare(b.clave); });
  }

  function media(nums) {
    if (!nums.length) return null;
    return nums.reduce(function (a, b) { return a + b; }, 0) / nums.length;
  }

  // Intensidad máxima por día dentro del rango: { "YYYY-MM-DD": 7, ... }
  function intensidadPorDia(episodios, desde, hasta) {
    var r = {};
    episodios.forEach(function (ep) {
      diasDeEpisodio(ep).forEach(function (d) {
        if (d < desde || d > hasta) return;
        r[d] = Math.max(r[d] || 0, ep.intensidad || 0);
      });
    });
    return r;
  }

  // Días con alguna toma de medicación aguda: { "YYYY-MM-DD": ["medId", ...] }
  function tomasPorDia(episodios, meds, desde, hasta) {
    var porId = indexar(meds);
    var r = {};
    episodios.forEach(function (ep) {
      (ep.tomas || []).forEach(function (t) {
        var med = porId[t.medId];
        if (!med || med.tipo === 'preventivo') return;
        var d = diaDeToma(ep, t);
        if (d < desde || d > hasta) return;
        (r[d] = r[d] || []).push(t.medId);
      });
    });
    return r;
  }

  function indexar(meds) {
    var porId = {};
    meds.forEach(function (m) { porId[m.id] = m; });
    return porId;
  }

  // Uso de medicación aguda por mes natural, con alerta de posible abuso.
  function abusoPorMes(episodios, meds, desde, hasta) {
    var porId = indexar(meds);
    var tomas = tomasPorDia(episodios, meds, desde, hasta);
    var meses = {};
    Object.keys(tomas).forEach(function (dia) {
      var mes = dia.slice(0, 7);
      var m = meses[mes] = meses[mes] || { mes: mes, diasTotal: {}, porTipo: {} };
      m.diasTotal[dia] = true;
      tomas[dia].forEach(function (id) {
        var tipo = porId[id].tipo;
        (m.porTipo[tipo] = m.porTipo[tipo] || {})[dia] = true;
      });
    });
    return Object.keys(meses).sort().map(function (mes) {
      var m = meses[mes];
      var porTipo = {};
      var alertas = [];
      Object.keys(m.porTipo).forEach(function (tipo) {
        var n = Object.keys(m.porTipo[tipo]).length;
        porTipo[tipo] = n;
        if (UMBRAL_ABUSO[tipo] && n >= UMBRAL_ABUSO[tipo]) {
          alertas.push({ tipo: tipo, dias: n, umbral: UMBRAL_ABUSO[tipo] });
        }
      });
      var diasTotal = Object.keys(m.diasTotal).length;
      // Combinación de varias clases sin superar ninguna por separado.
      if (!alertas.length && diasTotal >= 10 && Object.keys(porTipo).length > 1) {
        alertas.push({ tipo: 'varios', dias: diasTotal, umbral: 10 });
      }
      return { mes: mes, diasMedicacion: diasTotal, porTipo: porTipo, alertas: alertas };
    });
  }

  function eficaciaPorMedicamento(episodios, meds) {
    var porId = indexar(meds);
    var r = {};
    episodios.forEach(function (ep) {
      (ep.tomas || []).forEach(function (t) {
        var med = porId[t.medId];
        if (!med) return;
        var e = r[t.medId] = r[t.medId] || { medId: t.medId, nombre: med.nombre, tomas: 0, completa: 0, parcial: 0, nada: 0, sinDato: 0 };
        e.tomas++;
        if (EFICACIAS.indexOf(t.eficacia) >= 0) e[t.eficacia]++;
        else e.sinDato++;
      });
    });
    return Object.keys(r).map(function (k) { return r[k]; })
      .sort(function (a, b) { return b.tomas - a.tomas; });
  }

  function resumen(episodios, meds, desde, hasta) {
    var eps = filtrarRango(episodios, desde, hasta);
    var porDia = intensidadPorDia(eps, desde, hasta);
    var tomas = tomasPorDia(eps, meds, desde, hasta);
    var totalDias = diasEntre(desde, hasta).length;
    var diasCefalea = Object.keys(porDia).length;
    var duraciones = eps.map(duracionHoras).filter(function (h) { return h !== null; });

    var discapacidad = contar(eps.map(function (e) { return e.discapacidad || 'sin dato'; }));

    return {
      desde: desde,
      hasta: hasta,
      totalDias: totalDias,
      numEpisodios: eps.length,
      diasCefalea: diasCefalea,
      diasCefaleaAl30: totalDias ? diasCefalea * 30 / totalDias : 0,
      diasIntensos: Object.keys(porDia).filter(function (d) { return porDia[d] >= 7; }).length,
      intensidadMedia: media(eps.map(function (e) { return e.intensidad || 0; })),
      duracionMediaHoras: media(duraciones),
      diasMedicacionAguda: Object.keys(tomas).length,
      conAura: eps.filter(function (e) { return e.aura; }).length,
      localizacion: contar(flat(eps, 'localizacion')),
      caracter: contar(flat(eps, 'caracter')),
      sintomas: contar(flat(eps, 'sintomas')),
      desencadenantes: contar(flat(eps, 'desencadenantes')),
      discapacidad: discapacidad,
      eficacia: eficaciaPorMedicamento(eps, meds),
      abuso: abusoPorMes(eps, meds, desde, hasta),
      intensidadPorDia: porDia,
      tomasPorDia: tomas,
      episodios: eps.slice().sort(function (a, b) { return a.inicio.localeCompare(b.inicio); })
    };
  }

  function flat(eps, campo) {
    return eps.reduce(function (acc, e) { return acc.concat(e[campo] || []); }, []);
  }

  var api = {
    UMBRAL_ABUSO: UMBRAL_ABUSO,
    aDia: aDia,
    parseFecha: parseFecha,
    sumarDias: sumarDias,
    diasEntre: diasEntre,
    diasDeEpisodio: diasDeEpisodio,
    duracionHoras: duracionHoras,
    filtrarRango: filtrarRango,
    intensidadPorDia: intensidadPorDia,
    tomasPorDia: tomasPorDia,
    abusoPorMes: abusoPorMes,
    eficaciaPorMedicamento: eficaciaPorMedicamento,
    resumen: resumen
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.Estadisticas = api;
})(this);

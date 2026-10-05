/*
 * Interfaz: formularios, historial, calendario, catálogo de medicación,
 * informe imprimible y copias de seguridad.
 */
(function () {
  'use strict';

  var E = window.Estadisticas;
  var D = window.Datos;

  var OPCIONES = {
    localizacion: ['lado izquierdo', 'lado derecho', 'ambos lados', 'frente', 'sienes', 'detrás de los ojos', 'nuca', 'toda la cabeza'],
    caracter: ['pulsátil', 'opresivo', 'punzante', 'quemante'],
    sintomas: ['náuseas', 'vómitos', 'fotofobia', 'fonofobia', 'osmofobia', 'mareo', 'empeora al moverme', 'congestión / lagrimeo'],
    desencadenantes: ['estrés', 'poco sueño', 'mucho sueño', 'menstruación', 'ayuno / saltar comida', 'alcohol', 'cafeína', 'cambio de tiempo', 'pantallas', 'ejercicio intenso', 'luz intensa', 'deshidratación']
  };

  var TIPOS = {
    triptan: 'Triptán', aine: 'AINE', analgesico: 'Analgésico simple', combinado: 'Analgésico combinado',
    opioide: 'Opioide', ergotico: 'Ergótico', antiemetico: 'Antiemético', preventivo: 'Preventivo', otro: 'Otro', varios: 'Varias clases'
  };

  var DISCAPACIDAD = {
    ninguna: 'Sin limitación', leve: 'Con dificultad', grave: 'Tuvo que parar', cama: 'Reposo en cama', 'sin dato': 'Sin dato'
  };

  var EFICACIA = { '': 'sin valorar', completa: 'alivio completo', parcial: 'alivio parcial', nada: 'sin alivio' };

  var datos = D.cargar();
  var mesVisible = new Date();
  mesVisible.setDate(1);

  // ---------- utilidades ----------

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function ahora() {
    var d = new Date();
    return E.aDia(d) + 'T' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function hoy() { return E.aDia(new Date()); }

  var fmtFecha = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  var fmtFechaCorta = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  var fmtMes = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });

  function fechaLarga(dia) { return fmtFecha.format(E.parseFecha(dia)); }
  function fechaCorta(dia) { return fmtFechaCorta.format(E.parseFecha(dia)); }
  function hora(fh) { return fh ? fh.slice(11, 16) : ''; }
  function nombreMes(anio, mes) {
    var s = fmtMes.format(new Date(anio, mes, 1));
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function num(n, dec) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return n.toLocaleString('es-ES', { maximumFractionDigits: dec === undefined ? 1 : dec });
  }

  function horas(h) {
    if (h === null || h === undefined) return '—';
    if (h < 1) return Math.round(h * 60) + ' min';
    return num(h) + ' h';
  }

  function nivel(i) {
    if (!i) return 0;
    if (i <= 3) return 1;
    if (i <= 6) return 2;
    return 3;
  }

  function medPorId(id) {
    return datos.meds.find(function (m) { return m.id === id; });
  }

  function persistir() {
    try {
      D.guardar(datos);
    } catch (e) {
      avisar('No se ha podido guardar: ' + e.message, true);
    }
  }

  var temporizadorAviso;
  function avisar(texto, error) {
    var el = $('#aviso');
    el.textContent = texto;
    el.classList.toggle('error', !!error);
    el.hidden = false;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(function () { el.hidden = true; }, 3500);
  }

  // ---------- navegación ----------

  function mostrar(vista) {
    $$('.pestanas button').forEach(function (b) { b.classList.toggle('activa', b.dataset.vista === vista); });
    $$('.vista').forEach(function (v) { v.classList.toggle('activa', v.id === 'vista-' + vista); });
    if (vista === 'historial') pintarHistorial();
    if (vista === 'calendario') pintarCalendario();
    if (vista === 'medicacion') pintarMeds();
    if (vista === 'informe') pintarInforme();
    if (vista === 'registrar') pintarSelectsTomas();
    window.scrollTo(0, 0);
  }

  $$('.pestanas button').forEach(function (b) {
    b.addEventListener('click', function () { mostrar(b.dataset.vista); });
  });
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest('[data-ir]');
    if (a) { ev.preventDefault(); mostrar(a.dataset.ir); }
  });

  // ---------- formulario de episodio ----------

  var form = $('#form-episodio');

  Object.keys(OPCIONES).forEach(function (campo) {
    $('.chips[data-campo="' + campo + '"]', form).innerHTML = OPCIONES[campo].map(function (op) {
      return '<label class="chip"><input type="checkbox" name="' + campo + '" value="' + esc(op) + '"><span>' + esc(op) + '</span></label>';
    }).join('');
  });

  form.intensidad.addEventListener('input', function () {
    $('#intensidad-valor').textContent = form.intensidad.value;
  });

  form.enCurso.addEventListener('change', function () {
    form.fin.disabled = form.enCurso.checked;
    if (form.enCurso.checked) form.fin.value = '';
  });

  function filaToma(toma) {
    toma = toma || { medId: '', hora: form.inicio.value || ahora(), eficacia: '' };
    var div = document.createElement('div');
    div.className = 'toma';
    div.innerHTML =
      '<select class="toma-med" aria-label="Medicamento">' + opcionesMeds(toma.medId) + '</select>' +
      '<input type="datetime-local" class="toma-hora" aria-label="Hora de la toma" value="' + esc(toma.hora) + '">' +
      '<select class="toma-eficacia" aria-label="Efecto">' +
      Object.keys(EFICACIA).map(function (k) {
        return '<option value="' + k + '"' + (k === (toma.eficacia || '') ? ' selected' : '') + '>' + EFICACIA[k] + '</option>';
      }).join('') + '</select>' +
      '<button type="button" class="quitar" aria-label="Quitar toma">✕</button>';
    $('.quitar', div).addEventListener('click', function () { div.remove(); });
    $('#lista-tomas').appendChild(div);
  }

  function opcionesMeds(seleccionado) {
    return datos.meds.map(function (m) {
      return '<option value="' + esc(m.id) + '"' + (m.id === seleccionado ? ' selected' : '') + '>' + esc(m.nombre) + '</option>';
    }).join('');
  }

  function pintarSelectsTomas() {
    var hay = datos.meds.length > 0;
    $('#anadir-toma').hidden = !hay;
    $('#sin-medicamentos').hidden = hay;
    $$('.toma-med', form).forEach(function (s) { s.innerHTML = opcionesMeds(s.value); });
  }

  $('#anadir-toma').addEventListener('click', function () { filaToma(); });

  function limpiarFormulario() {
    form.reset();
    form.id.value = '';
    form.inicio.value = ahora();
    form.fin.disabled = false;
    $('#intensidad-valor').textContent = form.intensidad.value;
    $('#lista-tomas').innerHTML = '';
    $('#titulo-form').textContent = 'Nuevo episodio';
    $('#cancelar-edicion').hidden = true;
    pintarSelectsTomas();
  }

  function editarEpisodio(id) {
    var ep = datos.episodios.find(function (e) { return e.id === id; });
    if (!ep) return;
    mostrar('registrar');
    limpiarFormulario();
    form.id.value = ep.id;
    form.inicio.value = ep.inicio;
    form.fin.value = ep.fin || '';
    form.enCurso.checked = !ep.fin;
    form.fin.disabled = !ep.fin;
    form.intensidad.value = ep.intensidad;
    $('#intensidad-valor').textContent = ep.intensidad;
    Object.keys(OPCIONES).forEach(function (campo) {
      var valores = ep[campo] || [];
      $$('input[name="' + campo + '"]', form).forEach(function (c) { c.checked = valores.indexOf(c.value) >= 0; });
    });
    var otros = (ep.desencadenantes || []).filter(function (d) { return OPCIONES.desencadenantes.indexOf(d) < 0; });
    form.desencadenanteOtro.value = otros.join(', ');
    form.aura.checked = !!ep.aura;
    $$('input[name="discapacidad"]', form).forEach(function (r) { r.checked = r.value === ep.discapacidad; });
    form.notas.value = ep.notas || '';
    (ep.tomas || []).forEach(filaToma);
    $('#titulo-form').textContent = 'Editar episodio';
    $('#cancelar-edicion').hidden = false;
  }

  $('#cancelar-edicion').addEventListener('click', function () {
    limpiarFormulario();
    mostrar('historial');
  });

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var fin = form.enCurso.checked ? '' : form.fin.value;
    if (fin && fin < form.inicio.value) {
      avisar('El fin no puede ser anterior al inicio.', true);
      return;
    }
    function marcados(campo) {
      return $$('input[name="' + campo + '"]:checked', form).map(function (c) { return c.value; });
    }
    var desencadenantes = marcados('desencadenantes').concat(
      form.desencadenanteOtro.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean));
    var discapacidad = $('input[name="discapacidad"]:checked', form);

    var ep = {
      id: form.id.value || D.id(),
      inicio: form.inicio.value,
      fin: fin,
      intensidad: Number(form.intensidad.value),
      localizacion: marcados('localizacion'),
      caracter: marcados('caracter'),
      sintomas: marcados('sintomas'),
      aura: form.aura.checked,
      desencadenantes: desencadenantes,
      tomas: $$('.toma', form).map(function (div) {
        return {
          medId: $('.toma-med', div).value,
          hora: $('.toma-hora', div).value,
          eficacia: $('.toma-eficacia', div).value
        };
      }).filter(function (t) { return t.medId; }),
      discapacidad: discapacidad ? discapacidad.value : '',
      notas: form.notas.value.trim()
    };

    var i = datos.episodios.findIndex(function (e) { return e.id === ep.id; });
    if (i >= 0) datos.episodios[i] = ep;
    else datos.episodios.push(ep);
    persistir();
    var editando = i >= 0;
    limpiarFormulario();
    avisar(editando ? 'Episodio actualizado.' : 'Episodio guardado.');
    if (editando) mostrar('historial');
  });

  // ---------- historial ----------

  function descripcionEpisodio(ep) {
    var partes = [];
    var dur = E.duracionHoras(ep);
    partes.push(ep.fin ? 'duración ' + horas(dur) : '<em>en curso / sin fin</em>');
    if (ep.aura) partes.push('con aura');
    var lista = [].concat(ep.localizacion || [], ep.caracter || [], ep.sintomas || []);
    if (lista.length) partes.push(esc(lista.join(', ')));
    return partes.join(' · ');
  }

  function pintarHistorial() {
    var cont = $('#lista-episodios');
    if (!datos.episodios.length) {
      cont.innerHTML = '<p class="vacio">Aún no hay episodios. Registra el primero en <a href="#" data-ir="registrar">Registrar</a>.</p>';
      return;
    }
    var eps = datos.episodios.slice().sort(function (a, b) { return b.inicio.localeCompare(a.inicio); });
    cont.innerHTML = eps.map(function (ep) {
      var tomas = (ep.tomas || []).map(function (t) {
        var m = medPorId(t.medId);
        return esc(m ? m.nombre : '(medicamento borrado)') + ' ' + hora(t.hora) + (t.eficacia ? ' — ' + EFICACIA[t.eficacia] : '');
      });
      return '<article class="tarjeta">' +
        '<div class="intensidad nivel-' + nivel(ep.intensidad) + '">' + ep.intensidad + '</div>' +
        '<div class="cuerpo">' +
        '<h3>' + esc(fechaLarga(ep.inicio.slice(0, 10))) + ' · ' + hora(ep.inicio) + '</h3>' +
        '<p>' + descripcionEpisodio(ep) + '</p>' +
        (ep.desencadenantes && ep.desencadenantes.length ? '<p class="ayuda">Desencadenantes: ' + esc(ep.desencadenantes.join(', ')) + '</p>' : '') +
        (tomas.length ? '<p class="ayuda">Medicación: ' + tomas.join('; ') + '</p>' : '') +
        (ep.notas ? '<p class="nota">' + esc(ep.notas) + '</p>' : '') +
        '</div>' +
        '<div class="botones">' +
        '<button type="button" class="secundario" data-editar="' + esc(ep.id) + '">Editar</button>' +
        '<button type="button" class="peligro" data-borrar="' + esc(ep.id) + '">Borrar</button>' +
        '</div></article>';
    }).join('');
  }

  $('#lista-episodios').addEventListener('click', function (ev) {
    var b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.editar) editarEpisodio(b.dataset.editar);
    if (b.dataset.borrar && confirm('¿Borrar este episodio? No se puede deshacer.')) {
      datos.episodios = datos.episodios.filter(function (e) { return e.id !== b.dataset.borrar; });
      persistir();
      pintarHistorial();
    }
  });

  // ---------- calendario ----------

  function htmlMes(anio, mes, porDia, tomas) {
    var primero = new Date(anio, mes, 1);
    var hueco = (primero.getDay() + 6) % 7; // lunes = 0
    var diasMes = new Date(anio, mes + 1, 0).getDate();
    var hoyStr = hoy();
    var celdas = ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(function (d) { return '<div class="dia-semana">' + d + '</div>'; });
    for (var i = 0; i < hueco; i++) celdas.push('<div></div>');
    for (var d = 1; d <= diasMes; d++) {
      var dia = E.aDia(new Date(anio, mes, d));
      var i2 = porDia[dia];
      var titulo = i2 !== undefined ? 'Intensidad ' + i2 : 'Sin dolor';
      if (tomas[dia]) titulo += ', medicación aguda';
      celdas.push('<div class="dia nivel-' + (i2 !== undefined ? Math.max(1, nivel(i2)) : 0) +
        (dia === hoyStr ? ' hoy' : '') + '" title="' + titulo + '">' + d +
        (tomas[dia] ? '<b class="punto-med">●</b>' : '') + '</div>');
    }
    return '<div class="mes">' + celdas.join('') + '</div>';
  }

  function pintarCalendario() {
    var anio = mesVisible.getFullYear(), mes = mesVisible.getMonth();
    var desde = E.aDia(new Date(anio, mes, 1));
    var hasta = E.aDia(new Date(anio, mes + 1, 0));
    var r = E.resumen(datos.episodios, datos.meds, desde, hasta);
    $('#titulo-mes').textContent = nombreMes(anio, mes);
    $('#calendario').innerHTML = htmlMes(anio, mes, r.intensidadPorDia, r.tomasPorDia);
    $('#resumen-mes').textContent = r.diasCefalea + ' días con dolor, ' + r.diasIntensos +
      ' intensos, ' + r.diasMedicacionAguda + ' días con medicación aguda.';
  }

  $('#mes-anterior').addEventListener('click', function () { mesVisible.setMonth(mesVisible.getMonth() - 1); pintarCalendario(); });
  $('#mes-siguiente').addEventListener('click', function () { mesVisible.setMonth(mesVisible.getMonth() + 1); pintarCalendario(); });

  // ---------- medicación ----------

  var formMed = $('#form-med');

  function pintarMeds() {
    var cont = $('#lista-meds');
    if (!datos.meds.length) {
      cont.innerHTML = '<p class="vacio">Añade los medicamentos que usas para las crisis y los preventivos.</p>';
      return;
    }
    cont.innerHTML = '<table class="tabla"><thead><tr><th>Medicamento</th><th>Tipo</th><th>Tomas registradas</th><th></th></tr></thead><tbody>' +
      datos.meds.map(function (m) {
        var n = datos.episodios.reduce(function (acc, e) {
          return acc + (e.tomas || []).filter(function (t) { return t.medId === m.id; }).length;
        }, 0);
        return '<tr><td>' + esc(m.nombre) + '</td><td>' + esc(TIPOS[m.tipo] || m.tipo) + '</td><td>' + n + '</td>' +
          '<td class="botones"><button type="button" class="secundario" data-editar-med="' + esc(m.id) + '">Editar</button>' +
          '<button type="button" class="peligro" data-borrar-med="' + esc(m.id) + '">Borrar</button></td></tr>';
      }).join('') + '</tbody></table>';
  }

  formMed.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var med = { id: formMed.id.value || D.id(), nombre: formMed.nombre.value.trim(), tipo: formMed.tipo.value };
    if (!med.nombre) return;
    var i = datos.meds.findIndex(function (m) { return m.id === med.id; });
    if (i >= 0) datos.meds[i] = med;
    else datos.meds.push(med);
    persistir();
    formMed.reset();
    formMed.id.value = '';
    pintarMeds();
    avisar('Medicamento guardado.');
  });

  $('#lista-meds').addEventListener('click', function (ev) {
    var b = ev.target.closest('button');
    if (!b) return;
    if (b.dataset.editarMed) {
      var m = medPorId(b.dataset.editarMed);
      formMed.id.value = m.id;
      formMed.nombre.value = m.nombre;
      formMed.tipo.value = m.tipo;
      formMed.nombre.focus();
    }
    if (b.dataset.borrarMed) {
      var id = b.dataset.borrarMed;
      var usado = datos.episodios.some(function (e) { return (e.tomas || []).some(function (t) { return t.medId === id; }); });
      var msg = usado
        ? 'Este medicamento aparece en episodios registrados; esas tomas dejarán de contar en los informes. ¿Borrarlo igualmente?'
        : '¿Borrar este medicamento?';
      if (!confirm(msg)) return;
      datos.meds = datos.meds.filter(function (x) { return x.id !== id; });
      persistir();
      pintarMeds();
    }
  });

  // ---------- informe ----------

  var inDesde = $('#informe-desde'), inHasta = $('#informe-hasta');

  function periodo(meses) {
    var h = new Date();
    var d = new Date(h.getFullYear(), h.getMonth() - meses, h.getDate() + 1);
    inDesde.value = E.aDia(d);
    inHasta.value = E.aDia(h);
  }
  periodo(3);

  $$('[data-periodo]').forEach(function (b) {
    b.addEventListener('click', function () { periodo(Number(b.dataset.periodo)); pintarInforme(); });
  });
  inDesde.addEventListener('change', pintarInforme);
  inHasta.addEventListener('change', pintarInforme);
  $('#imprimir').addEventListener('click', function () { window.print(); });
  window.addEventListener('beforeprint', pintarInforme);

  function tablaFrecuencias(titulo, lista, total, etiquetas) {
    if (!lista.length) return '';
    return '<div class="bloque"><h3>' + titulo + '</h3><table class="tabla compacta"><tbody>' +
      lista.map(function (x) {
        var pct = total ? Math.round(x.n * 100 / total) : 0;
        return '<tr><td>' + esc(etiquetas ? (etiquetas[x.clave] || x.clave) : x.clave) + '</td><td class="num">' + x.n +
          '</td><td class="barra-celda"><span class="barra" style="width:' + pct + '%"></span></td><td class="num">' + pct + '%</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  function cifra(valor, etiqueta, detalle) {
    return '<div class="cifra"><strong>' + valor + '</strong><span>' + etiqueta + '</span>' +
      (detalle ? '<small>' + detalle + '</small>' : '') + '</div>';
  }

  function pintarInforme() {
    var desde = inDesde.value, hasta = inHasta.value;
    var cont = $('#informe');
    if (!desde || !hasta || desde > hasta) {
      cont.innerHTML = '<p class="vacio">Elige un periodo válido.</p>';
      return;
    }
    var r = E.resumen(datos.episodios, datos.meds, desde, hasta);
    var aj = datos.ajustes;

    var html = '<header class="informe-cabecera"><h2>Informe de cefaleas</h2><dl>' +
      (aj.paciente ? '<dt>Paciente</dt><dd>' + esc(aj.paciente) + '</dd>' : '') +
      (aj.neurologa ? '<dt>Para</dt><dd>' + esc(aj.neurologa) + '</dd>' : '') +
      '<dt>Periodo</dt><dd>' + fechaCorta(desde) + ' – ' + fechaCorta(hasta) + ' (' + r.totalDias + ' días)</dd>' +
      '<dt>Emitido</dt><dd>' + fechaCorta(hoy()) + '</dd></dl></header>';

    if (!r.numEpisodios) {
      cont.innerHTML = html + '<p class="vacio">No hay episodios registrados en este periodo.</p>';
      return;
    }

    html += '<div class="cifras">' +
      cifra(r.diasCefalea, 'días con dolor', num(r.diasCefaleaAl30) + ' por cada 30 días') +
      cifra(r.diasIntensos, 'días intensos', 'intensidad ≥ 7') +
      cifra(r.numEpisodios, 'episodios', r.conAura ? r.conAura + ' con aura' : 'ninguno con aura') +
      cifra(num(r.intensidadMedia), 'intensidad media', 'escala 0–10') +
      cifra(horas(r.duracionMediaHoras), 'duración media', 'de los episodios con fin') +
      cifra(r.diasMedicacionAguda, 'días con medicación aguda', num(r.totalDias ? r.diasMedicacionAguda * 30 / r.totalDias : 0) + ' por cada 30 días') +
      '</div>';

    var alertas = [];
    r.abuso.forEach(function (m) {
      m.alertas.forEach(function (a) {
        var p = m.mes.split('-');
        alertas.push('<li><strong>' + nombreMes(+p[0], +p[1] - 1) + ':</strong> ' + a.dias + ' días con ' +
          esc(TIPOS[a.tipo] || a.tipo).toLowerCase() + ' (umbral ' + a.umbral + ' días/mes).</li>');
      });
    });
    if (alertas.length) {
      html += '<div class="alerta"><h3>Posible uso excesivo de medicación</h3><ul>' + alertas.join('') +
        '</ul><p>Criterio orientativo (ICHD-3). Coméntalo con tu neuróloga; no cambies el tratamiento por tu cuenta.</p></div>';
    }

    // Calendarios de cada mes del periodo
    html += '<div class="bloque"><h3>Calendario</h3><div class="meses">';
    var d0 = E.parseFecha(desde), d1 = E.parseFecha(hasta);
    for (var f = new Date(d0.getFullYear(), d0.getMonth(), 1); f <= d1; f.setMonth(f.getMonth() + 1)) {
      html += '<div class="mes-informe"><h4>' + nombreMes(f.getFullYear(), f.getMonth()) + '</h4>' +
        htmlMes(f.getFullYear(), f.getMonth(), r.intensidadPorDia, r.tomasPorDia) + '</div>';
    }
    html += '</div><div class="leyenda"><span><i class="nivel-1"></i> leve</span><span><i class="nivel-2"></i> moderado</span>' +
      '<span><i class="nivel-3"></i> intenso</span><span><b class="punto-med">●</b> medicación aguda</span></div></div>';

    // Uso de medicación por mes
    if (r.abuso.length) {
      var tipos = {};
      r.abuso.forEach(function (m) { Object.keys(m.porTipo).forEach(function (t) { tipos[t] = true; }); });
      tipos = Object.keys(tipos);
      html += '<div class="bloque"><h3>Días con medicación aguda por mes</h3><table class="tabla"><thead><tr><th>Mes</th>' +
        tipos.map(function (t) { return '<th class="num">' + esc(TIPOS[t] || t) + '</th>'; }).join('') +
        '<th class="num">Total días</th></tr></thead><tbody>' +
        r.abuso.map(function (m) {
          var p = m.mes.split('-');
          return '<tr' + (m.alertas.length ? ' class="fila-alerta"' : '') + '><td>' + nombreMes(+p[0], +p[1] - 1) + '</td>' +
            tipos.map(function (t) { return '<td class="num">' + (m.porTipo[t] || 0) + '</td>'; }).join('') +
            '<td class="num">' + m.diasMedicacion + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }

    if (r.eficacia.length) {
      html += '<div class="bloque"><h3>Respuesta a la medicación</h3><table class="tabla"><thead><tr><th>Medicamento</th>' +
        '<th class="num">Tomas</th><th class="num">Alivio completo</th><th class="num">Parcial</th><th class="num">Sin alivio</th><th class="num">Sin valorar</th></tr></thead><tbody>' +
        r.eficacia.map(function (e) {
          return '<tr><td>' + esc(e.nombre) + '</td><td class="num">' + e.tomas + '</td><td class="num">' + e.completa +
            '</td><td class="num">' + e.parcial + '</td><td class="num">' + e.nada + '</td><td class="num">' + e.sinDato + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }

    var preventivos = datos.meds.filter(function (m) { return m.tipo === 'preventivo'; });
    if (preventivos.length) {
      html += '<div class="bloque"><h3>Tratamiento preventivo</h3><p>' + preventivos.map(function (m) { return esc(m.nombre); }).join(', ') + '</p></div>';
    }

    html += '<div class="rejilla-2">' +
      tablaFrecuencias('Síntomas acompañantes', r.sintomas, r.numEpisodios) +
      tablaFrecuencias('Desencadenantes señalados', r.desencadenantes, r.numEpisodios) +
      tablaFrecuencias('Localización', r.localizacion, r.numEpisodios) +
      tablaFrecuencias('Tipo de dolor', r.caracter, r.numEpisodios) +
      tablaFrecuencias('Limitación de la actividad', r.discapacidad, r.numEpisodios, DISCAPACIDAD) +
      '</div>';

    html += '<div class="bloque salto"><h3>Detalle de episodios</h3><table class="tabla detalle"><thead><tr>' +
      '<th>Inicio</th><th>Duración</th><th class="num">Int.</th><th>Síntomas</th><th>Medicación</th><th>Notas</th></tr></thead><tbody>' +
      r.episodios.map(function (ep) {
        var sint = (ep.sintomas || []).slice();
        if (ep.aura) sint.unshift('aura');
        var tomas = (ep.tomas || []).map(function (t) {
          var m = medPorId(t.medId);
          return esc(m ? m.nombre : '?') + ' ' + hora(t.hora) + (t.eficacia ? ' (' + EFICACIA[t.eficacia] + ')' : '');
        });
        return '<tr><td>' + fechaCorta(ep.inicio.slice(0, 10)) + ' ' + hora(ep.inicio) + '</td><td>' + horas(E.duracionHoras(ep)) +
          '</td><td class="num">' + ep.intensidad + '</td><td>' + esc(sint.join(', ')) + '</td><td>' + tomas.join('<br>') +
          '</td><td>' + esc(ep.notas || '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';

    cont.innerHTML = html;
  }

  // ---------- datos y ajustes ----------

  var formAjustes = $('#form-ajustes');
  formAjustes.paciente.value = datos.ajustes.paciente;
  formAjustes.neurologa.value = datos.ajustes.neurologa;
  formAjustes.addEventListener('submit', function (ev) {
    ev.preventDefault();
    datos.ajustes.paciente = formAjustes.paciente.value.trim();
    datos.ajustes.neurologa = formAjustes.neurologa.value.trim();
    persistir();
    avisar('Ajustes guardados.');
  });

  $('#exportar-json').addEventListener('click', function () {
    D.descargar('diario-migranas-' + hoy() + '.json', JSON.stringify(datos, null, 2), 'application/json');
  });

  $('#exportar-csv').addEventListener('click', function () {
    D.descargar('episodios-migranas-' + hoy() + '.csv', D.aCSV(datos), 'text/csv;charset=utf-8');
  });

  $('#importar-json').addEventListener('change', function (ev) {
    var archivo = ev.target.files[0];
    ev.target.value = '';
    if (!archivo) return;
    var lector = new FileReader();
    lector.onload = function () {
      var nuevos;
      try {
        nuevos = D.normalizar(JSON.parse(lector.result));
      } catch (e) {
        avisar('El archivo no es una copia de seguridad válida.', true);
        return;
      }
      if (!confirm('Se sustituirán los datos actuales por los de la copia (' + nuevos.episodios.length +
        ' episodios, ' + nuevos.meds.length + ' medicamentos). ¿Continuar?')) return;
      datos = nuevos;
      persistir();
      formAjustes.paciente.value = datos.ajustes.paciente;
      formAjustes.neurologa.value = datos.ajustes.neurologa;
      limpiarFormulario();
      avisar('Copia restaurada.');
    };
    lector.readAsText(archivo);
  });

  // ---------- inicio ----------

  limpiarFormulario();
  if (!datos.meds.length && !datos.episodios.length) {
    $('#estado-datos').textContent = 'Consejo: empieza añadiendo tus medicamentos en la pestaña Medicación.';
  }
})();

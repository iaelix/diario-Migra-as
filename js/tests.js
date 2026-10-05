/*
 * Cuestionarios para la neuróloga (ASC-12, EQ-5D, MSQ, MIDAS, HIT-6, HADS,
 * BAI, BDI-2, ISI, PGI-I), con los mismos textos, opciones y puntuaciones que
 * el diario anterior, para que las respuestas guardadas sigan valiendo.
 *
 * Las respuestas se guardan como { "test.pregunta": valor }, donde valor es la
 * posición de la opción elegida (desde 0) o el número escrito.
 */
(function (global) {
  'use strict';

  const opc = (lista, desde = 0) => lista.map((t, i) => ({ t, p: desde + i }));
  const OP_ASC = [{ t: 'No aplica', p: 0 }, { t: 'Nunca', p: 0 }, { t: 'Rara vez', p: 0 }, { t: 'A veces', p: 1 }, { t: 'Casi siempre', p: 2 }];
  const OP_MSQ = opc(['Nunca', 'Rara vez', 'Algunas veces', 'Muchas veces', 'La mayor parte del tiempo', 'Siempre'], 1);
  const OP_HIT = [{ t: 'Nunca', p: 6 }, { t: 'Pocas veces', p: 8 }, { t: 'A veces', p: 10 }, { t: 'Muy a menudo', p: 11 }, { t: 'Siempre', p: 13 }];
  const OP_BAI = opc(['En absoluto', 'Levemente', 'Moderadamente', 'Severamente']);
  const OP_ISI_GRAVE = opc(['Nada', 'Leve', 'Moderado', 'Grave', 'Muy grave']);
  const OP_ISI_MEDIDA = opc(['Nada', 'Un poco', 'Algo', 'Mucho', 'Muchísimo']);
  const OP_ISI_SATISF = opc(['0 - Muy satisfecho', '1', '2 - Moderadamente satisfecho', '3', '4 - Muy insatisfecho']);
  const OP_PGI = opc(['Muchísimo mejor', 'Mucho mejor', 'Un poco mejor', 'Ningún cambio', 'Un poco peor', 'Mucho peor', 'Muchísimo peor'], 1);

  const item = (id, n, txt, extra) => Object.assign({ id, n, txt }, extra || {});
  const numItem = (id, n, txt, min, max, extra) => item(id, n, txt, Object.assign({ num: { min, max } }, extra || {}));

  const eq = (id, n, titulo, textos) => item(id, n, titulo, { ops: textos.map((t, i) => ({ t: 'abcde'[i] + '. ' + t, p: i + 1 })) });

  const hads = (id, n, sub, txt, textos, puntos) => item(id, n, txt, { sub, ops: textos.map((t, i) => ({ t: `${puntos[i]}  ${t}`, p: puntos[i] })) });

  const bdi = (id, n, titulo, textos, codigos) => {
    const cods = codigos || textos.map((_, i) => String(i));
    return item(id, n, titulo, { ops: textos.map((t, i) => ({ t: `${cods[i]}  ${t}`, p: parseInt(cods[i], 10) })) });
  };

  const TESTS = [
    {
      id: 'asc12', corto: 'ASC-12', titulo: 'Escala de alodinia ASC-12',
      intro: 'Durante una cefalea intensa, ¿con qué frecuencia experimenta empeoramiento del dolor o sensación molesta en su piel al realizar estas acciones?',
      ops: OP_ASC,
      items: [
        'Peinar su cabello', 'Tirar del pelo hacia atrás (p.e. coleta)', 'Afeitarte la cara', 'Usar gafas', 'Usar lentillas', 'Usar pendientes',
        'Usar collares', 'Usar ropa ajustada', 'Darte una ducha (cuando el agua de la ducha golpea su cara)', 'Apoyar su cabeza o su cara sobre una almohada',
        'Exposición al calor (p.e. cocinar, lavarse la cara con agua caliente)', 'Exposición al frío (p.e. usar una bolsa de hielo, lavarse la cara con agua fría)'
      ].map((t, i) => item('i' + (i + 1), i + 1, t)),
      res(t, r) {
        const s = sumaTest(t, r);
        const g = s.suma <= 2 ? 'Ninguna' : s.suma <= 5 ? 'Leve' : s.suma <= 8 ? 'Moderada' : 'Grave';
        return { lineas: [`Puntuación total: ${s.suma} (de 0 a 24)`, `Alodinia: ${g}`], hecho: s.resp === t.items.length };
      },
      nota: 'La hoja da estos tramos: ninguna 0-2, leve 3-5, moderada 6-8, grave 9 o más.'
    },
    {
      id: 'eq5d', corto: 'Calidad de vida', titulo: 'Escala de calidad de vida (EQ-5D)',
      intro: 'Marca en cada apartado la frase que mejor describa tu salud HOY. Al final, la escala de 0 a 100.',
      columna: true,
      items: [
        eq('mov', 1, '1) Movilidad', ['No tengo problemas para caminar', 'Tengo problemas leves para caminar', 'Tengo problemas moderados para caminar', 'Tengo problemas graves para caminar', 'No puedo caminar']),
        eq('cuid', 2, '2) Autocuidado', ['No tengo problemas para lavarme o vestirme', 'Tengo problemas leves para lavarme o vestirme', 'Tengo problemas moderados para lavarme o vestirme', 'Tengo problemas graves para lavarme o vestirme', 'No puedo lavarme o vestirme']),
        eq('dolor', 3, '3) Dolor, malestar', ['No tengo dolor ni malestar', 'Tengo dolor o malestar leve', 'Tengo dolor o malestar moderado', 'Tengo dolor o malestar severo', 'Tengo dolor o malestar extremo']),
        eq('act', 4, '4) Actividades cotidianas (trabajar, estudiar, hacer tareas domésticas, actividades familiares, actividades durante el tiempo libre...)', ['No tengo problemas para realizar las actividades cotidianas', 'Tengo problemas leves para realizar las actividades cotidianas', 'Tengo problemas moderados para realizar las actividades cotidianas', 'Tengo problemas graves para realizar las actividades cotidianas', 'No puedo realizar las actividades cotidianas']),
        eq('ans', 5, '5) Ansiedad, depresión', ['No estoy ansioso ni depresivo', 'Estoy levemente ansioso y/o depresivo', 'Estoy moderadamente ansioso y/o depresivo', 'Estoy muy ansioso y/o depresivo', 'Estoy extremadamente ansioso y/o depresivo']),
        numItem('vas', 6, 'Escala de salud de hoy, de 0 a 100: 0 es la peor salud que puedas imaginar y 100 la mejor. ¿En qué número estás hoy?', 0, 100)
      ],
      res(t, r) {
        const cod = ['mov', 'cuid', 'dolor', 'act', 'ans'].map(k => r['eq5d.' + k] === undefined ? '?' : String(r['eq5d.' + k] + 1));
        const v = r['eq5d.vas'];
        return { lineas: [`Perfil (movilidad, autocuidado, dolor, actividades, ánimo): ${cod.join('-')}`, `Salud hoy: ${v === undefined ? 'sin contestar' : v + ' de 100'}`], hecho: !cod.includes('?') && v !== undefined };
      },
      nota: 'En el perfil, 1 es sin problemas y 5 es el extremo. La hoja no trae tabla de resultados.'
    },
    {
      id: 'msq', corto: 'MSQ', titulo: 'Cuestionario de calidad de vida para la migraña (MSQ 2.1)',
      intro: 'Al responder, piense en todos los ataques de migraña que pudo haber tenido en las últimas 4 semanas. Seleccione solo una respuesta en cada pregunta.',
      ops: OP_MSQ,
      items: [
        'En las últimas 4 semanas, ¿con qué frecuencia las migrañas interfirieron en lo bien que pudo relacionarse con su familia, amigos y otras personas cercanas a usted?',
        'En las últimas 4 semanas, ¿con qué frecuencia las migrañas interfirieron con sus actividades de placer, como leer o hacer ejercicio?',
        'En las últimas 4 semanas, ¿con qué frecuencia tuvo dificultad para desempeñarse en su trabajo o para realizar sus actividades diarias por causa de los síntomas de migraña?',
        'En las últimas 4 semanas, ¿con qué frecuencia las migrañas evitaron que hiciera mucho de lo que debía hacer en su trabajo o en casa?',
        'En las últimas 4 semanas, ¿con qué frecuencia las migrañas limitaron su capacidad para concentrarse en su trabajo o en sus actividades diarias?',
        'En las últimas 4 semanas, ¿con qué frecuencia las migrañas lo/la dejaron demasiado cansado/a como para trabajar o realizar sus actividades diarias?',
        'En las últimas 4 semanas, ¿con qué frecuencia las migrañas limitaron el número de días que se sintió con energía?',
        'En las últimas 4 semanas, ¿con qué frecuencia tuvo que cancelar su trabajo o sus actividades diarias por causa de las migrañas?',
        'En las últimas 4 semanas, ¿con qué frecuencia necesitó ayuda para llevar a cabo tareas rutinarias como tareas domésticas diarias, actividades necesarias, comprar o cuidar a otras personas, mientras tuvo migraña?',
        'En las últimas 4 semanas, ¿con qué frecuencia tuvo que detener su trabajo o sus actividades diarias para ocuparse de los síntomas de la migraña?',
        'En las últimas 4 semanas, ¿con qué frecuencia no pudo asistir a actividades sociales como fiestas o cenas con amigos por causa de las migrañas?',
        'En las últimas 4 semanas, ¿con qué frecuencia se sintió fastidiado/a o frustrado/a por causa de las migrañas?',
        'En las últimas 4 semanas, ¿con qué frecuencia sintió que era una carga para los demás por causa de las migrañas?',
        'En las últimas 4 semanas, ¿con qué frecuencia tuvo temor de decepcionar a otras personas por causa de las migrañas?'
      ].map((t, i) => item('i' + (i + 1), i + 1, t)),
      res(t, r) {
        const s = sumaTest(t, r);
        return { lineas: [`Suma de las respuestas: ${s.suma} (de 14 a 84; más puntos, más afectación)`], hecho: s.resp === t.items.length };
      },
      nota: 'La hoja no trae tabla de resultados, así que solo se suma. Lo interpreta tu neuróloga.'
    },
    {
      id: 'midas', corto: 'MIDAS', titulo: 'Escala MIDAS',
      intro: 'Este cuestionario define la pérdida de días en todas las áreas (personal, profesional y familiar) durante los últimos 3 meses por haber sufrido crisis de migraña. Escriba un 0 si la cefalea no ha afectado su actividad en los últimos 3 meses.',
      items: [
        numItem('q1', 1, '¿Cuántos días en los últimos 3 meses no ha podido ir a trabajar por su cefalea?', 0, 92),
        numItem('q2', 2, '¿Cuántos días en los últimos 3 meses se redujo por la mitad su productividad en el trabajo por sus cefaleas? (No incluya los días que ha incluido en la pregunta 1)', 0, 92),
        numItem('q3', 3, '¿Cuántos días en los últimos 3 meses no ha realizado sus tareas domésticas por sus cefaleas?', 0, 92),
        numItem('q4', 4, '¿Cuántos días en los últimos 3 meses se redujo por la mitad su productividad en la realización de tareas domésticas por la presencia de cefalea? (No incluya los días mencionados en la pregunta 3)', 0, 92),
        numItem('q5', 5, '¿Cuántos días en los últimos 3 meses se perdió actividades familiares, sociales o lúdicas por sus cefaleas?', 0, 92),
        numItem('a', 'A', '¿Cuántos días en los últimos 3 meses sufrió de cefalea? (Si el dolor ha durado más de un día, contabilizar días por separado)', 0, 92, { ayuda: 'midasA' }),
        numItem('b', 'B', 'En una escala de 0-10, ¿cómo se podría puntuar el dolor sufrido con su cefalea? (Donde 0 = sin dolor, y 10 = dolor intenso)', 0, 10, { ayuda: 'midasB' })
      ],
      res(t, r) {
        const qs = ['q1', 'q2', 'q3', 'q4', 'q5'];
        const resp = qs.filter(k => r['midas.' + k] !== undefined);
        const total = qs.reduce((s, k) => s + (r['midas.' + k] || 0), 0);
        const g = total <= 5 ? 'Discapacidad nula o mínima' : total <= 10 ? 'Discapacidad leve' : total <= 20 ? 'Discapacidad moderada' : 'Discapacidad grave';
        const lin = [`Puntuación total (preguntas 1 a 5): ${total}`, `Grado MIDAS: ${g}`];
        lin.push(`A. Días con cefalea: ${r['midas.a'] === undefined ? 'sin contestar' : r['midas.a']}`);
        lin.push(`B. Dolor de 0 a 10: ${r['midas.b'] === undefined ? 'sin contestar' : r['midas.b']}`);
        return { lineas: lin, hecho: resp.length === 5 && r['midas.a'] !== undefined && r['midas.b'] !== undefined };
      },
      nota: 'La hoja da estos tramos: 0-5 nula o mínima, 6-10 leve, 11-20 moderada. Para grave, la hoja pone «>21»; aquí cuento 21 o más, que es lo habitual.'
    },
    {
      id: 'hit6', corto: 'HIT-6', titulo: 'Escala HIT-6',
      intro: 'En cada pregunta, marque la casilla que corresponda a su respuesta.',
      ops: OP_HIT,
      items: [
        item('i1', 1, 'Cuando usted tiene dolor de cabeza, ¿con qué frecuencia el dolor es intenso?', { ayuda: 'hit1' }),
        item('i2', 2, '¿Con qué frecuencia el dolor de cabeza limita su capacidad para realizar actividades diarias habituales? (Tareas domésticas, el trabajo, los estudios o actividades sociales)'),
        item('i3', 3, 'Cuando tiene dolor de cabeza, ¿con qué frecuencia desearía poder acostarse?'),
        item('i4', 4, 'En las últimas 4 semanas, ¿con qué frecuencia se ha sentido demasiado cansada/o para trabajar o realizar las actividades diarias debido a su dolor de cabeza?'),
        item('i5', 5, 'En las últimas 4 semanas, ¿con qué frecuencia se ha sentido harta/o o irritada/o debido a su dolor de cabeza?'),
        item('i6', 6, 'En las últimas 4 semanas, ¿con qué frecuencia el dolor de cabeza ha limitado su capacidad para concentrarse en el trabajo o en las actividades diarias?')
      ],
      res(t, r) {
        const s = sumaTest(t, r);
        return { lineas: [`Puntuación: ${s.suma} (de 36 a 78)`], hecho: s.resp === t.items.length };
      },
      nota: 'Puntos de la hoja: Nunca 6, Pocas veces 8, A veces 10, Muy a menudo 11, Siempre 13. La hoja no trae tabla de resultados.'
    },
    {
      id: 'hads', corto: 'HADS', titulo: 'Escala hospitalaria de ansiedad y depresión (HADS)',
      intro: 'Lea cada pregunta y marque la que usted considere que coincide con su propio estado emocional en la última semana. No es necesario que piense mucho tiempo cada respuesta: las respuestas espontáneas tienen más valor que las que se piensan mucho.',
      columna: true,
      items: [
        hads('a1', 'A.1', 'A', 'Me siento tenso/a o nervioso/a:', ['Casi todo el día', 'Gran parte del día', 'De vez en cuando', 'Nunca'], [3, 2, 1, 0]),
        hads('d1', 'D.1', 'D', 'Sigo disfrutando de las cosas como siempre:', ['Ciertamente igual que antes', 'No tanto como antes', 'Solamente un poco', 'Ya no disfruto con nada'], [0, 1, 2, 3]),
        hads('a2', 'A.2', 'A', 'Siento una especie de temor como si algo malo fuera a suceder:', ['Sí, y muy intenso', 'Sí, pero no muy intenso', 'Sí, pero no me preocupa', 'No siento nada de eso'], [3, 2, 1, 0]),
        hads('d2', 'D.2', 'D', 'Soy capaz de reírme y ver el lado gracioso de las cosas:', ['Igual que siempre', 'Actualmente algo menos', 'Actualmente mucho menos', 'Actualmente en absoluto'], [0, 1, 2, 3]),
        hads('a3', 'A.3', 'A', 'Tengo la cabeza llena de preocupaciones:', ['Casi todo el día', 'Gran parte del día', 'De vez en cuando', 'Nunca'], [3, 2, 1, 0]),
        hads('d3', 'D.3', 'D', 'Me siento alegre:', ['Nunca', 'Muy pocas veces', 'En algunas ocasiones', 'Gran parte del día'], [3, 2, 1, 0]),
        hads('a4', 'A.4', 'A', 'Soy capaz de permanecer sentado/a, tranquilo/a y relajado/a:', ['Siempre', 'A menudo', 'A veces', 'Nunca'], [0, 1, 2, 3]),
        hads('d4', 'D.4', 'D', 'Me siento lento/a y torpe:', ['Gran parte del día', 'A menudo', 'A veces', 'Nunca'], [3, 2, 1, 0]),
        hads('a5', 'A.5', 'A', 'Experimento una desagradable sensación de «nervios y hormigueos» en el estómago:', ['Nunca', 'Sólo en algunas ocasiones', 'A menudo', 'Muy a menudo'], [0, 1, 2, 3]),
        hads('d5', 'D.5', 'D', 'He perdido el interés por mi aspecto personal:', ['Completamente', 'No me cuido como debería hacerlo', 'Es posible que no me cuide como debiera', 'Me cuido como siempre lo he hecho'], [3, 2, 1, 0]),
        hads('a6', 'A.6', 'A', 'Me siento inquieto/a como si no pudiera parar de moverme:', ['Realmente mucho', 'Bastante', 'No mucho', 'En absoluto'], [3, 2, 1, 0]),
        hads('d6', 'D.6', 'D', 'Espero las cosas con ilusión:', ['Como siempre', 'Algo menos que antes', 'Mucho menos que antes', 'En absoluto'], [0, 1, 2, 3]),
        hads('a7', 'A.7', 'A', 'Experimento de repente sensaciones de gran angustia o temor:', ['Muy a menudo', 'Con cierta frecuencia', 'Raramente', 'Nunca'], [3, 2, 1, 0]),
        hads('d7', 'D.7', 'D', 'Soy capaz de disfrutar con un buen libro o con un buen programa de radio o televisión:', ['A menudo', 'Algunas veces', 'Pocas veces', 'Casi nunca'], [0, 1, 2, 3])
      ],
      res(t, r) {
        const a = sumaTest(t, r, it => it.sub === 'A'), d = sumaTest(t, r, it => it.sub === 'D');
        const lin = [`Ansiedad (A): ${a.suma} de 21`, `Depresión (D): ${d.suma} de 21 (con el reparto habitual en D.3)`];
        const v3 = r['hads.d3'];
        if (v3 !== undefined && v3 !== 3 - v3) lin.push(`Depresión (D) con los números de D.3 tal como están impresos en tu hoja: ${d.suma - (3 - v3) + v3} de 21`);
        return { lineas: lin, hecho: a.resp + d.resp === t.items.length };
      },
      nota: 'La hoja no trae tabla de resultados, así que solo se suman las dos partes. En D.3 («Me siento alegre») tu hoja imprime los números al revés de lo normal (Nunca 0 … Gran parte del día 3). El reparto habitual es Nunca 3, Muy pocas veces 2, En algunas ocasiones 1, Gran parte del día 0, y es el que cuenta en la suma principal. Debajo sale también la cuenta con los números de tu hoja. Conviene que tu neuróloga diga cuál vale.'
    },
    {
      id: 'bai', corto: 'BAI', titulo: 'Inventario de Ansiedad de Beck (BAI)',
      intro: 'En el cuestionario hay una lista de síntomas comunes de la ansiedad. Lea cada uno de los ítems atentamente e indique cuánto le ha afectado en la última semana incluyendo hoy.',
      ops: OP_BAI,
      items: [
        'Torpe o entumecido', 'Acalorado', 'Con temblor en las piernas', 'Incapaz de relajarse', 'Con temor a que ocurra lo peor', 'Mareado, o que se le va la cabeza',
        'Con latidos del corazón fuertes y acelerados', 'Inestable', 'Atemorizado o asustado', 'Nervioso', 'Con sensación de bloqueo', 'Con temblores en las manos',
        'Inquieto, inseguro', 'Con miedo a perder el control', 'Con sensación de ahogo', 'Con temor a morir', 'Con miedo', 'Con problemas digestivos',
        'Con desvanecimientos', 'Con rubor facial', 'Con sudores, fríos o calientes'
      ].map((t, i) => item('i' + (i + 1), i + 1, t)),
      res(t, r) {
        const s = sumaTest(t, r);
        return { lineas: [`Puntuación total: ${s.suma} (de 0 a 63)`], hecho: s.resp === t.items.length };
      },
      nota: 'Puntos: En absoluto 0, Levemente 1, Moderadamente 2, Severamente 3. La hoja no trae tabla de resultados.'
    },
    {
      id: 'bdi', corto: 'BDI-2', titulo: 'Inventario de Depresión de Beck (BDI-2)',
      intro: 'Este cuestionario consta de 21 grupos de afirmaciones. Lea con atención cada uno de ellos. Luego elija uno de cada grupo, el que mejor describa el modo como se ha sentido las últimas dos semanas, incluyendo el día de hoy. Si varios enunciados de un mismo grupo le parecen igualmente apropiados, marque el número más alto. Verifique que no haya elegido más de uno por grupo, incluyendo el ítem 16 (cambios en los hábitos de sueño) y el ítem 18 (cambios en el apetito).',
      columna: true,
      items: [
        bdi('i1', 1, '1. Tristeza', ['No me siento triste.', 'Me siento triste gran parte del tiempo.', 'Me siento triste todo el tiempo.', 'Me siento tan triste o soy tan infeliz que no puedo soportarlo.']),
        bdi('i2', 2, '2. Pesimismo', ['No estoy desalentado respecto de mi futuro.', 'Me siento más desalentado respecto de mi futuro que lo que solía estarlo.', 'No espero que las cosas funcionen para mí.', 'Siento que no hay esperanza para mi futuro y que sólo puede empeorar.']),
        bdi('i3', 3, '3. Fracaso', ['No me siento como un fracasado.', 'He fracasado más de lo que hubiera debido.', 'Cuando miro hacia atrás, veo muchos fracasos.', 'Siento que como persona soy un fracaso total.']),
        bdi('i4', 4, '4. Pérdida de placer', ['Obtengo tanto placer como siempre por las cosas de las que disfruto.', 'No disfruto tanto de las cosas como solía hacerlo.', 'Obtengo muy poco placer de las cosas que solía disfrutar.', 'No puedo obtener ningún placer de las cosas de las que solía disfrutar.']),
        bdi('i5', 5, '5. Sentimientos de culpa', ['No me siento particularmente culpable.', 'Me siento culpable respecto de varias cosas que he hecho o que debería haber hecho.', 'Me siento bastante culpable la mayor parte del tiempo.', 'Me siento culpable todo el tiempo.']),
        bdi('i6', 6, '6. Sentimientos de castigo', ['No siento que esté siendo castigado.', 'Siento que tal vez pueda ser castigado.', 'Espero ser castigado.', 'Siento que estoy siendo castigado.']),
        bdi('i7', 7, '7. Disconformidad con uno mismo', ['Siento acerca de mí lo mismo que siempre.', 'He perdido la confianza en mí mismo.', 'Estoy decepcionado conmigo mismo.', 'No me gusto a mí mismo.']),
        bdi('i8', 8, '8. Autocrítica', ['No me critico ni me culpo más de lo habitual.', 'Estoy más crítico conmigo mismo de lo que solía estarlo.', 'Me critico a mí mismo por todos mis errores.', 'Me culpo a mí mismo por todo lo malo que sucede.']),
        bdi('i9', 9, '9. Pensamientos o deseos suicidas', ['No tengo ningún pensamiento de matarme.', 'He tenido pensamientos de matarme, pero no lo haría.', 'Querría matarme.', 'Me mataría si tuviera la oportunidad de hacerlo.']),
        bdi('i10', 10, '10. Llanto', ['No lloro más de lo que solía hacerlo.', 'Lloro más de lo que solía hacerlo.', 'Lloro por cualquier pequeñez.', 'Siento ganas de llorar pero no puedo.']),
        bdi('i11', 11, '11. Agitación', ['No estoy más inquieto o tenso que lo habitual.', 'Me siento más inquieto o tenso que lo habitual.', 'Estoy tan inquieto o agitado que me es difícil quedarme quieto.', 'Estoy tan inquieto o agitado que tengo que estar siempre en movimiento o haciendo algo.']),
        bdi('i12', 12, '12. Pérdida de interés', ['No he perdido el interés en otras actividades o personas.', 'Estoy menos interesado que antes en otras personas o cosas.', 'He perdido casi todo el interés en otras personas o cosas.', 'Me es difícil interesarme por algo.']),
        bdi('i13', 13, '13. Indecisión', ['Tomo mis propias decisiones tan bien como siempre.', 'Me resulta más difícil que de costumbre tomar decisiones.', 'Encuentro mucha más dificultad que antes para tomar decisiones.', 'Tengo problemas para tomar cualquier decisión.']),
        bdi('i14', 14, '14. Desvalorización', ['No siento que yo no sea valioso.', 'No me considero a mí mismo tan valioso y útil como solía considerarme.', 'Me siento menos valioso cuando me comparo con otros.', 'Siento que no valgo nada.']),
        bdi('i15', 15, '15. Pérdida de energía', ['Tengo tanta energía como siempre.', 'Tengo menos energía que la que solía tener.', 'No tengo suficiente energía para hacer demasiado.', 'No tengo energía suficiente para hacer nada.']),
        bdi('i16', 16, '16. Cambios en los hábitos de sueño', ['No he experimentado ningún cambio en mis hábitos de sueño.', 'Duermo un poco más que lo habitual.', 'Duermo un poco menos que lo habitual.', 'Duermo mucho más que lo habitual.', 'Duermo mucho menos que lo habitual.', 'Duermo la mayor parte del día.', 'Me despierto 1-2 horas más temprano y no puedo volver a dormirme.'], ['0', '1a', '1b', '2a', '2b', '3a', '3b']),
        bdi('i17', 17, '17. Irritabilidad', ['No estoy tan irritable que lo habitual.', 'Estoy más irritable que lo habitual.', 'Estoy mucho más irritable que lo habitual.', 'Estoy irritable todo el tiempo.']),
        bdi('i18', 18, '18. Cambios en el apetito', ['No he experimentado ningún cambio en mi apetito.', 'Mi apetito es un poco menor que lo habitual.', 'Mi apetito es un poco mayor que lo habitual.', 'Mi apetito es mucho menor que antes.', 'Mi apetito es mucho mayor que lo habitual.', 'No tengo apetito en absoluto.', 'Quiero comer todo el día.'], ['0', '1a', '1b', '2a', '2b', '3a', '3b']),
        bdi('i19', 19, '19. Dificultad de concentración', ['Puedo concentrarme tan bien como siempre.', 'No puedo concentrarme tan bien como habitualmente.', 'Me es difícil mantener la mente en algo por mucho tiempo.', 'Encuentro que no puedo concentrarme en nada.']),
        bdi('i20', 20, '20. Cansancio o fatiga', ['No estoy más cansado o fatigado que lo habitual.', 'Me fatigo o me canso más fácilmente que lo habitual.', 'Estoy demasiado fatigado o cansado para hacer muchas de las cosas que solía hacer.', 'Estoy demasiado fatigado o cansado para hacer la mayoría de las cosas que solía hacer.']),
        bdi('i21', 21, '21. Pérdida de interés en el sexo', ['No he notado ningún cambio reciente en mi interés por el sexo.', 'Estoy menos interesado en el sexo de lo que solía estarlo.', 'Estoy mucho menos interesado en el sexo.', 'He perdido completamente el interés en el sexo.'])
      ],
      res(t, r) {
        const s = sumaTest(t, r);
        return { lineas: [`Puntaje total: ${s.suma} (de 0 a 63)`], hecho: s.resp === t.items.length };
      },
      nota: 'En los grupos 16 y 18, 1a y 1b valen 1, 2a y 2b valen 2, 3a y 3b valen 3. La hoja no trae tabla de resultados.'
    },
    {
      id: 'isi', corto: 'ISI', titulo: 'ISI (Insomnia Severity Index): Índice de Gravedad del Insomnio',
      intro: 'Indica la gravedad de tu actual problema de sueño y cómo te afecta.',
      items: [
        item('i1a', '1a', '1. Gravedad de tu actual problema de sueño: dificultad para quedarse dormido/a', { ops: OP_ISI_GRAVE }),
        item('i1b', '1b', '1. Gravedad de tu actual problema de sueño: dificultad para permanecer dormido/a', { ops: OP_ISI_GRAVE }),
        item('i1c', '1c', '1. Gravedad de tu actual problema de sueño: despertarse muy temprano', { ops: OP_ISI_GRAVE }),
        item('i2', 2, '2. ¿Cómo estás de satisfecho/a en la actualidad con tu sueño?', { ops: OP_ISI_SATISF }),
        item('i3', 3, '3. ¿En qué medida consideras que tu problema de sueño interfiere con tu funcionamiento diario (fatiga durante el día, capacidad para las tareas cotidianas/trabajo, concentración, memoria, estado de ánimo, etc.)?', { ops: OP_ISI_MEDIDA }),
        item('i4', 4, '4. ¿En qué medida crees que los demás se dan cuenta de tu problema de sueño por lo que afecta a tu calidad de vida?', { ops: OP_ISI_MEDIDA }),
        item('i5', 5, '5. ¿Cómo estás de preocupado/a por tu actual problema de sueño?', { ops: OP_ISI_MEDIDA })
      ],
      res(t, r) {
        const s = sumaTest(t, r);
        const g = s.suma <= 7 ? 'Ausencia de insomnio clínico' : s.suma <= 14 ? 'Insomnio subclínico' : s.suma <= 21 ? 'Insomnio clínico (moderado)' : 'Insomnio clínico (grave)';
        return { lineas: [`Puntuación total: ${s.suma} (de 0 a 28)`, g], hecho: s.resp === t.items.length };
      },
      nota: 'La hoja da estos tramos: 0-7 ausencia de insomnio clínico, 8-14 subclínico, 15-21 clínico moderado, 22-28 clínico grave.'
    },
    {
      id: 'pgi', corto: 'PGI-I', titulo: 'Escala de Impresión de Mejoría Global del Paciente (PGI-I)',
      intro: 'Una sola pregunta: clasifica el alivio obtenido con el tratamiento que sigues, en una escala de siete puntos.',
      columna: true,
      items: [item('i1', 1, 'Alivio obtenido con el tratamiento que sigue', { ops: OP_PGI })],
      res(t, r) {
        const v = r['pgi.i1'];
        return { lineas: [v === undefined ? 'Sin contestar' : `Respuesta: ${OP_PGI[v].t} (${OP_PGI[v].p} de 7)`], hecho: v !== undefined };
      },
      nota: 'En tu foto los números salen un renglón más abajo que los textos. Aquí uso lo habitual: 1 muchísimo mejor ... 7 muchísimo peor.'
    }
  ];

  function sumaTest(t, r, filtro) {
    let suma = 0, resp = 0;
    t.items.forEach(it => {
      if (filtro && !filtro(it)) return;
      const v = r[t.id + '.' + it.id];
      const ops = it.ops || t.ops;
      if (ops && v !== undefined && ops[v]) { suma += ops[v].p; resp++; }
    });
    return { suma, resp };
  }

  function progresoTest(t, r) {
    const total = t.items.length;
    const resp = t.items.filter(it => r[t.id + '.' + it.id] !== undefined).length;
    return { resp, total };
  }

  var api = { TESTS: TESTS, sumaTest: sumaTest, progresoTest: progresoTest };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.Tests = api;
})(this);

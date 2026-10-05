# diario-Migra-as
Mi diario de migrañas: registro de dolor, medicación e informes para la neuróloga.

## Uso

Abre `index.html` en el navegador (doble clic basta; no necesita servidor ni instalación).
También se puede publicar tal cual con GitHub Pages para usarlo desde el móvil.

- **Registrar**: inicio y fin del episodio, intensidad 0–10, localización, tipo de dolor,
  síntomas (náuseas, fotofobia…), aura, desencadenantes, tomas de medicación con su efecto,
  cuánto te limitó y notas.
- **Historial**: lista de episodios para revisar, editar o borrar.
- **Calendario**: vista mensual coloreada por intensidad, con marca en los días de medicación aguda.
- **Medicación**: tus medicamentos y su tipo (triptán, AINE, preventivo…).
- **Informe**: resumen del periodo elegido para llevar a consulta — días de dolor, días intensos,
  intensidad y duración media, días con medicación aguda por mes, respuesta a cada medicamento,
  síntomas y desencadenantes más frecuentes, calendario y detalle de episodios.
  Se imprime o se guarda como PDF con el botón *Imprimir / PDF*.
  Avisa de un posible uso excesivo de medicación según el criterio orientativo de la ICHD-3
  (≥10 días/mes con triptanes, ergóticos, opioides o combinados; ≥15 con analgésicos simples o AINE).
- **Datos**: nombre para el informe, copia de seguridad (.json), restauración y exportación a CSV.

## Privacidad

Los datos se guardan solo en el `localStorage` del navegador donde uses la app; no se envían a
ningún sitio. Por eso conviene descargar una copia de seguridad de vez en cuando, y siempre antes
de borrar los datos del navegador o cambiar de dispositivo.

## Desarrollo

Sin dependencias. Los cálculos del informe están en `js/estadisticas.js` y tienen pruebas:

```sh
npm test
```

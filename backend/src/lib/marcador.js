// Validación de marcador (RF-08): sets al mejor de 5 (3 sets ganados) o al mejor de 7 (4 sets ganados),
// cada set a 11 puntos mínimo y con al menos 2 de diferencia.
const PUNTOS_MINIMOS = 11;
const MARGEN_MINIMO = 2;
const SETS_GANADOS_POR_FORMATO = [3, 4];

function validarMarcador(sets) {
  if (!Array.isArray(sets) || sets.length === 0) {
    return { valido: false, error: 'Debes enviar al menos un set' };
  }

  if (sets.length > 7) {
    return { valido: false, error: 'Un partido no puede tener más de 7 sets' };
  }

  for (let i = 0; i < sets.length; i++) {
    const a = Number(sets[i].puntosJugadorA);
    const b = Number(sets[i].puntosJugadorB);

    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
      return { valido: false, error: `Set ${i + 1}: los puntos deben ser enteros no negativos` };
    }

    const mayor = Math.max(a, b);
    const diferencia = Math.abs(a - b);

    if (mayor < PUNTOS_MINIMOS || diferencia < MARGEN_MINIMO) {
      return { valido: false, error: `Set ${i + 1}: marcador inválido (${a}-${b})` };
    }
  }

  for (const requeridos of SETS_GANADOS_POR_FORMATO) {
    let ganadosA = 0;
    let ganadosB = 0;
    let definidoEn = -1;

    for (let i = 0; i < sets.length; i++) {
      if (Number(sets[i].puntosJugadorA) > Number(sets[i].puntosJugadorB)) {
        ganadosA++;
      } else {
        ganadosB++;
      }
      if (definidoEn === -1 && (ganadosA === requeridos || ganadosB === requeridos)) {
        definidoEn = i;
      }
    }

    if (definidoEn === sets.length - 1) {
      return { valido: true, ganador: ganadosA === requeridos ? 'A' : 'B', setsGanadosA: ganadosA, setsGanadosB: ganadosB };
    }
  }

  return {
    valido: false,
    error: 'El marcador no corresponde a un partido válido al mejor de 5 o 7 sets (sets de más, de menos, o sin un ganador claro)',
  };
}

function limpiarSets(sets) {
  return sets.map((s, i) => ({
    numeroSet: i + 1,
    puntosJugadorA: Number(s.puntosJugadorA),
    puntosJugadorB: Number(s.puntosJugadorB),
  }));
}

module.exports = { validarMarcador, limpiarSets };

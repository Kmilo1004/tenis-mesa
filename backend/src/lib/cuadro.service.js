const { notificarPartidoProximo } = require('./notificaciones.service');

function siguientePotenciaDeDos(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

// Orden de siembra estándar de un cuadro de eliminación directa (para que las semillas
// altas no se crucen antes de la ronda final). Ej. tamaño 8 -> [1,8,4,5,2,7,3,6].
function ordenSiembra(tamano) {
  let seeds = [1];
  while (seeds.length < tamano) {
    const m = seeds.length * 2;
    const nuevos = [];
    for (const s of seeds) {
      nuevos.push(s);
      nuevos.push(m + 1 - s);
    }
    seeds = nuevos;
  }
  return seeds;
}

function nombreRonda(jugadoresEnRonda) {
  if (jugadoresEnRonda <= 2) return 'Final';
  if (jugadoresEnRonda === 4) return 'Semifinal';
  if (jugadoresEnRonda === 8) return 'Cuartos de final';
  if (jugadoresEnRonda === 16) return 'Octavos de final';
  return `Ronda de ${jugadoresEnRonda}`;
}

// Construye la estructura lógica del cuadro (RF-11), sin tocar la base de datos: un arreglo
// de niveles (nivel 0 = primera ronda, el último = la final). Cada nivel tiene sus pares.
// Cada slot de un par es: el id de un jugador (string), un marcador { pendiente: true } que
// representa "el ganador del partido correspondiente del nivel anterior", o null si ese cupo
// del cuadro quedó vacío (bye — el rival avanza directo, sin partido).
function construirEstructuraCuadro(participantesIds) {
  const tamano = siguientePotenciaDeDos(participantesIds.length);
  const orden = ordenSiembra(tamano);
  let slots = orden.map((semilla) => participantesIds[semilla - 1] || null);

  const niveles = [];

  while (slots.length > 1) {
    const pares = [];
    const siguientesSlots = [];

    for (let i = 0; i < slots.length; i += 2) {
      const a = slots[i];
      const b = slots[i + 1];
      pares.push({ a, b });
      siguientesSlots.push(a && b ? { pendiente: true } : a || b);
    }

    niveles.push({ nombreRonda: nombreRonda(slots.length), pares });
    slots = siguientesSlots;
  }

  return niveles;
}

// Crea en la base de datos (usando `client`, que puede ser `prisma` o un `tx` de una transacción)
// todos los partidos de un cuadro de eliminación directa a partir de una lista de participantes
// ya ordenada (sembrada), enlazando cada partido con el siguiente vía partidoSiguienteId/slotSiguiente
// (RF-11, RF-12). Se usa tanto para generar el cuadro de un torneo de eliminación directa como
// para el avance automático desde la fase de grupos en formato mixto (RF-11d).
async function crearPartidosDeCuadro(client, { torneo, participantesIds, registradoPor }) {
  const niveles = construirEstructuraCuadro(participantesIds);
  const idsPorNivel = [];

  for (let k = niveles.length - 1; k >= 0; k--) {
    idsPorNivel[k] = new Array(niveles[k].pares.length).fill(null);

    for (let i = 0; i < niveles[k].pares.length; i++) {
      const { a, b } = niveles[k].pares[i];
      if (!a || !b) continue; // bye: el jugador ya avanzó directo en la estructura, sin partido

      const jugadorAId = typeof a === 'string' ? a : null;
      const jugadorBId = typeof b === 'string' ? b : null;
      const esUltimoNivel = k === niveles.length - 1;

      const partido = await client.partido.create({
        data: {
          torneoId: torneo.id,
          ronda: niveles[k].nombreRonda,
          nivelRonda: k,
          jugadorAId,
          jugadorBId,
          tipoPartido: torneo.tipo === 'oficial' ? 'torneo_oficial' : 'torneo_flash',
          afectaRanking: torneo.tipo === 'oficial' ? 'oficial' : 'no_oficial',
          estado: jugadorAId && jugadorBId ? 'pendiente' : 'por_definir',
          fechaPartido: torneo.fechaInicio,
          registradoPor,
          partidoSiguienteId: esUltimoNivel ? null : idsPorNivel[k + 1][Math.floor(i / 2)],
          slotSiguiente: esUltimoNivel ? null : i % 2 === 0 ? 'A' : 'B',
        },
      });

      idsPorNivel[k][i] = partido.id;

      if (partido.estado === 'pendiente') {
        // RF-21: ambos jugadores de este partido ya se conocen desde ya, avisarles
        await notificarPartidoProximo(client, partido);
      }
    }
  }

  return client.partido.findMany({ where: { torneoId: torneo.id, grupoId: null }, orderBy: [{ nivelRonda: 'asc' }] });
}

module.exports = { siguientePotenciaDeDos, ordenSiembra, nombreRonda, construirEstructuraCuadro, crearPartidosDeCuadro };

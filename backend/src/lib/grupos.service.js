const { crearPartidosDeCuadro } = require('./cuadro.service');

// RF-11e: tabla de posiciones de un grupo (partidos jugados/ganados/perdidos, sets a favor/en
// contra), ordenada por partidos ganados y luego por diferencia de sets.
async function calcularTablaGrupo(client, grupoId) {
  const jugadores = await client.grupoJugador.findMany({
    where: { grupoId },
    include: { usuario: { select: { id: true, nombre: true } } },
  });

  const partidos = await client.partido.findMany({
    where: { grupoId, estado: 'confirmado' },
    include: { sets: true },
  });

  const estadisticas = new Map();
  jugadores.forEach((gj) => {
    estadisticas.set(gj.usuarioId, {
      usuarioId: gj.usuarioId,
      nombre: gj.usuario.nombre,
      jugados: 0,
      ganados: 0,
      perdidos: 0,
      setsFavor: 0,
      setsContra: 0,
    });
  });

  for (const partido of partidos) {
    const statsA = estadisticas.get(partido.jugadorAId);
    const statsB = estadisticas.get(partido.jugadorBId);
    if (!statsA || !statsB) continue;

    const setsA = partido.sets.filter((s) => s.puntosJugadorA > s.puntosJugadorB).length;
    const setsB = partido.sets.length - setsA;

    statsA.jugados++;
    statsB.jugados++;
    statsA.setsFavor += setsA;
    statsA.setsContra += setsB;
    statsB.setsFavor += setsB;
    statsB.setsContra += setsA;

    if (partido.ganadorId === statsA.usuarioId) {
      statsA.ganados++;
      statsB.perdidos++;
    } else {
      statsB.ganados++;
      statsA.perdidos++;
    }
  }

  return Array.from(estadisticas.values()).sort((x, y) => {
    if (y.ganados !== x.ganados) return y.ganados - x.ganados;
    const diferenciaX = x.setsFavor - x.setsContra;
    const diferenciaY = y.setsFavor - y.setsContra;
    if (diferenciaY !== diferenciaX) return diferenciaY - diferenciaX;
    return y.setsFavor - x.setsFavor;
  });
}

// RF-11d/RF-14: cuando se confirma un partido de grupo, revisa si ya se jugaron todos los
// partidos de grupos del torneo. Si es formato "grupos", el torneo termina ahí. Si es "mixto",
// genera automáticamente el cuadro de eliminación con los clasificados de cada grupo.
async function manejarFinDeFaseDeGrupos(tx, partidoConfirmado) {
  if (!partidoConfirmado.grupoId) return;

  const pendientes = await tx.partido.count({
    where: {
      torneoId: partidoConfirmado.torneoId,
      grupoId: { not: null },
      estado: { in: ['pendiente', 'por_definir', 'en_revision'] },
    },
  });
  if (pendientes > 0) return;

  const torneo = await tx.torneo.findUnique({ where: { id: partidoConfirmado.torneoId } });

  if (torneo.formato === 'grupos') {
    await tx.torneo.update({ where: { id: torneo.id }, data: { estado: 'finalizado' } });
    return;
  }

  if (torneo.formato === 'mixto') {
    const cuadroExistente = await tx.partido.findFirst({ where: { torneoId: torneo.id, grupoId: null } });
    if (cuadroExistente) return; // ya se generó (evita duplicar si esta función se dispara más de una vez)

    const grupos = await tx.grupo.findMany({ where: { torneoId: torneo.id } });
    const tablas = await Promise.all(grupos.map((g) => calcularTablaGrupo(tx, g.id)));
    const clasificadosPorGrupo = torneo.clasificadosPorGrupo || 1;

    const clasificados = [];
    for (let posicion = 0; posicion < clasificadosPorGrupo; posicion++) {
      for (const tabla of tablas) {
        if (tabla[posicion]) clasificados.push(tabla[posicion].usuarioId);
      }
    }

    if (clasificados.length >= 2) {
      await crearPartidosDeCuadro(tx, {
        torneo,
        participantesIds: clasificados,
        registradoPor: partidoConfirmado.registradoPor,
      });
    } else {
      await tx.torneo.update({ where: { id: torneo.id }, data: { estado: 'finalizado' } });
    }
  }
}

module.exports = { calcularTablaGrupo, manejarFinDeFaseDeGrupos };

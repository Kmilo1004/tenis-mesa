const { calcularElo, kTorneo, K_CASUAL, K_AMISTOSO_PROMOVIDO } = require('./elo');
const { manejarFinDeFaseDeGrupos } = require('./grupos.service');
const { validarMarcador, limpiarSets } = require('./marcador');
const { registrarAuditoria } = require('./auditoria.service');
const { notificarPartidoProximo, notificarCambioRanking } = require('./notificaciones.service');

const DOS_DIAS_MS = 2 * 24 * 60 * 60 * 1000;

const INCLUYE_JUGADORES = {
  sets: true,
  jugadorA: { select: { id: true, nombre: true } },
  jugadorB: { select: { id: true, nombre: true } },
  ganador: { select: { id: true, nombre: true } },
};

// RF-06b: verificación perezosa. Se llama al consultar un partido puntual.
async function expirarSiVencido(prisma, partido) {
  if (partido.estado === 'pendiente' && partido.fechaLimiteConfirmacion && partido.fechaLimiteConfirmacion < new Date()) {
    return prisma.partido.update({
      where: { id: partido.id },
      data: { estado: 'descartado' },
      include: INCLUYE_JUGADORES,
    });
  }
  return partido;
}

// RF-06b: verificación perezosa en lote, usada antes de listar partidos.
async function expirarPendientesVencidos(prisma, where = {}) {
  await prisma.partido.updateMany({
    where: { ...where, estado: 'pendiente', fechaLimiteConfirmacion: { lt: new Date() } },
    data: { estado: 'descartado' },
  });
}

// Aplica el resultado de un partido al ranking que le corresponde (oficial o no oficial, según
// partido.afectaRanking): actualiza el ELO de ambos jugadores, registra historial_ranking,
// confirma el partido y, si es un partido de torneo (RF-12/RF-14), propaga al ganador hacia el
// siguiente partido del cuadro, revisa el fin de la fase de grupos, o cierra el torneo si era
// la final. Recibe `tx` porque puede llamarse dentro de una transacción ya abierta (ej. al editar
// un resultado, donde primero hay que revertir el efecto anterior).
async function aplicarConfirmacion(tx, partido, { validadoPor, k = K_CASUAL } = {}) {
  const campoElo = partido.afectaRanking === 'oficial' ? 'eloOficial' : 'eloNoOficial';

  const jugadorA = await tx.usuario.findUnique({ where: { id: partido.jugadorAId } });
  const jugadorB = await tx.usuario.findUnique({ where: { id: partido.jugadorBId } });

  const ganaA = partido.ganadorId === jugadorA.id ? 1 : 0;
  const eloAntesA = jugadorA[campoElo];
  const eloAntesB = jugadorB[campoElo];
  const eloDespuesA = calcularElo(eloAntesA, eloAntesB, ganaA, k);
  const eloDespuesB = calcularElo(eloAntesB, eloAntesA, 1 - ganaA, k);

  await tx.usuario.update({ where: { id: jugadorA.id }, data: { [campoElo]: eloDespuesA } });
  await tx.usuario.update({ where: { id: jugadorB.id }, data: { [campoElo]: eloDespuesB } });

  await tx.historialRanking.createMany({
    data: [
      { usuarioId: jugadorA.id, partidoId: partido.id, tipoRanking: partido.afectaRanking, eloAntes: eloAntesA, eloDespues: eloDespuesA },
      { usuarioId: jugadorB.id, partidoId: partido.id, tipoRanking: partido.afectaRanking, eloAntes: eloAntesB, eloDespues: eloDespuesB },
    ],
  });

  // RF-22: notifica a ambos jugadores su nueva posición en el ranking afectado
  await notificarCambioRanking(tx, jugadorA.id, partido.afectaRanking, eloDespuesA);
  await notificarCambioRanking(tx, jugadorB.id, partido.afectaRanking, eloDespuesB);

  const partidoConfirmado = await tx.partido.update({
    where: { id: partido.id },
    data: {
      estado: 'confirmado',
      validadoPor: validadoPor || partido.validadoPor,
    },
    include: INCLUYE_JUGADORES,
  });

  if (partidoConfirmado.partidoSiguienteId) {
    // RF-12: el ganador avanza automáticamente al siguiente partido del cuadro
    const campoSlot = partidoConfirmado.slotSiguiente === 'A' ? 'jugadorAId' : 'jugadorBId';
    const siguiente = await tx.partido.update({
      where: { id: partidoConfirmado.partidoSiguienteId },
      data: { [campoSlot]: partidoConfirmado.ganadorId },
    });

    if (siguiente.jugadorAId && siguiente.jugadorBId && siguiente.estado === 'por_definir') {
      const siguienteListo = await tx.partido.update({ where: { id: siguiente.id }, data: { estado: 'pendiente' } });
      // RF-21: ya se conocen ambos jugadores del siguiente partido, avisarles
      await notificarPartidoProximo(tx, siguienteListo);
    }
  } else if (partidoConfirmado.grupoId) {
    // RF-11d/RF-14: revisa si ya se jugaron todos los partidos de grupos del torneo
    await manejarFinDeFaseDeGrupos(tx, partidoConfirmado);
  } else if (partidoConfirmado.torneoId) {
    // RF-14: se confirmó la final (o el único partido) del cuadro de eliminación
    await tx.torneo.update({ where: { id: partidoConfirmado.torneoId }, data: { estado: 'finalizado' } });
  }

  return partidoConfirmado;
}

async function confirmarResultado(prisma, partido, opciones = {}) {
  return prisma.$transaction((tx) => aplicarConfirmacion(tx, partido, opciones));
}

// RF-16d: promueve un amistoso ya confirmado (no oficial) a oficial, aplicando el ELO oficial
// con el mismo resultado, de forma independiente del ELO no oficial ya aplicado.
async function aplicarPromocion(tx, partido, validadoPor) {
  const jugadorA = await tx.usuario.findUnique({ where: { id: partido.jugadorAId } });
  const jugadorB = await tx.usuario.findUnique({ where: { id: partido.jugadorBId } });

  const ganaA = partido.ganadorId === jugadorA.id ? 1 : 0;
  const eloAntesA = jugadorA.eloOficial;
  const eloAntesB = jugadorB.eloOficial;
  const eloDespuesA = calcularElo(eloAntesA, eloAntesB, ganaA, K_AMISTOSO_PROMOVIDO);
  const eloDespuesB = calcularElo(eloAntesB, eloAntesA, 1 - ganaA, K_AMISTOSO_PROMOVIDO);

  await tx.usuario.update({ where: { id: jugadorA.id }, data: { eloOficial: eloDespuesA } });
  await tx.usuario.update({ where: { id: jugadorB.id }, data: { eloOficial: eloDespuesB } });

  await tx.historialRanking.createMany({
    data: [
      { usuarioId: jugadorA.id, partidoId: partido.id, tipoRanking: 'oficial', eloAntes: eloAntesA, eloDespues: eloDespuesA },
      { usuarioId: jugadorB.id, partidoId: partido.id, tipoRanking: 'oficial', eloAntes: eloAntesB, eloDespues: eloDespuesB },
    ],
  });

  return tx.partido.update({
    where: { id: partido.id },
    data: { promovidoAOficial: true, validadoPor },
    include: INCLUYE_JUGADORES,
  });
}

async function promoverAOficial(prisma, partido, validadoPor) {
  return prisma.$transaction((tx) => aplicarPromocion(tx, partido, validadoPor));
}

// RF-19: revierte el efecto en el ranking que causó un partido (sus registros de historial_ranking),
// restando exactamente el delta que aportó cada uno al ELO actual del jugador (en vez de fijar un
// valor absoluto), para no pisar cambios de otros partidos que hayan ocurrido después.
async function revertirEloDePartido(tx, partidoId) {
  const entradas = await tx.historialRanking.findMany({ where: { partidoId } });

  for (const entrada of entradas) {
    const campoElo = entrada.tipoRanking === 'oficial' ? 'eloOficial' : 'eloNoOficial';
    const delta = entrada.eloDespues - entrada.eloAntes;
    await tx.usuario.update({ where: { id: entrada.usuarioId }, data: { [campoElo]: { decrement: delta } } });
  }

  await tx.historialRanking.deleteMany({ where: { partidoId } });
}

// RF-14b / sección 6.1: el administrador edita o anula un resultado ya confirmado. Revierte el
// efecto anterior en el/los ranking(s) afectados (incluida la promoción a oficial, si la tuvo) y,
// si no se anula, vuelve a aplicar el resultado con el nuevo marcador. Deja registro en auditoria.
async function editarOAnularResultado(prisma, partido, { sets, anular, motivo, adminId }) {
  return prisma.$transaction(async (tx) => {
    await revertirEloDePartido(tx, partido.id);

    if (partido.partidoSiguienteId) {
      const campoSlot = partido.slotSiguiente === 'A' ? 'jugadorAId' : 'jugadorBId';
      await tx.partido.update({
        where: { id: partido.partidoSiguienteId },
        data: { [campoSlot]: null, estado: 'por_definir' },
      });
    }

    let partidoActualizado;

    if (anular) {
      partidoActualizado = await tx.partido.update({
        where: { id: partido.id },
        data: { estado: 'anulado', validadoPor: adminId },
        include: INCLUYE_JUGADORES,
      });
    } else {
      const resultado = validarMarcador(sets);
      const ganadorId = resultado.ganador === 'A' ? partido.jugadorAId : partido.jugadorBId;

      await tx.setPartido.deleteMany({ where: { partidoId: partido.id } });
      await tx.partido.update({
        where: { id: partido.id },
        data: { ganadorId, sets: { create: limpiarSets(sets) } },
      });

      const k = partido.torneoId ? kTorneo(await tx.torneo.findUnique({ where: { id: partido.torneoId } })) : K_CASUAL;
      const partidoConNuevoMarcador = await tx.partido.findUnique({ where: { id: partido.id }, include: { sets: true } });
      partidoActualizado = await aplicarConfirmacion(tx, partidoConNuevoMarcador, { validadoPor: adminId, k });

      if (partido.promovidoAOficial) {
        partidoActualizado = await aplicarPromocion(tx, partidoActualizado, adminId);
      }
    }

    await registrarAuditoria(tx, {
      usuarioId: adminId,
      accion: anular ? 'anular_partido' : 'editar_partido',
      entidadTipo: 'partido',
      entidadId: partido.id,
      detalle: { estadoAnterior: partido.estado, ganadorAnterior: partido.ganadorId, motivo: motivo || null },
    });

    return partidoActualizado;
  });
}

module.exports = {
  DOS_DIAS_MS,
  expirarSiVencido,
  expirarPendientesVencidos,
  confirmarResultado,
  promoverAOficial,
  editarOAnularResultado,
  revertirEloDePartido,
};

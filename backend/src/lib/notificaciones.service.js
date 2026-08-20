// Notificaciones in-app (sección 9: sin push en v1). `client` puede ser `prisma` o el `tx`
// de una transacción en curso.
function crearNotificacion(client, { usuarioId, tipo, mensaje, referenciaId }) {
  return client.notificacion.create({
    data: { usuarioId, tipo, mensaje, referenciaId: referenciaId ?? null },
  });
}

// RF-21: avisa a ambos jugadores que ya tienen un partido de torneo listo para jugarse
// (recién generado, o recién habilitado tras el avance de una ronda anterior).
async function notificarPartidoProximo(client, partido) {
  const rondaOGrupo = partido.ronda ? ` — ${partido.ronda}` : '';
  await Promise.all(
    [partido.jugadorAId, partido.jugadorBId].map((usuarioId) =>
      crearNotificacion(client, {
        usuarioId,
        tipo: 'partido_proximo',
        mensaje: `Tienes un partido listo para jugarse${rondaOGrupo}`,
        referenciaId: partido.id,
      }),
    ),
  );
}

// RF-22: avisa a un jugador su nueva posición en el ranking afectado, tras un cambio de ELO.
async function notificarCambioRanking(tx, usuarioId, tipoRanking, nuevoElo) {
  const campoElo = tipoRanking === 'oficial' ? 'eloOficial' : 'eloNoOficial';
  const conMasPuntos = await tx.usuario.count({
    where: { tipo: 'interno', activo: true, [campoElo]: { gt: nuevoElo } },
  });
  const posicion = conMasPuntos + 1;
  const etiqueta = tipoRanking === 'oficial' ? 'Ranking Interno' : 'Ranking';

  await crearNotificacion(tx, {
    usuarioId,
    tipo: 'cambio_ranking',
    mensaje: `Tu ${etiqueta} cambió: ahora estás en el puesto #${posicion} (${nuevoElo} pts)`,
  });
}

module.exports = { crearNotificacion, notificarPartidoProximo, notificarCambioRanking };

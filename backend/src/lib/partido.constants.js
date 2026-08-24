const INCLUYE_JUGADORES = {
  sets: true,
  jugadorA: { select: { id: true, nombre: true } },
  jugadorB: { select: { id: true, nombre: true } },
  ganador: { select: { id: true, nombre: true } },
};

module.exports = { INCLUYE_JUGADORES };

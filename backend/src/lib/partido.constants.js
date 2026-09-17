// Los sets nunca exponen los campos de análisis por defecto: son privados por jugador y solo se
// arman explícitamente (calculados por usuario) en GET /partidos/:id — ver ahí `analisisPropio`.
const INCLUYE_JUGADORES = {
  sets: { orderBy: { numeroSet: 'asc' }, select: { id: true, numeroSet: true, puntosJugadorA: true, puntosJugadorB: true } },
  jugadorA: { select: { id: true, nombre: true } },
  jugadorB: { select: { id: true, nombre: true } },
  ganador: { select: { id: true, nombre: true } },
  reportador: { select: { id: true, nombre: true } },
};

module.exports = { INCLUYE_JUGADORES };

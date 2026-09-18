const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

// RF-18: tabla de ranking paginada. Por defecto los externos quedan aislados del ranking
// general del club (sección 6.4), tanto en el oficial como en el no oficial.
//
// Un jugador que nunca jugó un partido que afecte a este ranking en particular (puede tener
// partidos en el otro) todavía tiene el ELO inicial de su nivel, que no dice nada real sobre su
// nivel de juego — así que en vez de mezclarlo con quienes sí tienen historial, queda "sin
// clasificar" al final de la lista (ordenado por nombre), sin competir por posición con ellos.
async function obtenerRanking(req, campoElo) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100);
  const where = { tipo: 'interno', activo: true };
  const tipoRanking = campoElo === 'eloOficial' ? 'oficial' : 'no_oficial';

  const usuarios = await prisma.usuario.findMany({
    where,
    orderBy: [{ [campoElo]: 'desc' }, { nombre: 'asc' }],
    select: { id: true, nombre: true, avatarSeed: true, nivel: true, [campoElo]: true },
  });

  const conHistorial = await prisma.historialRanking.groupBy({
    by: ['usuarioId'],
    where: { tipoRanking, usuarioId: { in: usuarios.map((u) => u.id) } },
  });
  const idsClasificados = new Set(conHistorial.map((h) => h.usuarioId));

  const clasificados = usuarios.filter((u) => idsClasificados.has(u.id));
  const sinClasificar = usuarios
    .filter((u) => !idsClasificados.has(u.id))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const ordenados = [
    ...clasificados.map((u) => ({ ...u, clasificado: true })),
    ...sinClasificar.map((u) => ({ ...u, clasificado: false })),
  ];

  const total = ordenados.length;
  const usuariosPagina = ordenados.slice((page - 1) * pageSize, page * pageSize);

  const ranking = usuariosPagina.map((usuario, indice) => ({
    posicion: (page - 1) * pageSize + indice + 1,
    ...usuario,
  }));

  return { ranking, page, pageSize, total };
}

// GET /ranking/no-oficial
router.get('/ranking/no-oficial', async (req, res, next) => {
  try {
    return res.status(200).json(await obtenerRanking(req, 'eloNoOficial'));
  } catch (error) {
    return next(error);
  }
});

// GET /ranking/oficial
router.get('/ranking/oficial', async (req, res, next) => {
  try {
    return res.status(200).json(await obtenerRanking(req, 'eloOficial'));
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

// RF-18: tabla de ranking paginada. Por defecto los externos quedan aislados del ranking
// general del club (sección 6.4), tanto en el oficial como en el no oficial.
async function obtenerRanking(req, campoElo) {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100);
  const where = { tipo: 'interno', activo: true };

  const [usuarios, total] = await Promise.all([
    prisma.usuario.findMany({
      where,
      orderBy: [{ [campoElo]: 'desc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, nombre: true, [campoElo]: true },
    }),
    prisma.usuario.count({ where }),
  ]);

  const ranking = usuarios.map((usuario, indice) => ({
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

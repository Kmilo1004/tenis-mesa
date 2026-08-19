const express = require('express');
const prisma = require('../lib/prisma');
const { verificarToken } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /notificaciones?leida=true|false
router.get('/notificaciones', verificarToken, async (req, res, next) => {
  try {
    const { leida } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100);

    const where = {
      usuarioId: req.usuarioId,
      ...(leida !== undefined ? { leida: leida === 'true' } : {}),
    };

    const [notificaciones, total] = await Promise.all([
      prisma.notificacion.findMany({
        where,
        orderBy: { fecha: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notificacion.count({ where }),
    ]);

    return res.status(200).json({ notificaciones, page, pageSize, total });
  } catch (error) {
    return next(error);
  }
});

// PATCH /notificaciones/{id}/leida
router.patch('/notificaciones/:id/leida', verificarToken, async (req, res, next) => {
  try {
    const notificacion = await prisma.notificacion.findUnique({ where: { id: req.params.id } });
    if (!notificacion || notificacion.usuarioId !== req.usuarioId) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    const actualizada = await prisma.notificacion.update({ where: { id: notificacion.id }, data: { leida: true } });
    return res.status(200).json(actualizada);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

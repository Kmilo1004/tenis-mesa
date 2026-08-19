const express = require('express');
const prisma = require('../lib/prisma');
const { verificarToken, requiereRol } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /auditoria?entidadTipo=&entidadId=&usuarioId= — RNF-06, solo admin
router.get('/auditoria', verificarToken, requiereRol('administrador'), async (req, res, next) => {
  try {
    const { entidadTipo, entidadId, usuarioId } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 50, 1), 200);

    const where = {
      ...(entidadTipo ? { entidadTipo } : {}),
      ...(entidadId ? { entidadId } : {}),
      ...(usuarioId ? { usuarioId } : {}),
    };

    const [registros, total] = await Promise.all([
      prisma.auditoria.findMany({
        where,
        orderBy: { fecha: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { usuario: { select: { id: true, nombre: true } } },
      }),
      prisma.auditoria.count({ where }),
    ]);

    return res.status(200).json({ registros, page, pageSize, total });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

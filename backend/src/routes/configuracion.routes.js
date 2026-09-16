const express = require('express');
const prisma = require('../lib/prisma');
const { registrarAuditoria } = require('../lib/auditoria.service');
const { verificarToken, requiereRol } = require('../middleware/auth.middleware');

const router = express.Router();

const ID_CONFIGURACION_GLOBAL = 'global';
const VALORES_POR_DEFECTO = { id: ID_CONFIGURACION_GLOBAL, mostrarNivelEnRanking: false };

// GET /configuracion — pública (autenticado): ajustes del club completo, ej. si el ranking
// muestra la etiqueta de nivel de cada jugador. Si nunca se ha guardado nada, responde los
// valores por defecto en vez de 404.
router.get('/configuracion', verificarToken, async (req, res, next) => {
  try {
    const config = await prisma.configuracion.findUnique({ where: { id: ID_CONFIGURACION_GLOBAL } });
    return res.status(200).json(config || VALORES_POR_DEFECTO);
  } catch (error) {
    return next(error);
  }
});

// PATCH /configuracion — solo admin.
router.patch('/configuracion', verificarToken, requiereRol('administrador'), async (req, res, next) => {
  try {
    const { mostrarNivelEnRanking } = req.body;
    if (typeof mostrarNivelEnRanking !== 'boolean') {
      return res.status(400).json({ error: 'mostrarNivelEnRanking debe ser true o false' });
    }

    const config = await prisma.configuracion.upsert({
      where: { id: ID_CONFIGURACION_GLOBAL },
      update: { mostrarNivelEnRanking },
      create: { id: ID_CONFIGURACION_GLOBAL, mostrarNivelEnRanking },
    });

    await registrarAuditoria(prisma, {
      usuarioId: req.usuarioId,
      accion: 'cambiar_configuracion',
      entidadTipo: 'configuracion',
      entidadId: ID_CONFIGURACION_GLOBAL,
      detalle: { mostrarNivelEnRanking },
    });

    return res.status(200).json(config);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

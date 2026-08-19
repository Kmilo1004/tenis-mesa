const express = require('express');
const prisma = require('../lib/prisma');
const { registrarAuditoria } = require('../lib/auditoria.service');
const { verificarToken, requiereRol } = require('../middleware/auth.middleware');

const router = express.Router();

// POST /usuarios/externos — RF-02, solo admin: perfil ligero sin correo ni contraseña.
// RNF-04 (Ley 1581 de 2012): requiere consentimiento explícito del jugador externo para
// almacenar sus datos; sin él, el perfil no se crea.
router.post('/usuarios/externos', verificarToken, requiereRol('administrador'), async (req, res, next) => {
  try {
    const { nombre, procedencia, consentimientoDatos } = req.body;

    if (!nombre) {
      return res.status(400).json({ error: 'nombre es obligatorio' });
    }

    if (consentimientoDatos !== true) {
      return res.status(400).json({
        error:
          'Se requiere el consentimiento explícito del jugador para almacenar sus datos (Ley 1581 de 2012): envía consentimientoDatos: true',
      });
    }

    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        procedencia: procedencia || null,
        tipo: 'externo',
        consentimientoDatos: true,
        fechaConsentimiento: new Date(),
        roles: { create: { rol: 'jugador' } },
      },
      include: { roles: true },
    });

    await registrarAuditoria(prisma, {
      usuarioId: req.usuarioId,
      accion: 'crear_usuario_externo',
      entidadTipo: 'usuario',
      entidadId: usuario.id,
    });

    const { passwordHash, ...resto } = usuario;
    return res.status(201).json(resto);
  } catch (error) {
    return next(error);
  }
});

// GET /usuarios/me
router.get('/usuarios/me', verificarToken, async (req, res, next) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.usuarioId },
      include: { roles: true },
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const { passwordHash, ...resto } = usuario;
    return res.status(200).json(resto);
  } catch (error) {
    return next(error);
  }
});

// GET /usuarios/buscar?q= — cualquier usuario autenticado: encontrar un rival por nombre
// para registrar un partido casual (RF-05 necesita poder elegir al rival, no solo su UUID).
router.get('/usuarios/buscar', verificarToken, async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) {
      return res.status(400).json({ error: 'q debe tener al menos 2 caracteres' });
    }

    const usuarios = await prisma.usuario.findMany({
      where: {
        tipo: 'interno',
        activo: true,
        id: { not: req.usuarioId },
        nombre: { contains: q, mode: 'insensitive' },
      },
      select: { id: true, nombre: true },
      take: 20,
      orderBy: { nombre: 'asc' },
    });

    return res.status(200).json(usuarios);
  } catch (error) {
    return next(error);
  }
});

// GET /usuarios/{id}/historial-ranking?tipo=oficial|no_oficial
router.get('/usuarios/:id/historial-ranking', async (req, res, next) => {
  try {
    const { tipo } = req.query;
    if (tipo && !['oficial', 'no_oficial'].includes(tipo)) {
      return res.status(400).json({ error: 'tipo debe ser "oficial" o "no_oficial"' });
    }

    const historial = await prisma.historialRanking.findMany({
      where: { usuarioId: req.params.id, ...(tipo ? { tipoRanking: tipo } : {}) },
      orderBy: { fecha: 'asc' },
      select: { id: true, partidoId: true, tipoRanking: true, eloAntes: true, eloDespues: true, fecha: true },
    });

    return res.status(200).json(historial);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

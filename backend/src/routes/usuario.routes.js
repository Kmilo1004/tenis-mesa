const express = require('express');
const prisma = require('../lib/prisma');
const { registrarAuditoria } = require('../lib/auditoria.service');
const { verificarToken, requiereRol } = require('../middleware/auth.middleware');
const { INCLUYE_JUGADORES } = require('../lib/partido.constants');

const router = express.Router();

const ROLES_GESTIONABLES = ['arbitro', 'administrador'];

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

// PUT /usuarios/me/push-token — guarda o actualiza el token de notificaciones push del
// dispositivo actual. body: { token } (o { token: null } para borrarlo, ej. al cerrar sesión).
router.put('/usuarios/me/push-token', verificarToken, async (req, res, next) => {
  try {
    const { token } = req.body;
    if (token !== null && typeof token !== 'string') {
      return res.status(400).json({ error: 'token debe ser un string, o null para borrarlo' });
    }

    await prisma.usuario.update({ where: { id: req.usuarioId }, data: { pushToken: token || null } });
    return res.status(204).send();
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

// GET /usuarios — solo admin: lista para la pantalla de gestión de roles.
router.get('/usuarios', verificarToken, requiereRol('administrador'), async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();

    const usuarios = await prisma.usuario.findMany({
      where: {
        tipo: 'interno',
        ...(q.length >= 2 ? { nombre: { contains: q, mode: 'insensitive' } } : {}),
      },
      select: { id: true, nombre: true, correo: true, activo: true, roles: { select: { rol: true } } },
      orderBy: { nombre: 'asc' },
      take: 200,
    });

    return res.status(200).json(usuarios.map((u) => ({ ...u, roles: u.roles.map((r) => r.rol) })));
  } catch (error) {
    return next(error);
  }
});

// POST /usuarios/{id}/roles — solo admin: otorga "arbitro" o "administrador" (el rol "jugador"
// se asigna solo al registrarse y no se gestiona desde aquí).
router.post('/usuarios/:id/roles', verificarToken, requiereRol('administrador'), async (req, res, next) => {
  try {
    const { rol } = req.body;
    if (!ROLES_GESTIONABLES.includes(rol)) {
      return res.status(400).json({ error: `rol debe ser uno de: ${ROLES_GESTIONABLES.join(', ')}` });
    }
    if (rol === 'administrador' && req.params.id === req.usuarioId) {
      return res.status(400).json({ error: 'No puedes modificar tu propio rol de administrador desde esta pantalla' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: req.params.id } });
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (usuario.tipo !== 'interno') {
      return res.status(400).json({ error: 'Solo usuarios internos pueden recibir roles administrativos' });
    }

    await prisma.usuarioRol.upsert({
      where: { usuarioId_rol: { usuarioId: usuario.id, rol } },
      update: {},
      create: { usuarioId: usuario.id, rol },
    });

    await registrarAuditoria(prisma, {
      usuarioId: req.usuarioId,
      accion: 'otorgar_rol',
      entidadTipo: 'usuario',
      entidadId: usuario.id,
      detalle: { rol },
    });

    const roles = await prisma.usuarioRol.findMany({ where: { usuarioId: usuario.id }, select: { rol: true } });
    return res.status(200).json({ id: usuario.id, roles: roles.map((r) => r.rol) });
  } catch (error) {
    return next(error);
  }
});

// DELETE /usuarios/{id}/roles/{rol} — solo admin.
router.delete('/usuarios/:id/roles/:rol', verificarToken, requiereRol('administrador'), async (req, res, next) => {
  try {
    const { rol } = req.params;
    if (!ROLES_GESTIONABLES.includes(rol)) {
      return res.status(400).json({ error: `rol debe ser uno de: ${ROLES_GESTIONABLES.join(', ')}` });
    }
    if (rol === 'administrador' && req.params.id === req.usuarioId) {
      return res.status(400).json({ error: 'No puedes modificar tu propio rol de administrador desde esta pantalla' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: req.params.id } });
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await prisma.usuarioRol.deleteMany({ where: { usuarioId: usuario.id, rol } });

    await registrarAuditoria(prisma, {
      usuarioId: req.usuarioId,
      accion: 'revocar_rol',
      entidadTipo: 'usuario',
      entidadId: usuario.id,
      detalle: { rol },
    });

    const roles = await prisma.usuarioRol.findMany({ where: { usuarioId: usuario.id }, select: { rol: true } });
    return res.status(200).json({ id: usuario.id, roles: roles.map((r) => r.rol) });
  } catch (error) {
    return next(error);
  }
});

// GET /usuarios/{id}/estadisticas — cualquier usuario autenticado (mismo alcance que el
// ranking, que ya es público para cualquiera logueado). Solo cuenta partidos "confirmado":
// pendientes/anulados/en_revision no son un resultado real todavía.
router.get('/usuarios/:id/estadisticas', verificarToken, async (req, res, next) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: req.params.id },
      select: { id: true, nombre: true, eloOficial: true, eloNoOficial: true },
    });
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const partidos = await prisma.partido.findMany({
      where: {
        estado: 'confirmado',
        OR: [{ jugadorAId: usuario.id }, { jugadorBId: usuario.id }],
      },
      include: INCLUYE_JUGADORES,
      orderBy: { fechaPartido: 'desc' },
    });

    const totalPartidos = partidos.length;
    const victorias = partidos.filter((p) => p.ganadorId === usuario.id).length;
    const derrotas = totalPartidos - victorias;
    const porcentajeVictorias = totalPartidos ? Math.round((victorias / totalPartidos) * 100) : 0;

    // Racha: recorre desde el más reciente y cuenta consecutivos del mismo resultado.
    let racha = { tipo: null, cantidad: 0 };
    if (totalPartidos > 0) {
      const tipoInicial = partidos[0].ganadorId === usuario.id ? 'V' : 'D';
      let cantidad = 0;
      for (const p of partidos) {
        const tipo = p.ganadorId === usuario.id ? 'V' : 'D';
        if (tipo !== tipoInicial) break;
        cantidad++;
      }
      racha = { tipo: tipoInicial, cantidad };
    }

    // Cara a cara: agrupa por rival.
    const mapaRivales = new Map();
    for (const p of partidos) {
      const rival = p.jugadorAId === usuario.id ? p.jugadorB : p.jugadorA;
      if (!rival) continue;
      const entrada = mapaRivales.get(rival.id) || { rivalId: rival.id, rivalNombre: rival.nombre, victorias: 0, derrotas: 0 };
      if (p.ganadorId === usuario.id) entrada.victorias++;
      else entrada.derrotas++;
      mapaRivales.set(rival.id, entrada);
    }
    const headToHead = [...mapaRivales.values()]
      .map((r) => ({ ...r, totalPartidos: r.victorias + r.derrotas }))
      .sort((a, b) => b.totalPartidos - a.totalPartidos || a.rivalNombre.localeCompare(b.rivalNombre));

    return res.status(200).json({
      usuario,
      record: { victorias, derrotas, totalPartidos, porcentajeVictorias },
      racha,
      headToHead,
      partidosRecientes: partidos.slice(0, 10),
    });
  } catch (error) {
    return next(error);
  }
});

// GET /usuarios/{id}/historial-ranking?tipo=oficial|no_oficial
router.get('/usuarios/:id/historial-ranking', verificarToken, async (req, res, next) => {
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

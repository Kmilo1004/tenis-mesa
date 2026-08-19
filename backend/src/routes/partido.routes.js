const express = require('express');
const prisma = require('../lib/prisma');
const { validarMarcador, limpiarSets } = require('../lib/marcador');
const {
  DOS_DIAS_MS,
  expirarSiVencido,
  expirarPendientesVencidos,
  confirmarResultado,
  promoverAOficial,
  editarOAnularResultado,
} = require('../lib/partidos.service');
const { kTorneo } = require('../lib/elo');
const { registrarAuditoria } = require('../lib/auditoria.service');
const { crearNotificacion } = require('../lib/notificaciones.service');
const { verificarToken, requiereRol, obtenerRoles } = require('../middleware/auth.middleware');

const router = express.Router();

const MOTIVOS_VALIDOS = ['marcador_incorrecto', 'no_jugado', 'rival_equivocado'];
const RESOLUCIONES_VALIDAS = ['confirmar_original', 'aceptar_propuesto', 'anular'];

const INCLUYE_JUGADORES = {
  sets: true,
  jugadorA: { select: { id: true, nombre: true } },
  jugadorB: { select: { id: true, nombre: true } },
  ganador: { select: { id: true, nombre: true } },
};

// POST /partidos — RF-05 a RF-08 (partido casual, Fase 2)
router.post('/partidos', verificarToken, async (req, res, next) => {
  try {
    const { jugadorBId, sets, fechaPartido } = req.body;
    const jugadorAId = req.body.jugadorAId || req.usuarioId;

    if (!jugadorBId || !sets || !fechaPartido) {
      return res.status(400).json({ error: 'jugadorBId, sets y fechaPartido son obligatorios' });
    }

    if (jugadorAId === jugadorBId) {
      return res.status(400).json({ error: 'Un jugador no puede jugar contra sí mismo' });
    }

    const rolesUsuario = await obtenerRoles(req.usuarioId);
    const esAdminOArbitro = rolesUsuario.includes('administrador') || rolesUsuario.includes('arbitro');

    if (!esAdminOArbitro && req.usuarioId !== jugadorAId && req.usuarioId !== jugadorBId) {
      return res.status(403).json({ error: 'Debes ser uno de los participantes del partido para registrarlo' });
    }

    const [jugadorA, jugadorB] = await Promise.all([
      prisma.usuario.findUnique({ where: { id: jugadorAId } }),
      prisma.usuario.findUnique({ where: { id: jugadorBId } }),
    ]);

    if (!jugadorA || !jugadorB) {
      return res.status(404).json({ error: 'Alguno de los jugadores no existe' });
    }

    if (jugadorA.tipo !== 'interno' || jugadorB.tipo !== 'interno') {
      return res.status(400).json({ error: 'Los partidos casuales solo pueden jugarse entre usuarios internos (RF-17)' });
    }

    const resultado = validarMarcador(sets);
    if (!resultado.valido) {
      return res.status(400).json({ error: resultado.error });
    }

    const ganadorId = resultado.ganador === 'A' ? jugadorAId : jugadorBId;
    const confirmacionInmediata = esAdminOArbitro; // RF-07

    let partido = await prisma.partido.create({
      data: {
        jugadorAId,
        jugadorBId,
        ganadorId,
        tipoPartido: 'casual',
        afectaRanking: 'no_oficial',
        estado: confirmacionInmediata ? 'confirmado' : 'pendiente', // RF-06 / RF-07
        fechaLimiteConfirmacion: confirmacionInmediata ? null : new Date(Date.now() + DOS_DIAS_MS),
        fechaPartido: new Date(fechaPartido),
        registradoPor: req.usuarioId,
        sets: { create: limpiarSets(sets) },
      },
      include: INCLUYE_JUGADORES,
    });

    if (confirmacionInmediata) {
      partido = await confirmarResultado(prisma, partido, { validadoPor: req.usuarioId });
    } else {
      // RF-20: avisa al rival (quien no registró) que hay un resultado pendiente de su confirmación
      const rivalId = req.usuarioId === jugadorAId ? jugadorBId : jugadorAId;
      const registrante = req.usuarioId === jugadorAId ? jugadorA : jugadorB;
      await crearNotificacion(prisma, {
        usuarioId: rivalId,
        tipo: 'confirmacion_pendiente',
        mensaje: `${registrante.nombre} reportó un resultado pendiente de tu confirmación`,
        referenciaId: partido.id,
      });
    }

    return res.status(201).json(partido);
  } catch (error) {
    return next(error);
  }
});

// GET /partidos?usuario_id=&estado=
router.get('/partidos', verificarToken, async (req, res, next) => {
  try {
    const { usuario_id: usuarioId, estado } = req.query;
    const filtroJugador = usuarioId ? { OR: [{ jugadorAId: usuarioId }, { jugadorBId: usuarioId }] } : {};

    await expirarPendientesVencidos(prisma, filtroJugador);

    const partidos = await prisma.partido.findMany({
      where: { ...filtroJugador, ...(estado ? { estado } : {}) },
      include: INCLUYE_JUGADORES,
      orderBy: { fechaPartido: 'desc' },
    });

    return res.status(200).json(partidos);
  } catch (error) {
    return next(error);
  }
});

// GET /partidos/{id}
router.get('/partidos/:id', verificarToken, async (req, res, next) => {
  try {
    let partido = await prisma.partido.findUnique({ where: { id: req.params.id }, include: INCLUYE_JUGADORES });
    if (!partido) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }

    partido = await expirarSiVencido(prisma, partido);
    return res.status(200).json(partido);
  } catch (error) {
    return next(error);
  }
});

// POST /partidos/{id}/confirmar — RF-06 (confirmación del rival)
router.post('/partidos/:id/confirmar', verificarToken, async (req, res, next) => {
  try {
    let partido = await prisma.partido.findUnique({ where: { id: req.params.id } });
    if (!partido) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }

    if (partido.torneoId) {
      return res.status(400).json({ error: 'Los partidos de torneo no se confirman así; el resultado lo registra un admin o árbitro' });
    }

    partido = await expirarSiVencido(prisma, partido);

    if (partido.estado !== 'pendiente') {
      return res.status(409).json({ error: `El partido no está pendiente de confirmación (estado actual: ${partido.estado})` });
    }

    const esParticipante = req.usuarioId === partido.jugadorAId || req.usuarioId === partido.jugadorBId;
    if (!esParticipante) {
      return res.status(403).json({ error: 'Solo los jugadores del partido pueden confirmarlo' });
    }

    if (req.usuarioId === partido.registradoPor) {
      return res.status(403).json({ error: 'Quien registró el resultado no puede confirmarlo, debe hacerlo el rival' });
    }

    const partidoConfirmado = await confirmarResultado(prisma, partido);
    return res.status(200).json(partidoConfirmado);
  } catch (error) {
    return next(error);
  }
});

// POST /partidos/{id}/disputar — RF-09b, RF-09c
router.post('/partidos/:id/disputar', verificarToken, async (req, res, next) => {
  try {
    const { motivo, marcadorPropuesto, comentario } = req.body;

    if (!motivo || !MOTIVOS_VALIDOS.includes(motivo)) {
      return res.status(400).json({ error: `motivo debe ser uno de: ${MOTIVOS_VALIDOS.join(', ')}` });
    }

    let partido = await prisma.partido.findUnique({ where: { id: req.params.id } });
    if (!partido) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }

    if (partido.torneoId) {
      return res.status(400).json({ error: 'Los partidos de torneo no se disputan así; contacta al administrador directamente' });
    }

    partido = await expirarSiVencido(prisma, partido);

    if (partido.estado !== 'pendiente') {
      return res.status(409).json({ error: `El partido no está pendiente de confirmación (estado actual: ${partido.estado})` });
    }

    const esRivalQueConfirma =
      (req.usuarioId === partido.jugadorAId || req.usuarioId === partido.jugadorBId) && req.usuarioId !== partido.registradoPor;

    if (!esRivalQueConfirma) {
      return res.status(403).json({ error: 'Solo el rival que debe confirmar puede disputar el resultado' });
    }

    let marcadorLimpio;
    if (marcadorPropuesto) {
      const resultado = validarMarcador(marcadorPropuesto);
      if (!resultado.valido) {
        return res.status(400).json({ error: `marcador_propuesto inválido: ${resultado.error}` });
      }
      marcadorLimpio = limpiarSets(marcadorPropuesto);
    }

    const partidoActualizado = await prisma.partido.update({
      where: { id: partido.id },
      data: {
        estado: 'en_revision', // RF-09c: no afecta ranking hasta que el admin lo resuelva
        motivoDisputa: motivo,
        marcadorPropuesto: marcadorLimpio,
        comentarioDisputa: comentario || null,
      },
      include: INCLUYE_JUGADORES,
    });

    return res.status(200).json(partidoActualizado);
  } catch (error) {
    return next(error);
  }
});

// POST /partidos/{id}/resolver-disputa — RF-09c, solo admin
router.post('/partidos/:id/resolver-disputa', verificarToken, requiereRol('administrador'), async (req, res, next) => {
  try {
    const { resolucion } = req.body;
    if (!resolucion || !RESOLUCIONES_VALIDAS.includes(resolucion)) {
      return res.status(400).json({ error: `resolucion debe ser uno de: ${RESOLUCIONES_VALIDAS.join(', ')}` });
    }

    let partido = await prisma.partido.findUnique({ where: { id: req.params.id } });
    if (!partido) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }

    if (partido.estado !== 'en_revision') {
      return res.status(409).json({ error: `El partido no está en revisión (estado actual: ${partido.estado})` });
    }

    if (resolucion === 'anular') {
      const partidoAnulado = await prisma.partido.update({
        where: { id: partido.id },
        data: { estado: 'anulado', validadoPor: req.usuarioId },
        include: INCLUYE_JUGADORES,
      });
      await registrarAuditoria(prisma, {
        usuarioId: req.usuarioId,
        accion: 'resolver_disputa_anular',
        entidadTipo: 'partido',
        entidadId: partido.id,
        detalle: { resolucion },
      });
      return res.status(200).json(partidoAnulado);
    }

    if (resolucion === 'aceptar_propuesto') {
      if (!partido.marcadorPropuesto) {
        return res.status(400).json({ error: 'Este partido no tiene un marcador propuesto para aceptar' });
      }

      const resultado = validarMarcador(partido.marcadorPropuesto);
      const ganadorId = resultado.ganador === 'A' ? partido.jugadorAId : partido.jugadorBId;

      await prisma.setPartido.deleteMany({ where: { partidoId: partido.id } });
      partido = await prisma.partido.update({
        where: { id: partido.id },
        data: {
          ganadorId,
          sets: { create: limpiarSets(partido.marcadorPropuesto) },
        },
      });
    }

    const partidoConfirmado = await confirmarResultado(prisma, partido, { validadoPor: req.usuarioId });
    await registrarAuditoria(prisma, {
      usuarioId: req.usuarioId,
      accion: 'resolver_disputa',
      entidadTipo: 'partido',
      entidadId: partido.id,
      detalle: { resolucion },
    });
    return res.status(200).json(partidoConfirmado);
  } catch (error) {
    return next(error);
  }
});

// POST /partidos/{id}/validar — RF-06c (rescatar un partido descartado) o RF-16d (promover
// un amistoso confirmado a oficial), según el estado actual del partido. Solo admin.
router.post('/partidos/:id/validar', verificarToken, requiereRol('administrador'), async (req, res, next) => {
  try {
    let partido = await prisma.partido.findUnique({ where: { id: req.params.id } });
    if (!partido) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }

    partido = await expirarSiVencido(prisma, partido);

    if (partido.estado === 'descartado') {
      const partidoConfirmado = await confirmarResultado(prisma, partido, { validadoPor: req.usuarioId });
      await registrarAuditoria(prisma, {
        usuarioId: req.usuarioId,
        accion: 'rescatar_partido_descartado',
        entidadTipo: 'partido',
        entidadId: partido.id,
      });
      return res.status(200).json(partidoConfirmado);
    }

    const esAmistosoPromovible =
      partido.estado === 'confirmado' &&
      partido.tipoPartido === 'casual' &&
      partido.afectaRanking === 'no_oficial' &&
      !partido.promovidoAOficial;

    if (esAmistosoPromovible) {
      const partidoPromovido = await promoverAOficial(prisma, partido, req.usuarioId);
      await registrarAuditoria(prisma, {
        usuarioId: req.usuarioId,
        accion: 'promover_a_oficial',
        entidadTipo: 'partido',
        entidadId: partido.id,
      });
      return res.status(200).json(partidoPromovido);
    }

    return res.status(409).json({ error: 'Este partido no se puede validar ni promover a oficial en su estado actual' });
  } catch (error) {
    return next(error);
  }
});

// POST /partidos/{id}/resultado — registra el resultado de un partido de torneo ya emparejado
// por el cuadro (RF-05/RF-07 para torneos). Solo admin o árbitro.
router.post('/partidos/:id/resultado', verificarToken, requiereRol('administrador', 'arbitro'), async (req, res, next) => {
  try {
    const { sets } = req.body;
    if (!sets) {
      return res.status(400).json({ error: 'sets es obligatorio' });
    }

    const partido = await prisma.partido.findUnique({ where: { id: req.params.id } });
    if (!partido) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }

    if (!partido.torneoId) {
      return res.status(400).json({ error: 'Este endpoint es solo para partidos de torneo; los partidos casuales usan /confirmar' });
    }

    if (partido.estado === 'por_definir') {
      return res.status(409).json({ error: 'Este partido todavía no tiene definidos a ambos jugadores' });
    }

    if (partido.estado !== 'pendiente') {
      return res.status(409).json({ error: `Este partido no está listo para jugarse (estado actual: ${partido.estado})` });
    }

    const resultado = validarMarcador(sets);
    if (!resultado.valido) {
      return res.status(400).json({ error: resultado.error });
    }

    const ganadorId = resultado.ganador === 'A' ? partido.jugadorAId : partido.jugadorBId;

    const partidoConSets = await prisma.partido.update({
      where: { id: partido.id },
      data: { ganadorId, sets: { create: limpiarSets(sets) } },
    });

    const torneo = await prisma.torneo.findUnique({ where: { id: partido.torneoId } });
    const partidoConfirmado = await confirmarResultado(prisma, partidoConSets, { validadoPor: req.usuarioId, k: kTorneo(torneo) });

    await registrarAuditoria(prisma, {
      usuarioId: req.usuarioId,
      accion: 'registrar_resultado_torneo',
      entidadTipo: 'partido',
      entidadId: partido.id,
    });

    return res.status(200).json(partidoConfirmado);
  } catch (error) {
    return next(error);
  }
});

// PATCH /partidos/{id} — RF-14b / sección 6.1: el admin edita o anula cualquier resultado ya
// confirmado. Recalcula el ranking afectado (RF-19). Bloquea la edición si el resultado ya
// avanzó a un partido siguiente del cuadro que ya se jugó, o si la fase de grupos ya concluyó.
router.patch('/partidos/:id', verificarToken, requiereRol('administrador'), async (req, res, next) => {
  try {
    const { sets, anular, motivo } = req.body;

    if (!anular && !sets) {
      return res.status(400).json({ error: 'Debes enviar "sets" para editar el marcador, o "anular": true' });
    }

    const partido = await prisma.partido.findUnique({ where: { id: req.params.id } });
    if (!partido) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }

    if (partido.estado !== 'confirmado') {
      return res.status(409).json({ error: `Solo se pueden editar o anular partidos confirmados (estado actual: ${partido.estado})` });
    }

    if (!anular) {
      const resultado = validarMarcador(sets);
      if (!resultado.valido) {
        return res.status(400).json({ error: resultado.error });
      }
    }

    if (partido.partidoSiguienteId) {
      const siguiente = await prisma.partido.findUnique({ where: { id: partido.partidoSiguienteId } });
      if (siguiente && !['pendiente', 'por_definir'].includes(siguiente.estado)) {
        return res
          .status(409)
          .json({ error: 'No se puede editar: el resultado ya avanzó a un partido posterior del cuadro que ya se jugó o está en revisión' });
      }
    }

    if (partido.grupoId) {
      const cuadroGenerado = await prisma.partido.findFirst({ where: { torneoId: partido.torneoId, grupoId: null } });
      if (cuadroGenerado || partido.torneoId) {
        const torneo = await prisma.torneo.findUnique({ where: { id: partido.torneoId } });
        if (torneo.estado === 'finalizado' || cuadroGenerado) {
          return res
            .status(409)
            .json({ error: 'No se puede editar: la fase de grupos ya concluyó y el torneo avanzó' });
        }
      }
    }

    const partidoActualizado = await editarOAnularResultado(prisma, partido, {
      sets,
      anular: Boolean(anular),
      motivo,
      adminId: req.usuarioId,
    });

    return res.status(200).json(partidoActualizado);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

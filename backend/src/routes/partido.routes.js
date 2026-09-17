const express = require('express');
const prisma = require('../lib/prisma');
const { validarMarcador, limpiarSets, puntosSetValidos } = require('../lib/marcador');
const {
  DOS_DIAS_MS,
  VEINTICUATRO_HORAS_MS,
  expirarSiVencido,
  expirarPendientesVencidos,
  expirarDesafiosVencidos,
  desafioVencido,
  confirmarResultado,
  promoverAOficial,
  editarOAnularResultado,
} = require('../lib/partidos.service');
const { kTorneo } = require('../lib/elo');
const { INCLUYE_JUGADORES } = require('../lib/partido.constants');
const { registrarAuditoria } = require('../lib/auditoria.service');
const { crearNotificacion } = require('../lib/notificaciones.service');
const { verificarToken, requiereRol, obtenerRoles } = require('../middleware/auth.middleware');

const router = express.Router();

const MOTIVOS_VALIDOS = ['marcador_incorrecto', 'no_jugado', 'rival_equivocado'];
const RESOLUCIONES_VALIDAS = ['confirmar_original', 'aceptar_propuesto', 'anular'];

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
    await expirarDesafiosVencidos(prisma, filtroJugador);

    // Un partido anulado (disputa que el admin resolvió como inválida) solo lo puede ver el
    // administrador — para los jugadores, es como si nunca hubiera existido.
    const rolesUsuario = await obtenerRoles(req.usuarioId);
    const esAdmin = rolesUsuario.includes('administrador');

    const partidos = await prisma.partido.findMany({
      where: {
        ...filtroJugador,
        ...(estado ? { estado } : {}),
        ...(esAdmin ? {} : { NOT: { estado: 'anulado' } }),
      },
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

    if (desafioVencido(partido)) {
      await prisma.partido.delete({ where: { id: partido.id } });
      return res.status(404).json({ error: 'Este desafío venció sin respuesta y fue eliminado' });
    }

    partido = await expirarSiVencido(prisma, partido);

    if (partido.estado === 'anulado') {
      const rolesUsuario = await obtenerRoles(req.usuarioId);
      if (!rolesUsuario.includes('administrador')) {
        return res.status(404).json({ error: 'Partido no encontrado' });
      }
    }

    // El análisis por set es privado — jamás va en INCLUYE_JUGADORES (se filtraría a cualquiera
    // que pueda ver el partido). Acá, y solo acá, se calcula "el mío" según quién pregunta.
    if (partido.jugadorAId === req.usuarioId || partido.jugadorBId === req.usuarioId) {
      const columnaPropia = partido.jugadorAId === req.usuarioId ? 'analisisJugadorA' : 'analisisJugadorB';
      const analisisPorSet = await prisma.setPartido.findMany({
        where: { partidoId: partido.id },
        select: { numeroSet: true, [columnaPropia]: true },
      });
      const mapaAnalisis = new Map(analisisPorSet.map((s) => [s.numeroSet, s[columnaPropia]]));
      partido.sets = partido.sets.map((s) => ({ ...s, analisisPropio: mapaAnalisis.get(s.numeroSet) || null }));
    } else {
      partido.sets = partido.sets.map((s) => ({ ...s, analisisPropio: null }));
    }

    return res.status(200).json(partido);
  } catch (error) {
    return next(error);
  }
});

// POST /partidos/desafios — manda un desafío a otro jugador: crea el partido sin marcador, a la
// espera de que el rival lo acepte antes de poder empezar a cargar sets.
router.post('/partidos/desafios', verificarToken, async (req, res, next) => {
  try {
    const { jugadorBId } = req.body;
    if (!jugadorBId) {
      return res.status(400).json({ error: 'jugadorBId es obligatorio' });
    }
    if (jugadorBId === req.usuarioId) {
      return res.status(400).json({ error: 'Un jugador no puede desafiarse a sí mismo' });
    }

    const [retador, retado] = await Promise.all([
      prisma.usuario.findUnique({ where: { id: req.usuarioId } }),
      prisma.usuario.findUnique({ where: { id: jugadorBId } }),
    ]);
    if (!retado) {
      return res.status(404).json({ error: 'El rival no existe' });
    }
    if (retador.tipo !== 'interno' || retado.tipo !== 'interno') {
      return res.status(400).json({ error: 'Los desafíos solo pueden ser entre usuarios internos (RF-17)' });
    }

    const partido = await prisma.partido.create({
      data: {
        jugadorAId: req.usuarioId,
        jugadorBId,
        tipoPartido: 'casual',
        afectaRanking: 'no_oficial',
        estado: 'desafio_pendiente',
        fechaLimiteConfirmacion: new Date(Date.now() + VEINTICUATRO_HORAS_MS),
        fechaPartido: new Date(),
        registradoPor: req.usuarioId,
      },
      include: INCLUYE_JUGADORES,
    });

    await crearNotificacion(prisma, {
      usuarioId: jugadorBId,
      tipo: 'desafio',
      mensaje: `${retador.nombre} te desafió a un partido`,
      referenciaId: partido.id,
    });

    return res.status(201).json(partido);
  } catch (error) {
    return next(error);
  }
});

// POST /partidos/{id}/desafio/responder — el rival acepta o rechaza el desafío. Body: { aceptar }.
router.post('/partidos/:id/desafio/responder', verificarToken, async (req, res, next) => {
  try {
    const { aceptar } = req.body;
    if (typeof aceptar !== 'boolean') {
      return res.status(400).json({ error: 'aceptar debe ser true o false' });
    }

    const partido = await prisma.partido.findUnique({ where: { id: req.params.id } });
    if (!partido) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    if (desafioVencido(partido)) {
      await prisma.partido.delete({ where: { id: partido.id } });
      return res.status(404).json({ error: 'Este desafío venció sin respuesta y fue eliminado' });
    }
    if (partido.estado !== 'desafio_pendiente') {
      return res.status(409).json({ error: `Este desafío ya no está pendiente de respuesta (estado actual: ${partido.estado})` });
    }
    if (req.usuarioId !== partido.jugadorBId) {
      return res.status(403).json({ error: 'Solo el jugador desafiado puede aceptar o rechazar el desafío' });
    }

    const retado = await prisma.usuario.findUnique({ where: { id: req.usuarioId } });
    const partidoActualizado = await prisma.partido.update({
      where: { id: partido.id },
      data: { estado: aceptar ? 'en_juego' : 'desafio_rechazado' },
      include: INCLUYE_JUGADORES,
    });

    await crearNotificacion(prisma, {
      usuarioId: partido.jugadorAId,
      tipo: 'desafio',
      mensaje: aceptar ? `${retado.nombre} aceptó tu desafío. ¡A jugar!` : `${retado.nombre} rechazó tu desafío`,
      referenciaId: partido.id,
    });

    return res.status(200).json(partidoActualizado);
  } catch (error) {
    return next(error);
  }
});

// POST /partidos/{id}/sets — agrega el resultado de un set a un desafío en vivo, a medida que van
// terminando. Cualquiera de los dos jugadores puede cargarlo (se asume que juegan juntos en el
// momento); cuando el marcador acumulado ya define un ganador (mejor de 5 o de 7), el partido pasa
// solo a "pendiente" para que el rival de quien registró el desafío lo confirme, igual que un
// partido casual cargado de una sola vez.
router.post('/partidos/:id/sets', verificarToken, async (req, res, next) => {
  try {
    const { puntosJugadorA, puntosJugadorB } = req.body;
    const resultadoSet = puntosSetValidos(puntosJugadorA, puntosJugadorB);
    if (!resultadoSet.valido) {
      return res.status(400).json({ error: resultadoSet.error });
    }

    const partido = await prisma.partido.findUnique({ where: { id: req.params.id }, include: { sets: true } });
    if (!partido) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    if (partido.jugadorAId !== req.usuarioId && partido.jugadorBId !== req.usuarioId) {
      return res.status(403).json({ error: 'Solo los jugadores del desafío pueden cargar sets' });
    }
    if (partido.estado !== 'en_juego') {
      return res.status(409).json({ error: `Este partido no está en juego (estado actual: ${partido.estado})` });
    }
    if (partido.sets.length >= 7) {
      return res.status(409).json({ error: 'Este partido ya tiene el máximo de 7 sets' });
    }

    await prisma.setPartido.create({
      data: {
        partidoId: partido.id,
        numeroSet: partido.sets.length + 1,
        puntosJugadorA: Number(puntosJugadorA),
        puntosJugadorB: Number(puntosJugadorB),
      },
    });

    const setsHastaAhora = [...partido.sets, { puntosJugadorA: Number(puntosJugadorA), puntosJugadorB: Number(puntosJugadorB) }].map(
      (s) => ({ puntosJugadorA: s.puntosJugadorA, puntosJugadorB: s.puntosJugadorB }),
    );
    const resultado = validarMarcador(setsHastaAhora);

    if (!resultado.valido) {
      // Todavía no se define el partido con los sets jugados hasta ahora — sigue en juego.
      const partidoEnCurso = await prisma.partido.findUnique({ where: { id: partido.id }, include: INCLUYE_JUGADORES });
      return res.status(201).json(partidoEnCurso);
    }

    const ganadorId = resultado.ganador === 'A' ? partido.jugadorAId : partido.jugadorBId;
    const partidoTerminado = await prisma.partido.update({
      where: { id: partido.id },
      data: {
        ganadorId,
        estado: 'pendiente',
        fechaLimiteConfirmacion: new Date(Date.now() + DOS_DIAS_MS),
      },
      include: INCLUYE_JUGADORES,
    });

    // RF-20: avisa a quien no registró el desafío (el retado) que ya hay un resultado por confirmar
    const confirmaId = partido.registradoPor === partido.jugadorAId ? partido.jugadorBId : partido.jugadorAId;
    const [jugadorA, jugadorB] = await Promise.all([
      prisma.usuario.findUnique({ where: { id: partido.jugadorAId } }),
      prisma.usuario.findUnique({ where: { id: partido.jugadorBId } }),
    ]);
    const registrante = partido.registradoPor === partido.jugadorAId ? jugadorA : jugadorB;
    await crearNotificacion(prisma, {
      usuarioId: confirmaId,
      tipo: 'confirmacion_pendiente',
      mensaje: `${registrante.nombre} reportó un resultado pendiente de tu confirmación`,
      referenciaId: partido.id,
    });

    return res.status(201).json(partidoTerminado);
  } catch (error) {
    return next(error);
  }
});

// PUT /partidos/{id}/sets/{numeroSet}/analisis — crea, actualiza o borra (con texto vacío) el
// análisis privado de UN jugador sobre ese set en particular.
router.put('/partidos/:id/sets/:numeroSet/analisis', verificarToken, async (req, res, next) => {
  try {
    const { texto } = req.body;
    if (typeof texto !== 'string') {
      return res.status(400).json({ error: 'texto es obligatorio (puede ser un string vacío para borrarlo)' });
    }

    const partido = await prisma.partido.findUnique({ where: { id: req.params.id } });
    if (!partido) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    if (partido.jugadorAId !== req.usuarioId && partido.jugadorBId !== req.usuarioId) {
      return res.status(403).json({ error: 'Solo puedes anotar análisis en tus propios partidos' });
    }

    const numeroSet = parseInt(req.params.numeroSet, 10);
    const set = await prisma.setPartido.findUnique({ where: { partidoId_numeroSet: { partidoId: partido.id, numeroSet } } });
    if (!set) {
      return res.status(404).json({ error: 'Ese set no existe en este partido' });
    }

    const columnaPropia = partido.jugadorAId === req.usuarioId ? 'analisisJugadorA' : 'analisisJugadorB';
    const textoLimpio = texto.trim() || null;

    await prisma.setPartido.update({
      where: { id: set.id },
      data: { [columnaPropia]: textoLimpio },
    });

    return res.status(200).json({ numeroSet, analisisPropio: textoLimpio });
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
// por el cuadro (RF-05/RF-07 para torneos). Lo puede reportar cualquiera de los dos jugadores,
// o un admin/árbitro. Si lo reporta un jugador, queda "pendiente_aprobacion" (no afecta el
// ranking todavía); si lo reporta un admin/árbitro, se confirma de una vez, como antes.
router.post('/partidos/:id/resultado', verificarToken, async (req, res, next) => {
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

    if (partido.estado === 'pendiente_aprobacion') {
      return res.status(409).json({ error: 'Ya se reportó un resultado para este partido; está pendiente de aprobación' });
    }

    if (partido.estado !== 'pendiente') {
      return res.status(409).json({ error: `Este partido no está listo para jugarse (estado actual: ${partido.estado})` });
    }

    const rolesUsuario = await obtenerRoles(req.usuarioId);
    const esAdminOArbitro = rolesUsuario.includes('administrador') || rolesUsuario.includes('arbitro');
    const esParticipante = req.usuarioId === partido.jugadorAId || req.usuarioId === partido.jugadorBId;

    if (!esAdminOArbitro && !esParticipante) {
      return res.status(403).json({ error: 'Debes ser uno de los jugadores de este partido, o admin/árbitro, para reportar el resultado' });
    }

    const resultado = validarMarcador(sets);
    if (!resultado.valido) {
      return res.status(400).json({ error: resultado.error });
    }

    const ganadorId = resultado.ganador === 'A' ? partido.jugadorAId : partido.jugadorBId;

    if (esAdminOArbitro) {
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
    }

    const partidoReportado = await prisma.partido.update({
      where: { id: partido.id },
      data: {
        ganadorId,
        estado: 'pendiente_aprobacion',
        reportadoPor: req.usuarioId,
        sets: { create: limpiarSets(sets) },
      },
      include: INCLUYE_JUGADORES,
    });

    await registrarAuditoria(prisma, {
      usuarioId: req.usuarioId,
      accion: 'reportar_resultado_torneo',
      entidadTipo: 'partido',
      entidadId: partido.id,
    });

    const jueces = await prisma.usuario.findMany({
      where: { roles: { some: { rol: { in: ['administrador', 'arbitro'] } } } },
      select: { id: true },
    });
    const reportante = req.usuarioId === partido.jugadorAId ? partidoReportado.jugadorA : partidoReportado.jugadorB;
    await Promise.all(
      jueces.map((j) =>
        crearNotificacion(prisma, {
          usuarioId: j.id,
          tipo: 'torneo',
          mensaje: `${reportante.nombre} reportó un resultado de torneo pendiente de tu aprobación`,
          referenciaId: partidoReportado.id,
        }),
      ),
    );

    return res.status(200).json(partidoReportado);
  } catch (error) {
    return next(error);
  }
});

// POST /partidos/{id}/aprobar-resultado — solo admin/árbitro: aprueba o rechaza un resultado
// de torneo que reportó un jugador. Aprobar confirma el partido igual que si lo hubiera
// reportado un admin (aplica ELO, avanza el cuadro, etc.); rechazar lo devuelve a "pendiente"
// para que se pueda volver a reportar.
router.post('/partidos/:id/aprobar-resultado', verificarToken, requiereRol('administrador', 'arbitro'), async (req, res, next) => {
  try {
    const { aprobar, motivo } = req.body;
    if (typeof aprobar !== 'boolean') {
      return res.status(400).json({ error: 'aprobar debe ser true o false' });
    }

    const partido = await prisma.partido.findUnique({ where: { id: req.params.id }, include: INCLUYE_JUGADORES });
    if (!partido) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }

    if (partido.estado !== 'pendiente_aprobacion') {
      return res.status(409).json({ error: `Este partido no tiene un resultado pendiente de aprobación (estado actual: ${partido.estado})` });
    }

    if (aprobar) {
      const torneo = await prisma.torneo.findUnique({ where: { id: partido.torneoId } });
      const partidoConfirmado = await confirmarResultado(prisma, partido, { validadoPor: req.usuarioId, k: kTorneo(torneo) });

      await registrarAuditoria(prisma, {
        usuarioId: req.usuarioId,
        accion: 'aprobar_resultado_torneo',
        entidadTipo: 'partido',
        entidadId: partido.id,
      });

      return res.status(200).json(partidoConfirmado);
    }

    await prisma.setPartido.deleteMany({ where: { partidoId: partido.id } });
    const partidoRechazado = await prisma.partido.update({
      where: { id: partido.id },
      data: { estado: 'pendiente', ganadorId: null, reportadoPor: null },
      include: INCLUYE_JUGADORES,
    });

    await registrarAuditoria(prisma, {
      usuarioId: req.usuarioId,
      accion: 'rechazar_resultado_torneo',
      entidadTipo: 'partido',
      entidadId: partido.id,
      detalle: { motivo: motivo || null },
    });

    if (partido.reportadoPor) {
      await crearNotificacion(prisma, {
        usuarioId: partido.reportadoPor,
        tipo: 'torneo',
        mensaje: motivo
          ? `Tu resultado reportado no fue aprobado: ${motivo}`
          : 'Tu resultado reportado no fue aprobado. Puedes volver a reportarlo.',
        referenciaId: partido.id,
      });
    }

    return res.status(200).json(partidoRechazado);
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

// GET /partidos/{id}/nota — observación privada del jugador sobre su propio partido ya
// confirmado: solo la ve quien la escribió, ni el rival ni un admin/árbitro.
router.get('/partidos/:id/nota', verificarToken, async (req, res, next) => {
  try {
    const partido = await prisma.partido.findUnique({ where: { id: req.params.id } });
    if (!partido) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    if (partido.jugadorAId !== req.usuarioId && partido.jugadorBId !== req.usuarioId) {
      return res.status(403).json({ error: 'Solo puedes ver observaciones de tus propios partidos' });
    }

    const nota = await prisma.notaPartido.findUnique({
      where: { partidoId_usuarioId: { partidoId: partido.id, usuarioId: req.usuarioId } },
    });

    return res.status(200).json({ texto: nota?.texto || '' });
  } catch (error) {
    return next(error);
  }
});

// PUT /partidos/{id}/nota — crea, actualiza o borra (con texto vacío) la observación privada.
router.put('/partidos/:id/nota', verificarToken, async (req, res, next) => {
  try {
    const { texto } = req.body;
    if (typeof texto !== 'string') {
      return res.status(400).json({ error: 'texto es obligatorio (puede ser un string vacío para borrarla)' });
    }

    const partido = await prisma.partido.findUnique({ where: { id: req.params.id } });
    if (!partido) {
      return res.status(404).json({ error: 'Partido no encontrado' });
    }
    if (partido.jugadorAId !== req.usuarioId && partido.jugadorBId !== req.usuarioId) {
      return res.status(403).json({ error: 'Solo puedes anotar observaciones en tus propios partidos' });
    }
    if (partido.estado !== 'confirmado') {
      return res.status(409).json({ error: 'Solo puedes agregar observaciones a partidos ya confirmados' });
    }

    const textoLimpio = texto.trim();

    if (!textoLimpio) {
      await prisma.notaPartido.deleteMany({ where: { partidoId: partido.id, usuarioId: req.usuarioId } });
      return res.status(200).json({ texto: '' });
    }

    const nota = await prisma.notaPartido.upsert({
      where: { partidoId_usuarioId: { partidoId: partido.id, usuarioId: req.usuarioId } },
      update: { texto: textoLimpio },
      create: { partidoId: partido.id, usuarioId: req.usuarioId, texto: textoLimpio },
    });

    return res.status(200).json({ texto: nota.texto });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

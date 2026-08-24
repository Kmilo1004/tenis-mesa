const express = require('express');
const prisma = require('../lib/prisma');
const { cerrarSiVencido, cerrarInscripcionesVencidas } = require('../lib/torneos.service');
const { crearPartidosDeCuadro } = require('../lib/cuadro.service');
const { calcularTablaGrupo } = require('../lib/grupos.service');
const { registrarAuditoria } = require('../lib/auditoria.service');
const { notificarPartidoProximo } = require('../lib/notificaciones.service');
const { revertirEloDePartido } = require('../lib/partidos.service');
const { verificarToken, requiereRol } = require('../middleware/auth.middleware');

const router = express.Router();

const TIPOS_VALIDOS = ['flash', 'oficial'];
const ALCANCES_VALIDOS = ['interno', 'abierto'];
const FORMATOS_VALIDOS = ['eliminacion_directa', 'grupos', 'mixto'];
const METODOS_ASIGNACION_VALIDOS = ['aleatorio', 'ranking_serpentina', 'manual'];
const LETRAS_GRUPO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// Devuelve un Date válido o null (en vez de dejar pasar un "Invalid Date" hasta Prisma,
// que respondería con un error técnico ilegible para el usuario).
function parsearFecha(valor) {
  const fecha = new Date(valor);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

// POST /torneos — RF-10, solo admin
router.post('/torneos', verificarToken, requiereRol('administrador'), async (req, res, next) => {
  try {
    const {
      nombre,
      tipo,
      alcance,
      formato,
      fechaInicio,
      fechaFin,
      fechaLimiteInscripcion,
      numeroGrupos,
      metodoAsignacionGrupos,
      clasificadosPorGrupo,
    } = req.body;

    if (!nombre || !tipo || !alcance || !formato || !fechaInicio || !fechaFin || !fechaLimiteInscripcion) {
      return res
        .status(400)
        .json({ error: 'nombre, tipo, alcance, formato, fechaInicio, fechaFin y fechaLimiteInscripcion son obligatorios' });
    }
    if (!TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ error: `tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}` });
    }
    if (!ALCANCES_VALIDOS.includes(alcance)) {
      return res.status(400).json({ error: `alcance debe ser uno de: ${ALCANCES_VALIDOS.join(', ')}` });
    }
    if (!FORMATOS_VALIDOS.includes(formato)) {
      return res.status(400).json({ error: `formato debe ser uno de: ${FORMATOS_VALIDOS.join(', ')}` });
    }

    const fechaInicioValida = parsearFecha(fechaInicio);
    const fechaFinValida = parsearFecha(fechaFin);
    const fechaLimiteValida = parsearFecha(fechaLimiteInscripcion);

    if (!fechaInicioValida || !fechaFinValida || !fechaLimiteValida) {
      return res.status(400).json({ error: 'fechaInicio, fechaFin y fechaLimiteInscripcion deben ser fechas válidas' });
    }

    const torneo = await prisma.torneo.create({
      data: {
        nombre,
        tipo,
        alcance,
        formato,
        fechaInicio: fechaInicioValida,
        fechaFin: fechaFinValida,
        fechaLimiteInscripcion: fechaLimiteValida,
        numeroGrupos: numeroGrupos ?? null,
        metodoAsignacionGrupos: metodoAsignacionGrupos ?? null,
        clasificadosPorGrupo: clasificadosPorGrupo ?? null,
        creadoPor: req.usuarioId,
      },
    });

    await registrarAuditoria(prisma, {
      usuarioId: req.usuarioId,
      accion: 'crear_torneo',
      entidadTipo: 'torneo',
      entidadId: torneo.id,
    });

    return res.status(201).json(torneo);
  } catch (error) {
    return next(error);
  }
});

// GET /torneos?tipo=&alcance=&estado=
router.get('/torneos', async (req, res, next) => {
  try {
    const { tipo, alcance, estado } = req.query;

    await cerrarInscripcionesVencidas(prisma);

    const torneos = await prisma.torneo.findMany({
      where: {
        ...(tipo ? { tipo } : {}),
        ...(alcance ? { alcance } : {}),
        ...(estado ? { estado } : {}),
      },
      orderBy: { fechaInicio: 'desc' },
    });

    return res.status(200).json(torneos);
  } catch (error) {
    return next(error);
  }
});

// GET /torneos/{id}
router.get('/torneos/:id', async (req, res, next) => {
  try {
    let torneo = await prisma.torneo.findUnique({ where: { id: req.params.id } });
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    torneo = await cerrarSiVencido(prisma, torneo);
    return res.status(200).json(torneo);
  } catch (error) {
    return next(error);
  }
});

// PATCH /torneos/{id} — solo admin
router.patch('/torneos/:id', verificarToken, requiereRol('administrador'), async (req, res, next) => {
  try {
    const torneo = await prisma.torneo.findUnique({ where: { id: req.params.id } });
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    const {
      nombre,
      tipo,
      alcance,
      formato,
      fechaInicio,
      fechaFin,
      fechaLimiteInscripcion,
      numeroGrupos,
      metodoAsignacionGrupos,
      clasificadosPorGrupo,
    } = req.body;

    if (tipo !== undefined && !TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ error: `tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}` });
    }
    if (alcance !== undefined && !ALCANCES_VALIDOS.includes(alcance)) {
      return res.status(400).json({ error: `alcance debe ser uno de: ${ALCANCES_VALIDOS.join(', ')}` });
    }
    if (formato !== undefined && !FORMATOS_VALIDOS.includes(formato)) {
      return res.status(400).json({ error: `formato debe ser uno de: ${FORMATOS_VALIDOS.join(', ')}` });
    }

    const data = {};
    if (nombre !== undefined) data.nombre = nombre;
    if (tipo !== undefined) data.tipo = tipo;
    if (alcance !== undefined) data.alcance = alcance;
    if (formato !== undefined) data.formato = formato;

    for (const [campo, valor] of Object.entries({ fechaInicio, fechaFin, fechaLimiteInscripcion })) {
      if (valor === undefined) continue;
      const fechaValida = parsearFecha(valor);
      if (!fechaValida) {
        return res.status(400).json({ error: `${campo} debe ser una fecha válida` });
      }
      data[campo] = fechaValida;
    }

    if (numeroGrupos !== undefined) {
      if (!Number.isInteger(numeroGrupos) || numeroGrupos < 2 || numeroGrupos > LETRAS_GRUPO.length) {
        return res.status(400).json({ error: `numeroGrupos debe ser un entero entre 2 y ${LETRAS_GRUPO.length}` });
      }
      data.numeroGrupos = numeroGrupos;
    }
    if (metodoAsignacionGrupos !== undefined) {
      if (!METODOS_ASIGNACION_VALIDOS.includes(metodoAsignacionGrupos)) {
        return res.status(400).json({ error: `metodoAsignacionGrupos debe ser uno de: ${METODOS_ASIGNACION_VALIDOS.join(', ')}` });
      }
      data.metodoAsignacionGrupos = metodoAsignacionGrupos;
    }
    if (clasificadosPorGrupo !== undefined) {
      if (!Number.isInteger(clasificadosPorGrupo) || clasificadosPorGrupo < 1) {
        return res.status(400).json({ error: 'clasificadosPorGrupo debe ser un entero mayor o igual a 1' });
      }
      data.clasificadosPorGrupo = clasificadosPorGrupo;
    }

    const torneoActualizado = await prisma.torneo.update({ where: { id: torneo.id }, data });

    await registrarAuditoria(prisma, {
      usuarioId: req.usuarioId,
      accion: 'editar_torneo',
      entidadTipo: 'torneo',
      entidadId: torneo.id,
      detalle: { campos: Object.keys(data) },
    });

    return res.status(200).json(torneoActualizado);
  } catch (error) {
    return next(error);
  }
});

// DELETE /torneos/{id} — solo admin. Revierte el efecto en el ranking de cualquier partido
// confirmado del torneo (misma lógica que anular un partido) antes de borrar todo en cascada.
router.delete('/torneos/:id', verificarToken, requiereRol('administrador'), async (req, res, next) => {
  try {
    const torneo = await prisma.torneo.findUnique({ where: { id: req.params.id } });
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    await prisma.$transaction(async (tx) => {
      const partidos = await tx.partido.findMany({ where: { torneoId: torneo.id }, select: { id: true } });
      for (const partido of partidos) {
        await revertirEloDePartido(tx, partido.id);
      }
      await tx.partido.deleteMany({ where: { torneoId: torneo.id } });
      await tx.torneo.delete({ where: { id: torneo.id } });
    });

    await registrarAuditoria(prisma, {
      usuarioId: req.usuarioId,
      accion: 'eliminar_torneo',
      entidadTipo: 'torneo',
      entidadId: torneo.id,
      detalle: { nombre: torneo.nombre },
    });

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

// POST /torneos/{id}/cerrar-inscripciones — RF-10b, solo admin
router.post('/torneos/:id/cerrar-inscripciones', verificarToken, requiereRol('administrador'), async (req, res, next) => {
  try {
    const torneo = await prisma.torneo.findUnique({ where: { id: req.params.id } });
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    if (torneo.estado !== 'inscripciones_abiertas') {
      return res.status(409).json({ error: `El torneo no tiene inscripciones abiertas (estado actual: ${torneo.estado})` });
    }

    const torneoActualizado = await prisma.torneo.update({
      where: { id: torneo.id },
      data: { estado: 'inscripciones_cerradas' },
    });

    await registrarAuditoria(prisma, {
      usuarioId: req.usuarioId,
      accion: 'cerrar_inscripciones',
      entidadTipo: 'torneo',
      entidadId: torneo.id,
    });

    return res.status(200).json(torneoActualizado);
  } catch (error) {
    return next(error);
  }
});

// POST /torneos/{id}/inscripciones — autoinscripción del jugador (RF-10c, RF-10c2, RF-10d)
router.post('/torneos/:id/inscripciones', verificarToken, async (req, res, next) => {
  try {
    let torneo = await prisma.torneo.findUnique({ where: { id: req.params.id } });
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    torneo = await cerrarSiVencido(prisma, torneo);

    if (torneo.estado !== 'inscripciones_abiertas') {
      return res.status(409).json({ error: `Las inscripciones no están abiertas para este torneo (estado actual: ${torneo.estado})` });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: req.usuarioId } });

    if (torneo.alcance === 'interno' && usuario.tipo !== 'interno') {
      return res.status(403).json({ error: 'Este torneo es interno: solo pueden inscribirse usuarios internos (RF-10c2)' });
    }

    const yaInscrito = await prisma.inscripcion.findUnique({
      where: { torneoId_usuarioId: { torneoId: torneo.id, usuarioId: req.usuarioId } },
    });
    if (yaInscrito) {
      return res.status(409).json({ error: 'Ya estás inscrito en este torneo' });
    }

    const inscripcion = await prisma.inscripcion.create({
      data: { torneoId: torneo.id, usuarioId: req.usuarioId, origen: 'autoinscripcion' },
    });

    return res.status(201).json(inscripcion);
  } catch (error) {
    return next(error);
  }
});

// DELETE /torneos/{id}/inscripciones/me
router.delete('/torneos/:id/inscripciones/me', verificarToken, async (req, res, next) => {
  try {
    const torneo = await prisma.torneo.findUnique({ where: { id: req.params.id } });
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    if (['en_curso', 'finalizado'].includes(torneo.estado)) {
      return res.status(409).json({ error: 'No puedes retirar tu inscripción de un torneo en curso o finalizado' });
    }

    const inscripcion = await prisma.inscripcion.findUnique({
      where: { torneoId_usuarioId: { torneoId: torneo.id, usuarioId: req.usuarioId } },
    });
    if (!inscripcion) {
      return res.status(404).json({ error: 'No estás inscrito en este torneo' });
    }

    // Si ya se generaron los grupos (pero aún no se publican), también quita su asignación
    // para que no quede jugando un grupo del que ya no está inscrito.
    await prisma.grupoJugador.deleteMany({ where: { usuarioId: req.usuarioId, grupo: { torneoId: torneo.id } } });
    await prisma.inscripcion.delete({ where: { id: inscripcion.id } });
    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

// GET /torneos/{id}/inscripciones
router.get('/torneos/:id/inscripciones', async (req, res, next) => {
  try {
    const torneo = await prisma.torneo.findUnique({ where: { id: req.params.id } });
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    const inscripciones = await prisma.inscripcion.findMany({
      where: { torneoId: torneo.id },
      include: { usuario: { select: { id: true, nombre: true, tipo: true, eloOficial: true } } },
      orderBy: { fechaInscripcion: 'asc' },
    });

    return res.status(200).json(inscripciones);
  } catch (error) {
    return next(error);
  }
});

// POST /torneos/{id}/inscripciones/manual — RF-10c, solo admin, solo externos en torneo abierto
router.post('/torneos/:id/inscripciones/manual', verificarToken, requiereRol('administrador'), async (req, res, next) => {
  try {
    const { usuarioId } = req.body;
    if (!usuarioId) {
      return res.status(400).json({ error: 'usuarioId es obligatorio' });
    }

    const torneo = await prisma.torneo.findUnique({ where: { id: req.params.id } });
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    if (torneo.alcance !== 'abierto') {
      return res.status(400).json({ error: 'Solo se pueden inscribir jugadores externos manualmente en torneos de alcance abierto' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    if (usuario.tipo !== 'externo') {
      return res.status(400).json({ error: 'La inscripción manual está reservada a jugadores externos (RF-10c)' });
    }

    const yaInscrito = await prisma.inscripcion.findUnique({
      where: { torneoId_usuarioId: { torneoId: torneo.id, usuarioId } },
    });
    if (yaInscrito) {
      return res.status(409).json({ error: 'Este jugador ya está inscrito en el torneo' });
    }

    const inscripcion = await prisma.inscripcion.create({
      data: { torneoId: torneo.id, usuarioId, origen: 'agregado_por_admin' },
    });

    await registrarAuditoria(prisma, {
      usuarioId: req.usuarioId,
      accion: 'inscribir_externo_manual',
      entidadTipo: 'torneo',
      entidadId: torneo.id,
      detalle: { usuarioInscrito: usuarioId },
    });

    return res.status(201).json(inscripcion);
  } catch (error) {
    return next(error);
  }
});

// POST /torneos/{id}/cuadro/generar — RF-11, solo admin
router.post('/torneos/:id/cuadro/generar', verificarToken, requiereRol('administrador'), async (req, res, next) => {
  try {
    let torneo = await prisma.torneo.findUnique({ where: { id: req.params.id } });
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    if (torneo.formato !== 'eliminacion_directa') {
      return res.status(400).json({ error: 'Por ahora solo se puede generar el cuadro para el formato "eliminacion_directa"' });
    }

    torneo = await cerrarSiVencido(prisma, torneo);
    if (torneo.estado !== 'inscripciones_cerradas') {
      return res.status(409).json({ error: `Debes cerrar las inscripciones antes de generar el cuadro (estado actual: ${torneo.estado})` });
    }

    const cuadroExistente = await prisma.partido.findFirst({ where: { torneoId: torneo.id } });
    if (cuadroExistente) {
      return res.status(409).json({ error: 'El cuadro de este torneo ya fue generado' });
    }

    const { siembra } = req.body;
    if (siembra && !['ranking', 'aleatorio'].includes(siembra)) {
      return res.status(400).json({ error: 'siembra debe ser "ranking" o "aleatorio"' });
    }

    const inscripciones = await prisma.inscripcion.findMany({
      where: { torneoId: torneo.id },
      include: { usuario: { select: { id: true, eloOficial: true } } },
    });

    if (inscripciones.length < 2) {
      return res.status(400).json({ error: 'Se necesitan al menos 2 inscritos para generar el cuadro' });
    }

    const participantes = inscripciones.map((i) => i.usuario);
    if (siembra === 'ranking') {
      participantes.sort((a, b) => b.eloOficial - a.eloOficial);
    } else {
      for (let i = participantes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [participantes[i], participantes[j]] = [participantes[j], participantes[i]];
      }
    }

    const partidos = await prisma.$transaction((tx) =>
      crearPartidosDeCuadro(tx, {
        torneo,
        participantesIds: participantes.map((p) => p.id),
        registradoPor: req.usuarioId,
      }),
    );

    await prisma.torneo.update({ where: { id: torneo.id }, data: { estado: 'en_curso' } });

    await registrarAuditoria(prisma, {
      usuarioId: req.usuarioId,
      accion: 'generar_cuadro',
      entidadTipo: 'torneo',
      entidadId: torneo.id,
      detalle: { siembra: siembra || 'aleatorio', participantes: participantes.length },
    });

    return res.status(201).json(partidos);
  } catch (error) {
    return next(error);
  }
});

// GET /torneos/{id}/cuadro
router.get('/torneos/:id/cuadro', async (req, res, next) => {
  try {
    const torneo = await prisma.torneo.findUnique({ where: { id: req.params.id } });
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    const partidos = await prisma.partido.findMany({
      where: { torneoId: torneo.id, grupoId: null },
      orderBy: [{ nivelRonda: 'asc' }, { creadoEn: 'asc' }],
      include: {
        sets: true,
        jugadorA: { select: { id: true, nombre: true } },
        jugadorB: { select: { id: true, nombre: true } },
        ganador: { select: { id: true, nombre: true } },
      },
    });

    return res.status(200).json({ torneo: { id: torneo.id, nombre: torneo.nombre, estado: torneo.estado }, partidos });
  } catch (error) {
    return next(error);
  }
});

// POST /torneos/{id}/grupos/generar — RF-11b, solo admin
router.post('/torneos/:id/grupos/generar', verificarToken, requiereRol('administrador'), async (req, res, next) => {
  try {
    let torneo = await prisma.torneo.findUnique({ where: { id: req.params.id } });
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    if (!['grupos', 'mixto'].includes(torneo.formato)) {
      return res.status(400).json({ error: 'Los grupos solo aplican a torneos con formato "grupos" o "mixto"' });
    }

    torneo = await cerrarSiVencido(prisma, torneo);
    if (torneo.estado !== 'inscripciones_cerradas') {
      return res.status(409).json({ error: `Debes cerrar las inscripciones antes de generar los grupos (estado actual: ${torneo.estado})` });
    }

    // Se puede regenerar la configuración (número de grupos / método) mientras el torneo siga en
    // "inscripciones_cerradas": todavía no se publicó (no existen partidos de grupos jugándose).
    const { numeroGrupos, metodoAsignacion, clasificadosPorGrupo } = req.body;

    if (!Number.isInteger(numeroGrupos) || numeroGrupos < 2) {
      return res.status(400).json({ error: 'numeroGrupos debe ser un entero mayor o igual a 2' });
    }
    if (numeroGrupos > LETRAS_GRUPO.length) {
      return res.status(400).json({ error: `numeroGrupos no puede ser mayor a ${LETRAS_GRUPO.length}` });
    }
    if (!METODOS_ASIGNACION_VALIDOS.includes(metodoAsignacion)) {
      return res.status(400).json({ error: `metodoAsignacion debe ser uno de: ${METODOS_ASIGNACION_VALIDOS.join(', ')}` });
    }

    let clasificados = torneo.clasificadosPorGrupo;
    if (torneo.formato === 'mixto') {
      clasificados = clasificadosPorGrupo ?? torneo.clasificadosPorGrupo;
      if (!Number.isInteger(clasificados) || clasificados < 1) {
        return res.status(400).json({ error: 'Para formato "mixto" debes indicar clasificadosPorGrupo (entero >= 1)' });
      }
    }

    const inscripciones = await prisma.inscripcion.findMany({
      where: { torneoId: torneo.id },
      include: { usuario: { select: { id: true, eloOficial: true } } },
    });

    if (inscripciones.length < numeroGrupos) {
      return res.status(400).json({ error: 'Debe haber al menos un inscrito por grupo' });
    }

    let participantes = inscripciones.map((i) => i.usuario);
    const asignacionesPorGrupo = Array.from({ length: numeroGrupos }, () => []);

    if (metodoAsignacion === 'aleatorio') {
      for (let i = participantes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [participantes[i], participantes[j]] = [participantes[j], participantes[i]];
      }
      participantes.forEach((p, i) => asignacionesPorGrupo[i % numeroGrupos].push(p.id));
    } else if (metodoAsignacion === 'ranking_serpentina') {
      participantes = [...participantes].sort((a, b) => b.eloOficial - a.eloOficial);
      participantes.forEach((p, i) => {
        const ronda = Math.floor(i / numeroGrupos);
        const posicion = i % numeroGrupos;
        const grupoIndex = ronda % 2 === 0 ? posicion : numeroGrupos - 1 - posicion;
        asignacionesPorGrupo[grupoIndex].push(p.id);
      });
    }
    // metodoAsignacion === 'manual': los grupos quedan vacíos, el admin asigna con PATCH después

    await prisma.$transaction(async (tx) => {
      // Regenerar: borra los grupos anteriores (y sus asignaciones, por cascada) antes de crear los nuevos
      await tx.grupo.deleteMany({ where: { torneoId: torneo.id } });

      for (let i = 0; i < numeroGrupos; i++) {
        const grupo = await tx.grupo.create({ data: { torneoId: torneo.id, nombre: `Grupo ${LETRAS_GRUPO[i]}` } });
        if (asignacionesPorGrupo[i].length) {
          await tx.grupoJugador.createMany({
            data: asignacionesPorGrupo[i].map((usuarioId) => ({ grupoId: grupo.id, usuarioId })),
          });
        }
      }

      await tx.torneo.update({
        where: { id: torneo.id },
        data: { numeroGrupos, metodoAsignacionGrupos: metodoAsignacion, clasificadosPorGrupo: clasificados },
      });
    });

    const gruposConJugadores = await prisma.grupo.findMany({
      where: { torneoId: torneo.id },
      include: { jugadores: { include: { usuario: { select: { id: true, nombre: true } } } } },
    });

    await registrarAuditoria(prisma, {
      usuarioId: req.usuarioId,
      accion: 'generar_grupos',
      entidadTipo: 'torneo',
      entidadId: torneo.id,
      detalle: { numeroGrupos, metodoAsignacion },
    });

    return res.status(201).json(gruposConJugadores);
  } catch (error) {
    return next(error);
  }
});

// GET /torneos/{id}/grupos
router.get('/torneos/:id/grupos', async (req, res, next) => {
  try {
    const grupos = await prisma.grupo.findMany({
      where: { torneoId: req.params.id },
      include: { jugadores: { include: { usuario: { select: { id: true, nombre: true } } } } },
      orderBy: { nombre: 'asc' },
    });

    return res.status(200).json(grupos);
  } catch (error) {
    return next(error);
  }
});

// PATCH /torneos/{id}/grupos/{grupoId} — RF-11b (asignación manual) / RF-11c (mover de grupo), solo admin
router.patch('/torneos/:id/grupos/:grupoId', verificarToken, requiereRol('administrador'), async (req, res, next) => {
  try {
    const { usuarioId } = req.body;
    if (!usuarioId) {
      return res.status(400).json({ error: 'usuarioId es obligatorio' });
    }

    const torneo = await prisma.torneo.findUnique({ where: { id: req.params.id } });
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    if (['en_curso', 'finalizado'].includes(torneo.estado)) {
      return res.status(409).json({ error: 'Los grupos ya fueron publicados y no se pueden editar' });
    }

    const grupo = await prisma.grupo.findFirst({ where: { id: req.params.grupoId, torneoId: torneo.id } });
    if (!grupo) {
      return res.status(404).json({ error: 'Grupo no encontrado en este torneo' });
    }

    const inscrito = await prisma.inscripcion.findUnique({
      where: { torneoId_usuarioId: { torneoId: torneo.id, usuarioId } },
    });
    if (!inscrito) {
      return res.status(400).json({ error: 'Ese usuario no está inscrito en este torneo' });
    }

    await prisma.grupoJugador.deleteMany({ where: { usuarioId, grupo: { torneoId: torneo.id } } });
    const asignacion = await prisma.grupoJugador.create({ data: { grupoId: grupo.id, usuarioId } });

    await registrarAuditoria(prisma, {
      usuarioId: req.usuarioId,
      accion: 'asignar_jugador_grupo',
      entidadTipo: 'grupo',
      entidadId: grupo.id,
      detalle: { usuarioAsignado: usuarioId },
    });

    return res.status(200).json(asignacion);
  } catch (error) {
    return next(error);
  }
});

// POST /torneos/{id}/grupos/publicar — genera el round-robin de cada grupo, solo admin
router.post('/torneos/:id/grupos/publicar', verificarToken, requiereRol('administrador'), async (req, res, next) => {
  try {
    const torneo = await prisma.torneo.findUnique({ where: { id: req.params.id } });
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    if (torneo.estado !== 'inscripciones_cerradas') {
      return res.status(409).json({ error: `Los grupos ya fueron publicados o el torneo no está listo (estado actual: ${torneo.estado})` });
    }

    const grupos = await prisma.grupo.findMany({ where: { torneoId: torneo.id }, include: { jugadores: true } });
    if (!grupos.length) {
      return res.status(400).json({ error: 'Primero debes generar los grupos' });
    }

    const totalInscritos = await prisma.inscripcion.count({ where: { torneoId: torneo.id } });
    const totalAsignados = grupos.reduce((acc, g) => acc + g.jugadores.length, 0);
    if (totalAsignados < totalInscritos) {
      return res.status(400).json({ error: `Hay ${totalInscritos - totalAsignados} inscrito(s) sin asignar a un grupo` });
    }

    const grupoInsuficiente = grupos.find((g) => g.jugadores.length < 2);
    if (grupoInsuficiente) {
      return res.status(400).json({ error: `${grupoInsuficiente.nombre} necesita al menos 2 jugadores para poder jugar` });
    }

    await prisma.$transaction(async (tx) => {
      for (const grupo of grupos) {
        const ids = grupo.jugadores.map((gj) => gj.usuarioId);
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            const partido = await tx.partido.create({
              data: {
                torneoId: torneo.id,
                grupoId: grupo.id,
                jugadorAId: ids[i],
                jugadorBId: ids[j],
                tipoPartido: torneo.tipo === 'oficial' ? 'torneo_oficial' : 'torneo_flash',
                afectaRanking: torneo.tipo === 'oficial' ? 'oficial' : 'no_oficial',
                estado: 'pendiente',
                fechaPartido: torneo.fechaInicio,
                registradoPor: req.usuarioId,
              },
            });
            // RF-21: el partido de grupo ya tiene ambos jugadores definidos desde ya
            await notificarPartidoProximo(tx, partido);
          }
        }
      }

      await tx.torneo.update({ where: { id: torneo.id }, data: { estado: 'en_curso' } });
    });

    const partidos = await prisma.partido.findMany({ where: { torneoId: torneo.id, grupoId: { not: null } } });

    await registrarAuditoria(prisma, {
      usuarioId: req.usuarioId,
      accion: 'publicar_grupos',
      entidadTipo: 'torneo',
      entidadId: torneo.id,
      detalle: { partidosGenerados: partidos.length },
    });

    return res.status(201).json(partidos);
  } catch (error) {
    return next(error);
  }
});

// GET /torneos/{id}/grupos/{grupoId}/tabla — RF-11e
router.get('/torneos/:id/grupos/:grupoId/tabla', async (req, res, next) => {
  try {
    const grupo = await prisma.grupo.findFirst({ where: { id: req.params.grupoId, torneoId: req.params.id } });
    if (!grupo) {
      return res.status(404).json({ error: 'Grupo no encontrado en este torneo' });
    }

    const tabla = await calcularTablaGrupo(prisma, grupo.id);
    return res.status(200).json({ grupo: { id: grupo.id, nombre: grupo.nombre }, tabla });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

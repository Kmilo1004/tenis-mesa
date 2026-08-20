const express = require('express');
const prisma = require('../lib/prisma');
const { generarCsv } = require('../lib/csv');
const { generarPdfTabla } = require('../lib/pdf');
const { verificarToken, requiereRol } = require('../middleware/auth.middleware');

const router = express.Router();

function responderReporte(res, formato, { archivo, titulo, columnas, filas }) {
  if (formato === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${archivo}.csv"`);
    return res.status(200).send(generarCsv(columnas, filas));
  }

  res.setHeader('Content-Disposition', `attachment; filename="${archivo}.pdf"`);
  return generarPdfTabla(res, { titulo, columnas, filas });
}

// GET /reportes/ranking?tipo=oficial|no_oficial&formato=pdf|csv — RF-23, solo admin
router.get('/reportes/ranking', verificarToken, requiereRol('administrador'), async (req, res, next) => {
  try {
    const tipo = req.query.tipo === 'no_oficial' ? 'no_oficial' : 'oficial';
    const formato = req.query.formato === 'csv' ? 'csv' : 'pdf';
    const campoElo = tipo === 'oficial' ? 'eloOficial' : 'eloNoOficial';

    const usuarios = await prisma.usuario.findMany({
      where: { tipo: 'interno', activo: true },
      orderBy: [{ [campoElo]: 'desc' }, { id: 'asc' }],
      select: { nombre: true, [campoElo]: true },
    });

    const filas = usuarios.map((u, i) => ({ posicion: i + 1, nombre: u.nombre, elo: u[campoElo] }));
    const columnas = [
      { clave: 'posicion', titulo: 'Posición' },
      { clave: 'nombre', titulo: 'Jugador' },
      { clave: 'elo', titulo: 'ELO' },
    ];

    return responderReporte(res, formato, {
      archivo: `ranking-${tipo}`,
      titulo: tipo === 'oficial' ? 'Ranking Interno' : 'Ranking',
      columnas,
      filas,
    });
  } catch (error) {
    return next(error);
  }
});

// GET /reportes/torneo/{id}?formato=pdf|csv — RF-23, solo admin
router.get('/reportes/torneo/:id', verificarToken, requiereRol('administrador'), async (req, res, next) => {
  try {
    const torneo = await prisma.torneo.findUnique({ where: { id: req.params.id } });
    if (!torneo) {
      return res.status(404).json({ error: 'Torneo no encontrado' });
    }

    const formato = req.query.formato === 'csv' ? 'csv' : 'pdf';

    const partidos = await prisma.partido.findMany({
      where: { torneoId: torneo.id },
      orderBy: [{ nivelRonda: 'asc' }, { creadoEn: 'asc' }],
      include: {
        sets: true,
        jugadorA: { select: { nombre: true } },
        jugadorB: { select: { nombre: true } },
        ganador: { select: { nombre: true } },
        grupo: { select: { nombre: true } },
      },
    });

    const filas = partidos.map((p) => ({
      etapa: p.grupo ? p.grupo.nombre : p.ronda || '',
      jugadorA: p.jugadorA ? p.jugadorA.nombre : 'Por definir',
      jugadorB: p.jugadorB ? p.jugadorB.nombre : 'Por definir',
      marcador: p.sets.map((s) => `${s.puntosJugadorA}-${s.puntosJugadorB}`).join(', '),
      ganador: p.ganador ? p.ganador.nombre : '',
      estado: p.estado,
    }));

    const columnas = [
      { clave: 'etapa', titulo: 'Etapa' },
      { clave: 'jugadorA', titulo: 'Jugador A' },
      { clave: 'jugadorB', titulo: 'Jugador B' },
      { clave: 'marcador', titulo: 'Marcador' },
      { clave: 'ganador', titulo: 'Ganador' },
      { clave: 'estado', titulo: 'Estado' },
    ];

    return responderReporte(res, formato, {
      archivo: `torneo-${torneo.id}`,
      titulo: `Resultados — ${torneo.nombre}`,
      columnas,
      filas,
    });
  } catch (error) {
    return next(error);
  }
});

// GET /reportes/estadisticas — RF-24, solo admin
router.get('/reportes/estadisticas', verificarToken, requiereRol('administrador'), async (req, res, next) => {
  try {
    const [partidosJugados, torneosPorEstado, jugadoresMasActivos] = await Promise.all([
      prisma.partido.count({ where: { estado: 'confirmado' } }),
      prisma.torneo.groupBy({ by: ['estado'], _count: { _all: true } }),
      prisma.usuario.findMany({
        where: { tipo: 'interno' },
        select: {
          id: true,
          nombre: true,
          _count: { select: { partidosComoJugadorA: true, partidosComoJugadorB: true } },
        },
      }),
    ]);

    const top10Activos = jugadoresMasActivos
      .map((u) => ({
        id: u.id,
        nombre: u.nombre,
        partidosJugados: u._count.partidosComoJugadorA + u._count.partidosComoJugadorB,
      }))
      .sort((a, b) => b.partidosJugados - a.partidosJugados)
      .slice(0, 10);

    return res.status(200).json({
      partidosConfirmados: partidosJugados,
      torneosPorEstado: Object.fromEntries(torneosPorEstado.map((t) => [t.estado, t._count._all])),
      jugadoresMasActivos: top10Activos,
    });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

const express = require('express');
const cors = require('cors');

const healthRoutes = require('./routes/health.routes');
const versionRoutes = require('./routes/version.routes');
const authRoutes = require('./routes/auth.routes');
const usuarioRoutes = require('./routes/usuario.routes');
const partidoRoutes = require('./routes/partido.routes');
const rankingRoutes = require('./routes/ranking.routes');
const torneoRoutes = require('./routes/torneo.routes');
const auditoriaRoutes = require('./routes/auditoria.routes');
const notificacionRoutes = require('./routes/notificacion.routes');
const reportesRoutes = require('./routes/reportes.routes');

const app = express();

app.use(cors());
app.use(express.json());

// Todas las rutas de la API viven bajo /api/v1 (convención definida en el documento, sección 8)
app.use('/api/v1', healthRoutes);
app.use('/api/v1', versionRoutes);
app.use('/api/v1', authRoutes);
app.use('/api/v1', usuarioRoutes);
app.use('/api/v1', partidoRoutes);
app.use('/api/v1', rankingRoutes);
app.use('/api/v1', torneoRoutes);
app.use('/api/v1', auditoriaRoutes);
app.use('/api/v1', notificacionRoutes);
app.use('/api/v1', reportesRoutes);

// 404 explícito para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador de errores centralizado. Los errores de Prisma no controlados (ej. un dato con un
// tipo/formato inválido que se nos coló sin validar) no deben mostrarle al usuario el objeto o
// código técnico de la base de datos: se registran en el log del servidor y se responde un
// mensaje genérico.
app.use((err, req, res, next) => {
  console.error(err);
  const esErrorDePrisma = typeof err.name === 'string' && err.name.startsWith('Prisma');
  const mensaje = esErrorDePrisma ? 'Los datos enviados no son válidos' : err.message || 'Error interno del servidor';
  res.status(err.status || 500).json({ error: mensaje });
});

module.exports = app;

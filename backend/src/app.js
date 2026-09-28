const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

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
const configuracionRoutes = require('./routes/configuracion.routes');

const app = express();

// Render corre detrás de su proxy: sin esto, express-rate-limit vería la IP del proxy para todo
// el mundo (un solo cubo compartido) y req.ip sería inútil.
app.set('trust proxy', 1);

app.use(helmet());

// Solo la versión web publicada necesita CORS. La app nativa (Android) no manda cabecera Origin,
// por eso se permite su ausencia; un navegador de un sitio ajeno sí la manda y queda bloqueado.
const ORIGENES_PERMITIDOS = (process.env.ORIGENES_PERMITIDOS || 'https://kmilo1004.github.io')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Fuera de producción se acepta cualquier puerto de localhost, que es donde corre `expo start
// --web` mientras se desarrolla (el puerto cambia seguido). En producción NO: solo la lista de
// arriba.
const EN_PRODUCCION = process.env.NODE_ENV === 'production';
const REGEX_LOCALHOST = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

// Queda en el log del despliegue para poder confirmar de un vistazo que producción arrancó en
// modo estricto (si NODE_ENV no llegara configurado, acá se nota de inmediato).
console.log(
  `CORS: modo ${EN_PRODUCCION ? 'producción (estricto)' : 'desarrollo (acepta localhost)'} — permitidos: ${ORIGENES_PERMITIDOS.join(', ')}`,
);

function origenPermitido(origin) {
  if (ORIGENES_PERMITIDOS.includes(origin)) return true;
  return !EN_PRODUCCION && REGEX_LOCALHOST.test(origin);
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origenPermitido(origin)) return callback(null, true);
      // Con `status` el manejador de errores responde 403 en vez de tratarlo como una falla
      // inesperada del servidor (500) y llenar el log de ruido.
      return callback(Object.assign(new Error('Origen no permitido'), { status: 403 }));
    },
  }),
);

app.use(express.json({ limit: '100kb' }));

// Límite general: tope de abuso, holgado para el uso normal de la app (que hace varias llamadas
// por pantalla). Los endpoints de autenticación llevan límites mucho más estrictos aparte.
app.use(
  '/api/v1',
  rateLimit({
    windowMs: 60 * 1000,
    limit: 180,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiadas peticiones. Espera un momento e intenta de nuevo.' },
  }),
);

// Login: bcrypt cuesta ~100ms de CPU por intento y el plan free tiene una sola CPU compartida, así
// que este límite protege de dos cosas a la vez — fuerza bruta de contraseñas y tumbar el servidor
// a punta de intentos. Los aciertos no cuentan, para no castigar a quien sí sabe su contraseña.
app.use(
  '/api/v1/auth/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.' },
  }),
);

// Recuperación de contraseña: sin tope, cualquiera puede llenarle el buzón a otra persona y agotar
// la cuota del servicio de correo.
app.use(
  '/api/v1/auth/olvide-password',
  rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiadas solicitudes de recuperación. Intenta de nuevo en una hora.' },
  }),
);

// Registro: evita que se llene el club (y el ranking) de cuentas basura creadas por un script.
app.use(
  '/api/v1/auth/registro',
  rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiados registros desde esta conexión. Intenta de nuevo en una hora.' },
  }),
);

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
app.use('/api/v1', configuracionRoutes);

// 404 explícito para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejador de errores centralizado. Los errores de Prisma no controlados (ej. un dato con un
// tipo/formato inválido que se nos coló sin validar) no deben mostrarle al usuario el objeto o
// código técnico de la base de datos: se registran en el log del servidor y se responde un
// mensaje genérico.
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} —`, err);

  const esErrorDePrisma = typeof err.name === 'string' && err.name.startsWith('Prisma');
  if (esErrorDePrisma) {
    return res.status(400).json({ error: 'Los datos enviados no son válidos' });
  }

  // Un error con `status` lo lanzó nuestro propio código a propósito (ej. "este partido ya fue
  // confirmado"), así que su mensaje está pensado para el usuario y se puede mostrar. Cualquier
  // otro error es inesperado: su mensaje puede exponer rutas, consultas o detalles internos, así
  // que queda solo en el log del servidor.
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }

  return res.status(500).json({ error: 'Error interno del servidor' });
});

module.exports = app;

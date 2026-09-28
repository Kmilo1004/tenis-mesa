require('dotenv').config();
const app = require('./app');
const prisma = require('./lib/prisma');

// Falta una variable crítica => el servidor no arranca. Antes, sin JWT_SECRET, el proceso
// levantaba igual y cada login respondía 500 sin decir por qué; es mejor fallar de una vez y con
// un mensaje claro en el log del despliegue.
const VARIABLES_REQUERIDAS = ['DATABASE_URL', 'JWT_SECRET'];
const faltantes = VARIABLES_REQUERIDAS.filter((clave) => !process.env[clave]);

if (faltantes.length > 0) {
  console.error(`Faltan variables de entorno obligatorias: ${faltantes.join(', ')}`);
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET es demasiado corto: usa al menos 32 caracteres aleatorios.');
  process.exit(1);
}

const PORT = process.env.PORT || 3000;

const servidor = app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
  console.log(`Prueba: http://localhost:${PORT}/api/v1/health`);
});

// Render manda SIGTERM en cada despliegue (y al apagar el servicio por inactividad en el plan
// free). Sin esto, las peticiones en curso se cortan a mitad y las conexiones a Postgres quedan
// colgando hasta que Neon las expira.
async function apagarOrdenadamente(senal) {
  console.log(`${senal} recibido: cerrando el servidor...`);
  servidor.close(async () => {
    await prisma.$disconnect();
    console.log('Servidor cerrado correctamente.');
    process.exit(0);
  });

  // Si algo se queda colgado, no bloquear el despliegue indefinidamente.
  setTimeout(() => {
    console.error('El cierre ordenado tardó demasiado: forzando salida.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => apagarOrdenadamente('SIGTERM'));
process.on('SIGINT', () => apagarOrdenadamente('SIGINT'));

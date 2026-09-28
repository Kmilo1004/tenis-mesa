require('dotenv').config();

// `prisma migrate dev` y `migrate reset` son comandos de desarrollo: cuando detectan que el
// esquema de la base no coincide con el historial de migraciones, ofrecen BORRAR Y RECREAR la
// base entera. Contra la base de producción eso significa perder todos los usuarios, partidos y
// el ranking del club.
//
// Este guardia corre antes de esos comandos y los aborta si DATABASE_URL (o DIRECT_URL) apuntan
// al endpoint de producción. `prisma migrate deploy`, que es el que usa Render al desplegar, no
// pasa por acá: ese sí debe correr contra producción y nunca borra nada.
const ENDPOINTS_DE_PRODUCCION = ['ep-billowing-salad-axghbt6g'];

function apuntaAProduccion(cadenaConexion) {
  return ENDPOINTS_DE_PRODUCCION.some((endpoint) => (cadenaConexion || '').includes(endpoint));
}

function extraerHost(cadenaConexion) {
  const coincidencia = /@([^/:?]+)/.exec(cadenaConexion || '');
  return coincidencia ? coincidencia[1] : '(no definida)';
}

const { DATABASE_URL, DIRECT_URL } = process.env;

if (!DATABASE_URL) {
  console.error('\n  DATABASE_URL no está definida. Revisa tu archivo backend/.env\n');
  process.exit(1);
}

if (apuntaAProduccion(DATABASE_URL) || apuntaAProduccion(DIRECT_URL)) {
  console.error(`
  ─────────────────────────────────────────────────────────────────
   MIGRACIÓN BLOQUEADA: tu .env apunta a la base de PRODUCCIÓN
  ─────────────────────────────────────────────────────────────────

   Host detectado: ${extraerHost(DATABASE_URL)}

   Este comando puede ofrecerte resetear la base de datos, lo que
   borraría todos los usuarios, partidos y el ranking del club.

   Qué hacer:
     1. En el panel de Neon, usa la rama de desarrollo (no "main").
     2. Copia su cadena de conexión a backend/.env
        (DATABASE_URL y DIRECT_URL).
     3. Vuelve a ejecutar este comando.

   Para aplicar migraciones en producción se usa "migrate deploy",
   que nunca borra datos y corre solo en el despliegue de Render.
  ─────────────────────────────────────────────────────────────────
`);
  process.exit(1);
}

console.log(`Base de datos de desarrollo verificada: ${extraerHost(DATABASE_URL)}`);

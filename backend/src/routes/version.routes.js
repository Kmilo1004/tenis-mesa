const express = require('express');

const router = express.Router();

// Última versión publicada del APK. Como la app se distribuye como APK directo (no por Play
// Store), este valor se actualiza a mano cada vez que se genera un build nuevo en EAS: subir
// "version" al mismo valor que app.json y pegar el link de descarga que entrega `eas build`.
const ULTIMA_VERSION = {
  version: '2.3.1',
  url: 'https://expo.dev/artifacts/eas/cc_ocSlSAAzQ5P6FF3d1Zy1K5LpBksgCwSmZPKC5TZI.apk',
  notas: '¡Nuevos desafíos en vivo! Mándale un desafío a otro jugador y, cuando lo acepte, vayan cargando el resultado de cada set a medida que termina, con confirmación del rival y análisis privado por set — todo se actualiza solo, sin recargar. Nuevo botón (+) para registrar partido o desafiar a alguien. Los partidos anulados ahora solo los ve el administrador. La tarjeta de "Últimos resultados" del perfil es tocable y muestra más partidos. Y la versión web se ve mucho mejor en pantallas de PC.',
};

// GET /version — pública, la consulta la app para saber si hay un APK más nuevo disponible.
router.get('/version', (req, res) => {
  res.status(200).json(ULTIMA_VERSION);
});

module.exports = router;
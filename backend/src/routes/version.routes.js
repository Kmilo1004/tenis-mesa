const express = require('express');

const router = express.Router();

// Última versión publicada del APK. Como la app se distribuye como APK directo (no por Play
// Store), este valor se actualiza a mano cada vez que se genera un build nuevo en EAS: subir
// "version" al mismo valor que app.json y pegar el link de descarga que entrega `eas build`.
const ULTIMA_VERSION = {
  version: '1.0.5',
  url: 'https://expo.dev/artifacts/eas/4N2H844VdkROAGbRa84WL9C1vOHFR2rtA77Zsw0Emys.apk',
  notas: 'Gestión de roles, estadísticas por jugador, borrado de torneos, logo circular en el splash y reportes PDF rediseñados.',
};

// GET /version — pública, la consulta la app para saber si hay un APK más nuevo disponible.
router.get('/version', (req, res) => {
  res.status(200).json(ULTIMA_VERSION);
});

module.exports = router;
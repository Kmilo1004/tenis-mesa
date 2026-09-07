const express = require('express');

const router = express.Router();

// Última versión publicada del APK. Como la app se distribuye como APK directo (no por Play
// Store), este valor se actualiza a mano cada vez que se genera un build nuevo en EAS: subir
// "version" al mismo valor que app.json y pegar el link de descarga que entrega `eas build`.
const ULTIMA_VERSION = {
  version: '1.0.9',
  url: 'https://expo.dev/artifacts/eas/VrdTOkzuRyXGbub7_l1A7XhJ5bjK3huOhQvJR7IwcHw.apk',
  notas: 'Reporte PDF de torneo rediseñado (tabla de grupos y árbol de eliminación), botones de formulario que avisan cuando falta algo por llenar, mejoras al mover jugadores entre grupos manualmente, y una corrección de estabilidad al confirmar el último partido de la fase de grupos.',
};

// GET /version — pública, la consulta la app para saber si hay un APK más nuevo disponible.
router.get('/version', (req, res) => {
  res.status(200).json(ULTIMA_VERSION);
});

module.exports = router;
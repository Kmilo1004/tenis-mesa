const express = require('express');

const router = express.Router();

// Última versión publicada del APK. Como la app se distribuye como APK directo (no por Play
// Store), este valor se actualiza a mano cada vez que se genera un build nuevo en EAS: subir
// "version" al mismo valor que app.json y pegar el link de descarga que entrega `eas build`.
const ULTIMA_VERSION = {
  version: '1.0.1',
  url: 'https://expo.dev/artifacts/eas/BDSHzbn6rC7TaSNp_Ife3Y2rktOpnf15i9DU0COIt54.apk',
  notas: 'Edición de torneos ya creados y nuevo diseño en el detalle de partidos.',
};

// GET /version — pública, la consulta la app para saber si hay un APK más nuevo disponible.
router.get('/version', (req, res) => {
  res.status(200).json(ULTIMA_VERSION);
});

module.exports = router;
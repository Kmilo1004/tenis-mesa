const express = require('express');

const router = express.Router();

// Última versión publicada del APK. Como la app se distribuye como APK directo (no por Play
// Store), este valor se actualiza a mano cada vez que se genera un build nuevo en EAS: subir
// "version" al mismo valor que app.json y pegar el link de descarga que entrega `eas build`.
const ULTIMA_VERSION = {
  version: '1.0.9',
  url: 'https://expo.dev/artifacts/eas/zaYU-ll2hxk1XMXzzIx6c2kwD5O6kFGZlF8H4CwdHTQ.apk',
  notas: 'Se corrige el registro de notificaciones push en Android (faltaba la configuración de Firebase), la lista de inscritos de un torneo ahora se puede expandir/colapsar, y agregar un invitado ya no exige marcar la casilla de consentimiento.',
};

// GET /version — pública, la consulta la app para saber si hay un APK más nuevo disponible.
router.get('/version', (req, res) => {
  res.status(200).json(ULTIMA_VERSION);
});

module.exports = router;
const express = require('express');

const router = express.Router();

// Última versión publicada del APK. Como la app se distribuye como APK directo (no por Play
// Store), este valor se actualiza a mano cada vez que se genera un build nuevo en EAS: subir
// "version" al mismo valor que app.json y pegar el link de descarga que entrega `eas build`.
const ULTIMA_VERSION = {
  version: '2.0.0',
  url: 'https://expo.dev/artifacts/eas/fBy0xNW_WHHDEp2zXKmE8QJeJxFnu0YMsC2kFFrcsto.apk',
  notas: 'Tabla de grupos en cuadrícula cruzada también en la app (igual al PDF), recuperación de contraseña por correo y restablecimiento manual desde el panel de admin, y una corrección para que Android bloquee instalar una versión vieja encima de una más nueva.',
};

// GET /version — pública, la consulta la app para saber si hay un APK más nuevo disponible.
router.get('/version', (req, res) => {
  res.status(200).json(ULTIMA_VERSION);
});

module.exports = router;
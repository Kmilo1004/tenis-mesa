const express = require('express');

const router = express.Router();

// Última versión publicada del APK. Como la app se distribuye como APK directo (no por Play
// Store), este valor se actualiza a mano cada vez que se genera un build nuevo en EAS: subir
// "version" al mismo valor que app.json y pegar el link de descarga que entrega `eas build`.
const ULTIMA_VERSION = {
  version: '1.0.3',
  url: 'https://expo.dev/artifacts/eas/liFXTeM8e-FEk-WVgHsVwG1fJL4GeNbnQJwMhJCw9vk.apk',
  notas: 'Agrega botón de mostrar/ocultar contraseña y corrige el teclado tapando los campos en Android.',
};

// GET /version — pública, la consulta la app para saber si hay un APK más nuevo disponible.
router.get('/version', (req, res) => {
  res.status(200).json(ULTIMA_VERSION);
});

module.exports = router;
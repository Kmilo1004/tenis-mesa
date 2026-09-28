const express = require('express');

const router = express.Router();

// Última versión publicada del APK. Como la app se distribuye como APK directo (no por Play
// Store), este valor se actualiza a mano cada vez que se genera un build nuevo en EAS: subir
// "version" al mismo valor que app.json y pegar el link de descarga que entrega `eas build`.
//
// Las versiones llevan dos números ("2.7", no "2.7.0"). La app solo ofrece actualizar si esta
// versión es mayor que la instalada, así que hay que subirla en cada build publicado.
const ULTIMA_VERSION = {
  version: '2.7',
  url: 'https://expo.dev/artifacts/eas/_nR8WpErmL0hutgYvcfxIIdRo3k18e82BYziVfltLRk.apk',
  // Los detalles de un parche de seguridad no se publican: describir qué se corrigió es un mapa
  // para quien todavía tenga una versión vieja instalada.
  notas: 'Parche de seguridad. Es necesario instalar esta actualización para que la app siga funcionando con normalidad.',
};

// GET /version — pública, la consulta la app para saber si hay un APK más nuevo disponible.
router.get('/version', (req, res) => {
  res.status(200).json(ULTIMA_VERSION);
});

module.exports = router;
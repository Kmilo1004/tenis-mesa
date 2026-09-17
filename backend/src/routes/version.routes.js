const express = require('express');

const router = express.Router();

// Última versión publicada del APK. Como la app se distribuye como APK directo (no por Play
// Store), este valor se actualiza a mano cada vez que se genera un build nuevo en EAS: subir
// "version" al mismo valor que app.json y pegar el link de descarga que entrega `eas build`.
const ULTIMA_VERSION = {
  version: '2.3.0',
  url: 'https://expo.dev/artifacts/eas/EQ23mQOg9BHE9AYMs0wIdFVUeqjSUnhq_JAHh1MguEk.apk',
  notas: '¡Nuevos desafíos en vivo! Mándale un desafío a otro jugador, y una vez lo acepte vayan cargando el resultado de cada set a medida que termina (con confirmación del rival y análisis privado por set). También: mejor navegación entre pantallas, la tarjeta de "Últimos resultados" en tu perfil ahora es tocable, y la versión web se ve mucho mejor en pantallas de PC.',
};

// GET /version — pública, la consulta la app para saber si hay un APK más nuevo disponible.
router.get('/version', (req, res) => {
  res.status(200).json(ULTIMA_VERSION);
});

module.exports = router;
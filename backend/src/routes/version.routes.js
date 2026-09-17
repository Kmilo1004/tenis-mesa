const express = require('express');

const router = express.Router();

// Última versión publicada del APK. Como la app se distribuye como APK directo (no por Play
// Store), este valor se actualiza a mano cada vez que se genera un build nuevo en EAS: subir
// "version" al mismo valor que app.json y pegar el link de descarga que entrega `eas build`.
const ULTIMA_VERSION = {
  version: '2.2.0',
  url: 'https://expo.dev/artifacts/eas/EQ23mQOg9BHE9AYMs0wIdFVUeqjSUnhq_JAHh1MguEk.apk',
  notas: 'Nueva pantalla de Configuración (tuerquita en Perfil): cambiar tu nombre, contraseña, notificaciones push y ver la versión. Panel de "Mis estadísticas" con más detalle (evolución del ranking, forma reciente, mejor racha). Y llegaron los niveles de jugador (Principiante, Formativo, Precompetitivo, Competitivo), con ELO inicial según el nivel y una etiqueta opcional en el ranking.',
};

// GET /version — pública, la consulta la app para saber si hay un APK más nuevo disponible.
router.get('/version', (req, res) => {
  res.status(200).json(ULTIMA_VERSION);
});

module.exports = router;
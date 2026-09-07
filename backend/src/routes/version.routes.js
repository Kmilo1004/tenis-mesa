const express = require('express');

const router = express.Router();

// Última versión publicada del APK. Como la app se distribuye como APK directo (no por Play
// Store), este valor se actualiza a mano cada vez que se genera un build nuevo en EAS: subir
// "version" al mismo valor que app.json y pegar el link de descarga que entrega `eas build`.
const ULTIMA_VERSION = {
  version: '2.1.0',
  url: 'https://expo.dev/artifacts/eas/E-IdbW4rODHK2hmetta1lyiTy850WpEXNM9EJZeCxHc.apk',
  notas: 'Ahora puedes recuperar tu contraseña por correo (o pedirle a un admin que te la restablezca), y agregar observaciones privadas a tus partidos confirmados que solo tú puedes ver. Además: ícono propio en las notificaciones, botón de volver arreglado en el perfil de un jugador del ranking, y orden fijo de partidos en grupos de 4 jugadores.',
};

// GET /version — pública, la consulta la app para saber si hay un APK más nuevo disponible.
router.get('/version', (req, res) => {
  res.status(200).json(ULTIMA_VERSION);
});

module.exports = router;
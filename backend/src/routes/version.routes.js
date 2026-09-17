const express = require('express');

const router = express.Router();

// Última versión publicada del APK. Como la app se distribuye como APK directo (no por Play
// Store), este valor se actualiza a mano cada vez que se genera un build nuevo en EAS: subir
// "version" al mismo valor que app.json y pegar el link de descarga que entrega `eas build`.
const ULTIMA_VERSION = {
  version: '2.3.0',
  url: 'https://expo.dev/artifacts/eas/2b8PKYzgPbTaOpNJftoeHhs2eMF2kcI4nivbJpJjl-c.apk',
  notas: '¡Nuevos desafíos en vivo! Mándale un desafío a otro jugador y, cuando lo acepte, vayan cargando el resultado de cada set a medida que termina — cada set lo confirma el rival antes de contar, y pueden dejar un análisis privado por set. Si nadie responde el desafío en 24h, se borra solo. Mientras juegan, la pantalla se actualiza sola sin recargar. También: se arregló quedar atascado en un partido al entrar desde otra pantalla; la tarjeta de "Últimos resultados" del perfil ahora es tocable y muestra más partidos; los partidos anulados ya no los ve nadie más que el administrador; la versión web se ve mucho mejor en pantallas de PC; y un botón nuevo (+) para registrar partido o desafiar a alguien.',
};

// GET /version — pública, la consulta la app para saber si hay un APK más nuevo disponible.
router.get('/version', (req, res) => {
  res.status(200).json(ULTIMA_VERSION);
});

module.exports = router;
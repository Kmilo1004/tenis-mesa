const express = require('express');

const router = express.Router();

// Última versión publicada del APK. Como la app se distribuye como APK directo (no por Play
// Store), este valor se actualiza a mano cada vez que se genera un build nuevo en EAS: subir
// "version" al mismo valor que app.json y pegar el link de descarga que entrega `eas build`.
const ULTIMA_VERSION = {
  version: '2.4.0',
  url: 'https://expo.dev/artifacts/eas/W6teASxqE8JjA0WCSW3RYiaJ8V_PTP3rgnmg8M_dBmk.apk',
  notas: '¡Nuevos desafíos en vivo! Reta a otro jugador y, cuando acepte, vayan cargando el resultado de cada set en tiempo real, con confirmación mutua y un análisis privado por set. Nuevo historial de partidos detallado: revísalo agrupado por rival o en orden cronológico, con el marcador set a set de cada partido. Se agregaron avatares personalizables para tu perfil, con varios estilos para elegir. Y en general, varias mejoras visuales y gráficas en toda la app.',
};

// GET /version — pública, la consulta la app para saber si hay un APK más nuevo disponible.
router.get('/version', (req, res) => {
  res.status(200).json(ULTIMA_VERSION);
});

module.exports = router;
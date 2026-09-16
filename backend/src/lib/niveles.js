// Clasificación del jugador y el ELO con el que arranca según su nivel (mismo valor para
// eloOficial y eloNoOficial al crearse). Ajustar aquí cambia solo a los jugadores nuevos, no
// retroactivamente a los que ya tienen partidos jugados.
const NIVELES_VALIDOS = ['principiante', 'formativo', 'precompetitivo', 'competitivo'];

const ELO_INICIAL_POR_NIVEL = {
  principiante: 700,
  formativo: 800,
  precompetitivo: 900,
  competitivo: 1000,
};

module.exports = { NIVELES_VALIDOS, ELO_INICIAL_POR_NIVEL };

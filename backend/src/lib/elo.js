// K-factors definidos en la sección 6.2 del documento de requerimientos
const K_CASUAL = 16;
const K_TORNEO_FLASH = 20;
const K_TORNEO_OFICIAL_INTERNO = 24;
const K_TORNEO_OFICIAL_ABIERTO = 32;
const K_AMISTOSO_PROMOVIDO = 20;

// Nuevo_ELO = ELO_actual + K × (Resultado_real − Resultado_esperado)
function calcularElo(eloJugador, eloRival, resultado, k) {
  const esperado = 1 / (1 + Math.pow(10, (eloRival - eloJugador) / 400));
  return Math.round(eloJugador + k * (resultado - esperado));
}

// K-factor de un partido de torneo, según su tipo (flash/oficial) y alcance (interno/abierto)
function kTorneo(torneo) {
  if (torneo.tipo === 'flash') return K_TORNEO_FLASH;
  return torneo.alcance === 'abierto' ? K_TORNEO_OFICIAL_ABIERTO : K_TORNEO_OFICIAL_INTERNO;
}

module.exports = {
  calcularElo,
  kTorneo,
  K_CASUAL,
  K_TORNEO_FLASH,
  K_TORNEO_OFICIAL_INTERNO,
  K_TORNEO_OFICIAL_ABIERTO,
  K_AMISTOSO_PROMOVIDO,
};

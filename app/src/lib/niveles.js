import { colores } from '../theme/colores';

// Mismos 4 niveles que valida el backend (ver NIVELES_VALIDOS en backend/src/lib/niveles.js).
export const NIVELES = [
  { valor: 'principiante', etiqueta: 'Principiante', color: colores.textoSecundario, fondo: colores.gris },
  { valor: 'formativo', etiqueta: 'Formativo', color: colores.info, fondo: colores.infoFondo },
  { valor: 'precompetitivo', etiqueta: 'Precompetitivo', color: colores.acento, fondo: colores.acentoFondo },
  { valor: 'competitivo', etiqueta: 'Competitivo', color: colores.exito, fondo: colores.exitoFondo },
];

export const NIVELES_OPCIONES = NIVELES.map(({ valor, etiqueta }) => ({ valor, etiqueta }));

export function infoNivel(valor) {
  return NIVELES.find((n) => n.valor === valor) || NIVELES[0];
}

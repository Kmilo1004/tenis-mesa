import { View, StyleSheet } from 'react-native';
import { colores } from '../theme/colores';

// Barra horizontal verde/roja proporcional a victorias vs derrotas (récord general o contra un
// rival puntual). Con 0 partidos no dibuja proporción (queda toda gris).
export default function BarraProporcion({ victorias, derrotas, alto = 7 }) {
  const total = victorias + derrotas;
  const porcentajeVictorias = total > 0 ? (victorias / total) * 100 : 0;

  return (
    <View style={[estilos.contenedor, { height: alto }]}>
      {total > 0 && (
        <>
          <View style={[estilos.segmento, { width: `${porcentajeVictorias}%`, backgroundColor: colores.exito }]} />
          <View style={[estilos.segmento, { width: `${100 - porcentajeVictorias}%`, backgroundColor: colores.error }]} />
        </>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flexDirection: 'row', borderRadius: 4, overflow: 'hidden', backgroundColor: colores.gris },
  segmento: { height: '100%' },
});

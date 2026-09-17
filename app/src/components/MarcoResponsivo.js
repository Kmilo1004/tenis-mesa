import { Platform, View, StyleSheet, useWindowDimensions } from 'react-native';
import { colores } from '../theme/colores';

// La app está pensada para pantalla de celular. En la versión web, si se abre en un navegador
// ancho (una laptop o PC), en vez de estirar todo borde a borde (números separadísimos, la barra
// de pestañas gigante, filas kilométricas) se centra el mismo ancho de celular dentro de un marco,
// como si fuera la app corriendo en un teléfono sobre el escritorio.
const ANCHO_MAXIMO = 460;
const ALTO_MAXIMO = 860;
const MARGEN_VERTICAL = 32;

export default function MarcoResponsivo({ children }) {
  const { width, height } = useWindowDimensions();

  if (Platform.OS !== 'web' || width <= ANCHO_MAXIMO) {
    return children;
  }

  const altoMarco = Math.min(height - MARGEN_VERTICAL * 2, ALTO_MAXIMO);

  return (
    <View style={estilos.fondoEscritorio}>
      <View style={[estilos.marco, { height: altoMarco }]}>{children}</View>
    </View>
  );
}

const estilos = StyleSheet.create({
  fondoEscritorio: {
    flex: 1,
    minHeight: '100vh',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.navy,
  },
  marco: {
    width: ANCHO_MAXIMO,
    maxWidth: '100%',
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colores.fondo,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 16 },
  },
});

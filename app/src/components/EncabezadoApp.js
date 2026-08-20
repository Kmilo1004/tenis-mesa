import { View, Text, Image, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores, radios } from '../theme/colores';

// Encabezado azul marino con la marca "TM UNIMAG", usado en cada pestaña principal. Lo que se
// le pase como children queda dentro de la zona azul (ej. la tarjeta de rating, o el buscador).
export default function EncabezadoApp({ children, accionDerecha }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[estilos.contenedor, { paddingTop: insets.top + 12 }]}>
      <View style={estilos.filaMarca}>
        <View style={estilos.filaLogo}>
          <Image source={require('../../assets/Logo.jpeg')} style={estilos.logo} />
          <Text style={estilos.marca}>TM UNIMAG</Text>
        </View>
        {accionDerecha}
      </View>
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    backgroundColor: colores.navy,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: radios.encabezado,
    borderBottomRightRadius: radios.encabezado,
  },
  filaMarca: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  filaLogo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: { width: 34, height: 34, borderRadius: 17 },
  marca: { color: colores.textoClaro, fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
});

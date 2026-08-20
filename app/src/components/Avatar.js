import { View, Text, StyleSheet } from 'react-native';
import { colores } from '../theme/colores';

export default function Avatar({ nombre, tamano = 44 }) {
  const inicial = nombre?.trim()?.[0]?.toUpperCase() || '?';

  return (
    <View style={[estilos.circulo, { width: tamano, height: tamano, borderRadius: tamano / 2 }]}>
      <Text style={[estilos.texto, { fontSize: tamano * 0.42 }]}>{inicial}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  circulo: { backgroundColor: colores.navyClaro, alignItems: 'center', justifyContent: 'center' },
  texto: { color: colores.textoClaro, fontWeight: '700' },
});

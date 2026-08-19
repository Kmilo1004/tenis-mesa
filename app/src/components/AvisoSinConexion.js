import { View, Text, StyleSheet } from 'react-native';

export default function AvisoSinConexion() {
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.texto}>Sin conexión — mostrando la última información disponible</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { backgroundColor: '#fef3c7', padding: 8, borderRadius: 8, marginBottom: 12, width: '100%' },
  texto: { color: '#92400e', fontSize: 12, textAlign: 'center' },
});

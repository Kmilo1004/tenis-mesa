import { View, Text, StyleSheet } from 'react-native';
import { infoNivel } from '../lib/niveles';
import { radios } from '../theme/colores';

export default function EtiquetaNivel({ nivel, tamano = 'normal' }) {
  const info = infoNivel(nivel);
  const chico = tamano === 'chico';

  return (
    <View style={[estilos.contenedor, { backgroundColor: info.fondo }, chico && estilos.contenedorChico]}>
      <Text style={[estilos.texto, { color: info.color }, chico && estilos.textoChico]}>{info.etiqueta}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radios.pildora, alignSelf: 'flex-start' },
  contenedorChico: { paddingHorizontal: 7, paddingVertical: 2 },
  texto: { fontSize: 11, fontWeight: '700' },
  textoChico: { fontSize: 9.5 },
});

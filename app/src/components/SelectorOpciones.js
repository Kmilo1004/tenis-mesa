import { View, Text, Pressable, StyleSheet } from 'react-native';

export default function SelectorOpciones({ etiqueta, opciones, valor, onCambiar }) {
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <View style={estilos.fila}>
        {opciones.map((op) => (
          <Pressable
            key={op.valor}
            style={[estilos.opcion, valor === op.valor && estilos.opcionActiva]}
            onPress={() => onCambiar(op.valor)}
          >
            <Text style={valor === op.valor ? estilos.opcionTextoActivo : estilos.opcionTexto}>{op.etiqueta}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { width: '100%', marginBottom: 14 },
  etiqueta: { fontSize: 13, color: '#444', marginBottom: 6, fontWeight: '600' },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  opcion: { borderWidth: 1, borderColor: '#ccc', borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  opcionActiva: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  opcionTexto: { color: '#333' },
  opcionTextoActivo: { color: '#fff', fontWeight: '600' },
});

import { View, Text, TextInput, StyleSheet } from 'react-native';

export default function CampoTexto({ etiqueta, ...propsTextInput }) {
  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput style={estilos.input} placeholderTextColor="#999" {...propsTextInput} />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { width: '100%', marginBottom: 12 },
  etiqueta: { fontSize: 13, color: '#444', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
});

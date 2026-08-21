import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colores } from '../theme/colores';

export default function CampoTexto({ etiqueta, secureTextEntry, ...propsTextInput }) {
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const esPassword = Boolean(secureTextEntry);

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <View style={estilos.filaInput}>
        <TextInput
          style={[estilos.input, esPassword && estilos.inputConIcono]}
          placeholderTextColor="#999"
          secureTextEntry={esPassword && !mostrarPassword}
          {...propsTextInput}
        />
        {esPassword && (
          <Pressable
            style={estilos.botonOjo}
            onPress={() => setMostrarPassword((v) => !v)}
            hitSlop={10}
          >
            <Ionicons name={mostrarPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colores.textoSecundario} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { width: '100%', marginBottom: 12 },
  etiqueta: { fontSize: 13, color: '#444', marginBottom: 4 },
  filaInput: { justifyContent: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  inputConIcono: { paddingRight: 44 },
  botonOjo: { position: 'absolute', right: 12, padding: 2 },
});

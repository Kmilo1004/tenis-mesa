import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { normalizarHora } from '../lib/fechas';

export default function CampoFecha({ etiqueta, valor, onCambiar, minimo, modo = 'inicio' }) {
  const [mostrar, setMostrar] = useState(false);

  function manejarCambio(evento, fechaSeleccionada) {
    if (Platform.OS === 'android') {
      setMostrar(false);
    }
    if (fechaSeleccionada) {
      onCambiar(normalizarHora(fechaSeleccionada, modo));
    }
  }

  function manejarCierre() {
    setMostrar(false);
  }

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <Pressable style={estilos.boton} onPress={() => setMostrar(true)}>
        <Text style={estilos.botonTexto}>
          {valor ? valor.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Seleccionar fecha'}
        </Text>
      </Pressable>

      {mostrar && (
        <DateTimePicker
          value={valor || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
          minimumDate={minimo}
          onValueChange={manejarCambio}
          onDismiss={manejarCierre}
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { width: '100%', marginBottom: 12 },
  etiqueta: { fontSize: 13, color: '#444', marginBottom: 4 },
  boton: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12 },
  botonTexto: { fontSize: 15, color: '#111', textTransform: 'capitalize' },
});

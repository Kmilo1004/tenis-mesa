import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';

const SETS_MINIMOS = 3;
const SETS_MAXIMOS = 7;

export default function EditorSets({ sets, onCambiar, etiquetaA = 'Tú', etiquetaB = 'Rival' }) {
  function actualizarSet(indice, campo, valor) {
    onCambiar(sets.map((s, i) => (i === indice ? { ...s, [campo]: valor } : s)));
  }

  function agregarSet() {
    if (sets.length < SETS_MAXIMOS) {
      onCambiar([...sets, { puntosJugadorA: '', puntosJugadorB: '' }]);
    }
  }

  function quitarSet() {
    if (sets.length > SETS_MINIMOS) {
      onCambiar(sets.slice(0, -1));
    }
  }

  return (
    <View style={{ width: '100%' }}>
      <View style={estilos.encabezado}>
        <View style={estilos.numeroSet} />
        <Text style={estilos.encabezadoTexto} numberOfLines={1} ellipsizeMode="tail">
          {etiquetaA}
        </Text>
        <View style={estilos.guion} />
        <Text style={estilos.encabezadoTexto} numberOfLines={1} ellipsizeMode="tail">
          {etiquetaB}
        </Text>
      </View>

      {sets.map((s, i) => (
        <View key={i} style={estilos.fila}>
          <Text style={estilos.numeroSet}>Set {i + 1}</Text>
          <TextInput
            style={estilos.input}
            keyboardType="number-pad"
            maxLength={2}
            value={s.puntosJugadorA}
            onChangeText={(v) => actualizarSet(i, 'puntosJugadorA', v.replace(/[^0-9]/g, ''))}
          />
          <Text style={estilos.guion}>-</Text>
          <TextInput
            style={estilos.input}
            keyboardType="number-pad"
            maxLength={2}
            value={s.puntosJugadorB}
            onChangeText={(v) => actualizarSet(i, 'puntosJugadorB', v.replace(/[^0-9]/g, ''))}
          />
        </View>
      ))}

      <View style={estilos.filaBotones}>
        <Pressable onPress={quitarSet} disabled={sets.length <= SETS_MINIMOS} style={estilos.botonSecundario}>
          <Text style={estilos.botonSecundarioTexto}>Quitar set</Text>
        </Pressable>
        <Pressable onPress={agregarSet} disabled={sets.length >= SETS_MAXIMOS} style={estilos.botonSecundario}>
          <Text style={estilos.botonSecundarioTexto}>Agregar set</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function setsIniciales() {
  return Array.from({ length: SETS_MINIMOS }, () => ({ puntosJugadorA: '', puntosJugadorB: '' }));
}

export function setsCompletos(sets) {
  return sets.every((s) => s.puntosJugadorA !== '' && s.puntosJugadorB !== '');
}

const estilos = StyleSheet.create({
  encabezado: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  encabezadoTexto: { flex: 1, fontSize: 12, color: '#666', fontWeight: '600', textAlign: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  numeroSet: { width: 56, fontSize: 13, color: '#555' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: 15,
  },
  guion: { width: 24, textAlign: 'center', color: '#666' },
  filaBotones: { flexDirection: 'row', gap: 12, marginTop: 4, marginBottom: 8 },
  botonSecundario: { paddingVertical: 8, paddingHorizontal: 12 },
  botonSecundarioTexto: { color: '#1d4ed8', fontWeight: '600', fontSize: 13 },
});

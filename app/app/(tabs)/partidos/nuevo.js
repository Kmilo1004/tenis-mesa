import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { apiFetch } from '../../../src/api/client';
import { useAuth } from '../../../src/auth/AuthContext';
import EditorSets, { setsIniciales, setsCompletos } from '../../../src/components/EditorSets';

export default function NuevoPartido() {
  const { token } = useAuth();

  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [rival, setRival] = useState(null);
  const [sets, setSets] = useState(setsIniciales());

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (rival || busqueda.trim().length < 2) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    const temporizador = setTimeout(async () => {
      try {
        const datos = await apiFetch(`/usuarios/buscar?q=${encodeURIComponent(busqueda.trim())}`, { token });
        setResultados(datos);
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 350);
    return () => clearTimeout(temporizador);
  }, [busqueda, rival, token]);

  const listo = rival && setsCompletos(sets);

  async function enviar() {
    setError(null);
    setEnviando(true);
    try {
      await apiFetch('/partidos', {
        method: 'POST',
        token,
        body: JSON.stringify({
          jugadorBId: rival.id,
          fechaPartido: new Date().toISOString(),
          sets: sets.map((s) => ({ puntosJugadorA: Number(s.puntosJugadorA), puntosJugadorB: Number(s.puntosJugadorB) })),
        }),
      });
      router.back();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={estilos.contenedor}>
        <Text style={estilos.etiqueta}>Rival</Text>
        {rival ? (
          <View style={estilos.rivalSeleccionado}>
            <Text style={estilos.rivalNombre}>{rival.nombre}</Text>
            <Pressable onPress={() => setRival(null)}>
              <Text style={estilos.quitarRival}>Cambiar</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <TextInput
              style={estilos.input}
              placeholder="Busca por nombre..."
              value={busqueda}
              onChangeText={setBusqueda}
            />
            {buscando && <ActivityIndicator style={{ marginTop: 8 }} />}
            {resultados.map((u) => (
              <Pressable key={u.id} style={estilos.resultado} onPress={() => setRival(u)}>
                <Text>{u.nombre}</Text>
              </Pressable>
            ))}
          </>
        )}

        <Text style={[estilos.etiqueta, { marginTop: 24 }]}>Marcador por set (al mejor de 5 o 7)</Text>
        <EditorSets sets={sets} onCambiar={setSets} etiquetaB={rival?.nombre || 'Rival'} />

        {error && <Text style={estilos.error}>{error}</Text>}

        <Pressable style={estilos.boton} onPress={enviar} disabled={!listo || enviando}>
          {enviando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.botonTexto}>Registrar partido</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: 20, paddingBottom: 48 },
  etiqueta: { fontSize: 13, color: '#444', marginBottom: 8, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  resultado: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: '#f3f4f6', borderRadius: 8, marginTop: 6 },
  rivalSeleccionado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 12,
    borderRadius: 8,
  },
  rivalNombre: { fontWeight: '600' },
  quitarRival: { color: '#0B1E4D', fontSize: 12, fontWeight: '600' },
  error: { color: '#dc2626', marginTop: 8, textAlign: 'center' },
  boton: { backgroundColor: '#0B1E4D', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  botonTexto: { color: '#fff', fontWeight: '700' },
});

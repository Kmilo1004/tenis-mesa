import { useState } from 'react';
import { Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, View } from 'react-native';
import { router } from 'expo-router';
import { apiFetch } from '../../../src/api/client';
import { useAuth } from '../../../src/auth/AuthContext';
import EditorSets, { setsIniciales, setsCompletos } from '../../../src/components/EditorSets';
import SelectorJugador from '../../../src/components/SelectorJugador';
import SelectorOpciones from '../../../src/components/SelectorOpciones';
import { colores, radios } from '../../../src/theme/colores';

const MODOS = [
  { valor: 'propio', etiqueta: 'Yo vs. rival' },
  { valor: 'ajeno', etiqueta: 'Entre dos jugadores' },
];

export default function NuevoPartido() {
  const { usuario, token } = useAuth();
  const puedeRegistrarAjeno = usuario?.roles?.some((r) => r.rol === 'administrador' || r.rol === 'arbitro');

  const [modo, setModo] = useState('propio');
  const [jugadorA, setJugadorA] = useState(null);
  const [jugadorB, setJugadorB] = useState(null);
  const [sets, setSets] = useState(setsIniciales());

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const esAjeno = modo === 'ajeno' && puedeRegistrarAjeno;
  const listo = (esAjeno ? Boolean(jugadorA) : true) && Boolean(jugadorB) && setsCompletos(sets);

  function cambiarModo(nuevoModo) {
    setModo(nuevoModo);
    setJugadorA(null);
    setJugadorB(null);
  }

  async function enviar() {
    setError(null);
    setEnviando(true);
    try {
      await apiFetch('/partidos', {
        method: 'POST',
        token,
        body: JSON.stringify({
          ...(esAjeno ? { jugadorAId: jugadorA.id } : {}),
          jugadorBId: jugadorB.id,
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
        {puedeRegistrarAjeno && (
          <View style={estilos.tarjeta}>
            <SelectorOpciones etiqueta="¿Quién juega?" opciones={MODOS} valor={modo} onCambiar={cambiarModo} />
          </View>
        )}

        <View style={estilos.tarjeta}>
          {esAjeno && (
            <>
              <SelectorJugador
                etiqueta="Jugador A"
                valor={jugadorA}
                onSeleccionar={setJugadorA}
                excluirId={jugadorB?.id}
                token={token}
              />
              <View style={estilos.separadorVs}>
                <Text style={estilos.textoVs}>VS</Text>
              </View>
            </>
          )}
          <SelectorJugador
            etiqueta={esAjeno ? 'Jugador B' : 'Rival'}
            valor={jugadorB}
            onSeleccionar={setJugadorB}
            excluirId={esAjeno ? jugadorA?.id : usuario?.id}
            token={token}
          />
        </View>

        <View style={estilos.tarjeta}>
          <Text style={estilos.etiqueta}>Marcador por set (al mejor de 5 o 7)</Text>
          <EditorSets
            sets={sets}
            onCambiar={setSets}
            etiquetaA={esAjeno ? jugadorA?.nombre || 'Jugador A' : 'Tú'}
            etiquetaB={jugadorB?.nombre || (esAjeno ? 'Jugador B' : 'Rival')}
          />
        </View>

        {error && <Text style={estilos.error}>{error}</Text>}

        <Pressable style={estilos.boton} onPress={enviar} disabled={!listo || enviando}>
          {enviando ? <ActivityIndicator color={colores.textoClaro} /> : <Text style={estilos.botonTexto}>Registrar partido</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: 16, paddingBottom: 48, backgroundColor: colores.fondo, flexGrow: 1 },
  tarjeta: {
    backgroundColor: colores.tarjeta,
    borderRadius: radios.tarjeta,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  etiqueta: { fontSize: 13, color: colores.textoSecundario, marginBottom: 10, fontWeight: '600' },
  separadorVs: { alignItems: 'center', marginVertical: 12 },
  textoVs: { fontSize: 12, fontWeight: '800', color: colores.textoSecundario, letterSpacing: 1 },
  error: { color: colores.error, marginTop: 4, marginBottom: 8, textAlign: 'center' },
  boton: { backgroundColor: colores.navy, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  botonTexto: { color: colores.textoClaro, fontWeight: '700' },
});

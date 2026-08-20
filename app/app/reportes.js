import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { apiFetch } from '../src/api/client';
import { useAuth } from '../src/auth/AuthContext';
import { descargarYCompartir } from '../src/lib/exportar';
import SelectorOpciones from '../src/components/SelectorOpciones';

const TIPOS_RANKING = [
  { valor: 'oficial', etiqueta: 'Oficial' },
  { valor: 'no_oficial', etiqueta: 'No Oficial' },
];
const FORMATOS = [
  { valor: 'csv', etiqueta: 'CSV' },
  { valor: 'pdf', etiqueta: 'PDF' },
];

export default function Reportes() {
  const { token } = useAuth();
  const [estadisticas, setEstadisticas] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [exportando, setExportando] = useState(false);

  const [tipoRanking, setTipoRanking] = useState('oficial');
  const [formato, setFormato] = useState('csv');

  useEffect(() => {
    apiFetch('/reportes/estadisticas', { token })
      .then(setEstadisticas)
      .catch((err) => setError(err.message))
      .finally(() => setCargando(false));
  }, [token]);

  async function exportarRanking() {
    setError(null);
    setExportando(true);
    try {
      await descargarYCompartir(`/reportes/ranking?tipo=${tipoRanking}&formato=${formato}`, `ranking-${tipoRanking}.${formato}`, token);
    } catch (err) {
      setError(err.message);
    } finally {
      setExportando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenedor}>
      <Stack.Screen options={{ title: 'Reportes' }} />

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        estadisticas && (
          <>
            <Text style={estilos.subtitulo}>Estadísticas del club</Text>
            <View style={estilos.tarjeta}>
              <Text style={estilos.tarjetaValor}>{estadisticas.partidosConfirmados}</Text>
              <Text style={estilos.tarjetaEtiqueta}>Partidos confirmados</Text>
            </View>

            <Text style={[estilos.subtitulo, { marginTop: 20 }]}>Torneos por estado</Text>
            {Object.entries(estadisticas.torneosPorEstado).map(([estado, cantidad]) => (
              <View key={estado} style={estilos.filaTexto}>
                <Text style={estilos.filaEtiqueta}>{estado.replace(/_/g, ' ')}</Text>
                <Text style={estilos.filaValor}>{cantidad}</Text>
              </View>
            ))}

            <Text style={[estilos.subtitulo, { marginTop: 20 }]}>Jugadores más activos</Text>
            {estadisticas.jugadoresMasActivos.map((j) => (
              <View key={j.id} style={estilos.filaTexto}>
                <Text style={estilos.filaEtiqueta}>{j.nombre}</Text>
                <Text style={estilos.filaValor}>{j.partidosJugados}</Text>
              </View>
            ))}
          </>
        )
      )}

      <Text style={[estilos.subtitulo, { marginTop: 28 }]}>Exportar ranking</Text>
      <SelectorOpciones etiqueta="Ranking" opciones={TIPOS_RANKING} valor={tipoRanking} onCambiar={setTipoRanking} />
      <SelectorOpciones etiqueta="Formato" opciones={FORMATOS} valor={formato} onCambiar={setFormato} />

      {error && <Text style={estilos.error}>{error}</Text>}

      <Pressable style={estilos.boton} onPress={exportarRanking} disabled={exportando}>
        {exportando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.botonTexto}>Exportar</Text>}
      </Pressable>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: 20, paddingBottom: 48 },
  subtitulo: { fontWeight: '700', marginBottom: 10 },
  tarjeta: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 16, alignItems: 'center' },
  tarjetaValor: { fontSize: 32, fontWeight: '800', color: '#0B1E4D' },
  tarjetaEtiqueta: { fontSize: 12, color: '#555', marginTop: 4 },
  filaTexto: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  filaEtiqueta: { fontSize: 13, color: '#333', textTransform: 'capitalize' },
  filaValor: { fontSize: 13, fontWeight: '700', color: '#0B1E4D' },
  error: { color: '#dc2626', marginTop: 8, textAlign: 'center' },
  boton: { backgroundColor: '#0B1E4D', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  botonTexto: { color: '#fff', fontWeight: '700' },
});

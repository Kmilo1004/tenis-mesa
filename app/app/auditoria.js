import { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { apiFetch } from '../src/api/client';
import { useAuth } from '../src/auth/AuthContext';

export default function Auditoria() {
  const { token } = useAuth();
  const [registros, setRegistros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await apiFetch('/auditoria', { token });
      setRegistros(datos.registros);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  return (
    <View style={estilos.contenedor}>
      <Stack.Screen options={{ title: 'Auditoría' }} />
      {cargando ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : error ? (
        <Text style={estilos.error}>{error}</Text>
      ) : (
        <FlatList
          data={registros}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          onRefresh={cargar}
          refreshing={false}
          ListEmptyComponent={<Text style={estilos.vacio}>Todavía no hay registros de auditoría</Text>}
          renderItem={({ item }) => (
            <View style={estilos.fila}>
              <Text style={estilos.accion}>{item.accion.replace(/_/g, ' ')}</Text>
              <Text style={estilos.detalle}>
                {item.usuario.nombre} · {item.entidadTipo} · {new Date(item.fecha).toLocaleString('es-CO')}
              </Text>
              {item.detalle && <Text style={estilos.json}>{JSON.stringify(item.detalle)}</Text>}
            </View>
          )}
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#fff' },
  error: { color: '#dc2626', textAlign: 'center', marginTop: 24 },
  vacio: { textAlign: 'center', color: '#888', marginTop: 24 },
  fila: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  accion: { fontWeight: '700', textTransform: 'capitalize' },
  detalle: { fontSize: 12, color: '#666', marginTop: 2 },
  json: { fontSize: 11, color: '#999', marginTop: 4, fontFamily: 'monospace' },
});

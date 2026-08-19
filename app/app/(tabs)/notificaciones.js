import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { apiFetch } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';

const TIPOS_CON_PARTIDO = ['confirmacion_pendiente', 'partido_proximo'];

export default function Notificaciones() {
  const { token } = useAuth();
  const [notificaciones, setNotificaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await apiFetch('/notificaciones', { token });
      setNotificaciones(datos.notificaciones);
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

  async function abrir(item) {
    if (!item.leida) {
      apiFetch(`/notificaciones/${item.id}/leida`, { method: 'PATCH', token })
        .then(() => {
          setNotificaciones((actuales) => actuales.map((n) => (n.id === item.id ? { ...n, leida: true } : n)));
        })
        .catch(() => {
          // no es crítico: si falla, se reintentará marcarla la próxima vez que se abra
        });
    }
    if (TIPOS_CON_PARTIDO.includes(item.tipo) && item.referenciaId) {
      router.push(`/partidos/${item.referenciaId}`);
    }
  }

  return (
    <View style={estilos.contenedor}>
      {cargando ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : error ? (
        <Text style={estilos.error}>{error}</Text>
      ) : (
        <FlatList
          data={notificaciones}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          onRefresh={cargar}
          refreshing={false}
          ListEmptyComponent={<Text style={estilos.vacio}>No tienes notificaciones</Text>}
          renderItem={({ item }) => (
            <Pressable style={[estilos.fila, !item.leida && estilos.filaNoLeida]} onPress={() => abrir(item)}>
              {!item.leida && <View style={estilos.punto} />}
              <View style={{ flex: 1 }}>
                <Text style={[estilos.mensaje, !item.leida && estilos.mensajeNoLeido]}>{item.mensaje}</Text>
                <Text style={estilos.fecha}>{new Date(item.fecha).toLocaleString('es-CO')}</Text>
              </View>
            </Pressable>
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
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    marginBottom: 8,
  },
  filaNoLeida: { backgroundColor: '#eff6ff' },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1d4ed8', marginTop: 6 },
  mensaje: { fontSize: 14, color: '#333' },
  mensajeNoLeido: { fontWeight: '700', color: '#111' },
  fecha: { fontSize: 11, color: '#888', marginTop: 4 },
});

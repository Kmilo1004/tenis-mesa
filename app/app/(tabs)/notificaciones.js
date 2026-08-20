import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiFetch } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';
import EncabezadoApp from '../../src/components/EncabezadoApp';
import { colores, radios } from '../../src/theme/colores';

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
      <EncabezadoApp />

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colores.navy} />
      ) : error ? (
        <Text style={estilos.error}>{error}</Text>
      ) : (
        <FlatList
          data={notificaciones}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 8, flexGrow: 1 }}
          onRefresh={cargar}
          refreshing={false}
          ListEmptyComponent={
            <View style={estilos.vacioContenedor}>
              <Ionicons name="notifications-off-outline" size={40} color={colores.borde} />
              <Text style={estilos.vacio}>No tienes notificaciones</Text>
            </View>
          }
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
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  error: { color: colores.error, textAlign: 'center', marginTop: 24 },
  vacioContenedor: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 12 },
  vacio: { textAlign: 'center', color: colores.textoSecundario },
  fila: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 14,
    borderRadius: radios.tarjeta,
    backgroundColor: colores.tarjeta,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  filaNoLeida: { backgroundColor: '#EEF2FF' },
  punto: { width: 8, height: 8, borderRadius: 4, backgroundColor: colores.navy, marginTop: 6 },
  mensaje: { fontSize: 14, color: colores.texto },
  mensajeNoLeido: { fontWeight: '700', color: colores.texto },
  fecha: { fontSize: 11, color: colores.textoSecundario, marginTop: 4 },
});

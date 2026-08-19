import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import { apiFetch } from '../../../src/api/client';
import { useAuth } from '../../../src/auth/AuthContext';

const ETIQUETAS_ESTADO = {
  pendiente: { texto: 'Pendiente de confirmar', color: '#b45309', fondo: '#fef3c7' },
  confirmado: { texto: 'Confirmado', color: '#15803d', fondo: '#dcfce7' },
  descartado: { texto: 'Descartado', color: '#6b7280', fondo: '#f3f4f6' },
  en_revision: { texto: 'En disputa', color: '#7e22ce', fondo: '#f3e8ff' },
  anulado: { texto: 'Anulado', color: '#b91c1c', fondo: '#fee2e2' },
  por_definir: { texto: 'Por definir', color: '#6b7280', fondo: '#f3f4f6' },
};

export default function ListaPartidos() {
  const { usuario, token } = useAuth();
  const [partidos, setPartidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await apiFetch(`/partidos?usuario_id=${usuario.id}`, { token });
      setPartidos(datos);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [usuario.id, token]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  return (
    <View style={estilos.contenedor}>
      {cargando ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : error ? (
        <Text style={estilos.error}>{error}</Text>
      ) : (
        <FlatList
          data={partidos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
          onRefresh={cargar}
          refreshing={false}
          ListEmptyComponent={<Text style={estilos.vacio}>Todavía no has jugado ningún partido</Text>}
          renderItem={({ item }) => {
            const soyJugadorA = item.jugadorA?.id === usuario.id;
            const rival = soyJugadorA ? item.jugadorB : item.jugadorA;
            const etiqueta = ETIQUETAS_ESTADO[item.estado] || ETIQUETAS_ESTADO.por_definir;

            return (
              <Pressable style={estilos.tarjeta} onPress={() => router.push(`/partidos/${item.id}`)}>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.rival}>vs {rival?.nombre || 'Por definir'}</Text>
                  <Text style={estilos.fecha}>{new Date(item.fechaPartido).toLocaleDateString('es-CO')}</Text>
                  {item.torneoId && <Text style={estilos.torneoTag}>{item.ronda || 'Torneo'}</Text>}
                </View>
                <View style={[estilos.badge, { backgroundColor: etiqueta.fondo }]}>
                  <Text style={[estilos.badgeTexto, { color: etiqueta.color }]}>{etiqueta.texto}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <Link href="/partidos/nuevo" asChild>
        <Pressable style={estilos.fab}>
          <Text style={estilos.fabTexto}>+ Registrar partido</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#fff' },
  error: { color: '#dc2626', textAlign: 'center', marginTop: 24 },
  vacio: { textAlign: 'center', color: '#888', marginTop: 24 },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#f9fafb',
    marginBottom: 10,
  },
  rival: { fontSize: 16, fontWeight: '600' },
  fecha: { fontSize: 12, color: '#666', marginTop: 2 },
  torneoTag: { fontSize: 11, color: '#1d4ed8', marginTop: 4, fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeTexto: { fontSize: 11, fontWeight: '700' },
  fab: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#1d4ed8',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    elevation: 3,
  },
  fabTexto: { color: '#fff', fontWeight: '700' },
});

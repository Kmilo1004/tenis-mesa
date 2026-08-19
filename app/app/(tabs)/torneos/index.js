import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import { apiFetch } from '../../../src/api/client';
import { useAuth } from '../../../src/auth/AuthContext';
import { guardarCache, leerCache } from '../../../src/lib/cache';
import AvisoSinConexion from '../../../src/components/AvisoSinConexion';

const ETIQUETAS_ESTADO = {
  inscripciones_abiertas: { texto: 'Inscripciones abiertas', color: '#15803d', fondo: '#dcfce7' },
  inscripciones_cerradas: { texto: 'Inscripciones cerradas', color: '#b45309', fondo: '#fef3c7' },
  en_curso: { texto: 'En curso', color: '#1d4ed8', fondo: '#dbeafe' },
  finalizado: { texto: 'Finalizado', color: '#6b7280', fondo: '#f3f4f6' },
};

export default function ListaTorneos() {
  const { usuario } = useAuth();
  const esAdmin = usuario?.roles?.some((r) => r.rol === 'administrador');

  const [torneos, setTorneos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [sinConexion, setSinConexion] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const datos = await apiFetch('/torneos');
      setTorneos(datos);
      setSinConexion(false);
      guardarCache('torneos', datos);
    } catch (err) {
      const cacheado = err.esErrorDeRed ? await leerCache('torneos') : null;
      if (cacheado) {
        setTorneos(cacheado);
        setSinConexion(true);
      } else {
        setError(err.message);
      }
    } finally {
      setCargando(false);
    }
  }, []);

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
          data={torneos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: esAdmin ? 96 : 16 }}
          onRefresh={cargar}
          refreshing={false}
          ListHeaderComponent={sinConexion ? <AvisoSinConexion /> : null}
          ListEmptyComponent={<Text style={estilos.vacio}>Todavía no hay torneos creados</Text>}
          renderItem={({ item }) => {
            const etiqueta = ETIQUETAS_ESTADO[item.estado] || ETIQUETAS_ESTADO.inscripciones_abiertas;
            return (
              <Pressable style={estilos.tarjeta} onPress={() => router.push(`/torneos/${item.id}`)}>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.nombre}>{item.nombre}</Text>
                  <Text style={estilos.detalle}>
                    {item.tipo === 'oficial' ? 'Oficial' : 'Flash'} · {item.alcance === 'abierto' ? 'Abierto' : 'Interno'}
                  </Text>
                  <Text style={estilos.fecha}>{new Date(item.fechaInicio).toLocaleDateString('es-CO')}</Text>
                </View>
                <View style={[estilos.badge, { backgroundColor: etiqueta.fondo }]}>
                  <Text style={[estilos.badgeTexto, { color: etiqueta.color }]}>{etiqueta.texto}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {esAdmin && (
        <Link href="/torneos/nuevo" asChild>
          <Pressable style={estilos.fab}>
            <Text style={estilos.fabTexto}>+ Crear torneo</Text>
          </Pressable>
        </Link>
      )}
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
  nombre: { fontSize: 16, fontWeight: '600' },
  detalle: { fontSize: 12, color: '#555', marginTop: 2 },
  fecha: { fontSize: 12, color: '#888', marginTop: 2 },
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

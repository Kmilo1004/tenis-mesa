import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { apiFetch } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';
import { guardarCache, leerCache } from '../../src/lib/cache';
import AvisoSinConexion from '../../src/components/AvisoSinConexion';

export default function Ranking() {
  const { usuario } = useAuth();
  const [tipo, setTipo] = useState('no_oficial'); // oficial | no_oficial
  const [ranking, setRanking] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [sinConexion, setSinConexion] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    const claveCache = `ranking_${tipo}`;
    try {
      const ruta = tipo === 'oficial' ? '/ranking/oficial' : '/ranking/no-oficial';
      const datos = await apiFetch(ruta);
      setRanking(datos.ranking);
      setSinConexion(false);
      guardarCache(claveCache, datos.ranking);
    } catch (err) {
      const cacheado = err.esErrorDeRed ? await leerCache(claveCache) : null;
      if (cacheado) {
        setRanking(cacheado);
        setSinConexion(true);
      } else {
        setError(err.message);
      }
    } finally {
      setCargando(false);
    }
  }, [tipo]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  return (
    <View style={estilos.contenedor}>
      <View style={estilos.selector}>
        <Pressable
          style={[estilos.selectorBoton, tipo === 'no_oficial' && estilos.selectorBotonActivo]}
          onPress={() => setTipo('no_oficial')}
        >
          <Text style={[estilos.selectorTexto, tipo === 'no_oficial' && estilos.selectorTextoActivo]}>No Oficial</Text>
        </Pressable>
        <Pressable
          style={[estilos.selectorBoton, tipo === 'oficial' && estilos.selectorBotonActivo]}
          onPress={() => setTipo('oficial')}
        >
          <Text style={[estilos.selectorTexto, tipo === 'oficial' && estilos.selectorTextoActivo]}>Oficial</Text>
        </Pressable>
      </View>

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : error ? (
        <Text style={estilos.error}>{error}</Text>
      ) : (
        <FlatList
          data={ranking}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} />}
          contentContainerStyle={{ padding: 16 }}
          ListHeaderComponent={sinConexion ? <AvisoSinConexion /> : null}
          ListEmptyComponent={<Text style={estilos.vacio}>Todavía no hay jugadores en este ranking</Text>}
          renderItem={({ item }) => (
            <View style={[estilos.fila, item.id === usuario?.id && estilos.filaPropia]}>
              <Text style={estilos.posicion}>#{item.posicion}</Text>
              <Text style={estilos.nombre}>{item.nombre}</Text>
              <Text style={estilos.elo}>{tipo === 'oficial' ? item.eloOficial : item.eloNoOficial}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: '#fff' },
  selector: { flexDirection: 'row', margin: 16, backgroundColor: '#f3f4f6', borderRadius: 10, padding: 4 },
  selectorBoton: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  selectorBotonActivo: { backgroundColor: '#1d4ed8' },
  selectorTexto: { color: '#444', fontWeight: '600' },
  selectorTextoActivo: { color: '#fff' },
  error: { color: '#dc2626', textAlign: 'center', marginTop: 24 },
  vacio: { textAlign: 'center', color: '#888', marginTop: 24 },
  fila: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  filaPropia: { backgroundColor: '#eff6ff' },
  posicion: { width: 40, fontWeight: '700', color: '#555' },
  nombre: { flex: 1, fontSize: 15 },
  elo: { fontWeight: '700', color: '#1d4ed8' },
});

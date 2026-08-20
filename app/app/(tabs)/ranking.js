import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiFetch } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';
import { guardarCache, leerCache } from '../../src/lib/cache';
import AvisoSinConexion from '../../src/components/AvisoSinConexion';
import EncabezadoApp from '../../src/components/EncabezadoApp';
import Avatar from '../../src/components/Avatar';
import { colores, radios } from '../../src/theme/colores';

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
      <EncabezadoApp>
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
      </EncabezadoApp>

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colores.navy} />
      ) : error ? (
        <Text style={estilos.error}>{error}</Text>
      ) : (
        <FlatList
          data={ranking}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={false} onRefresh={cargar} />}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          ListHeaderComponent={sinConexion ? <AvisoSinConexion /> : null}
          ListEmptyComponent={<Text style={estilos.vacio}>Todavía no hay jugadores en este ranking</Text>}
          renderItem={({ item }) => (
            <View style={[estilos.fila, item.id === usuario?.id && estilos.filaPropia]}>
              <Text style={estilos.posicion}>#{item.posicion}</Text>
              <Avatar nombre={item.nombre} tamano={38} />
              <Text style={estilos.nombre}>{item.nombre}</Text>
              <Text style={estilos.elo}>{tipo === 'oficial' ? item.eloOficial : item.eloNoOficial}</Text>
              <Ionicons name="chevron-forward" size={16} color={colores.textoSecundario} />
            </View>
          )}
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  selector: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 4, marginTop: 4 },
  selectorBoton: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  selectorBotonActivo: { backgroundColor: colores.tarjeta },
  selectorTexto: { color: colores.textoClaro, fontWeight: '600' },
  selectorTextoActivo: { color: colores.navy },
  error: { color: colores.error, textAlign: 'center', marginTop: 24 },
  vacio: { textAlign: 'center', color: colores.textoSecundario, marginTop: 24 },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colores.tarjeta,
    borderRadius: radios.tarjeta,
    padding: 12,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  filaPropia: { backgroundColor: '#EEF2FF' },
  posicion: { width: 28, fontWeight: '700', color: colores.textoSecundario },
  nombre: { flex: 1, fontSize: 15, fontWeight: '600', color: colores.texto },
  elo: { fontWeight: '800', color: colores.navy, marginRight: 4 },
});

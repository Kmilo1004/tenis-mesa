import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiFetch } from '../../../src/api/client';
import { useAuth } from '../../../src/auth/AuthContext';
import { guardarCache, leerCache } from '../../../src/lib/cache';
import AvisoSinConexion from '../../../src/components/AvisoSinConexion';
import EncabezadoApp from '../../../src/components/EncabezadoApp';
import { colores, radios } from '../../../src/theme/colores';

const ETIQUETAS_ESTADO = {
  inscripciones_abiertas: { texto: 'Inscripciones abiertas', color: colores.exito, fondo: colores.exitoFondo },
  inscripciones_cerradas: { texto: 'Inscripciones cerradas', color: colores.advertencia, fondo: colores.advertenciaFondo },
  en_curso: { texto: 'En curso', color: colores.acento, fondo: '#DBEAFE' },
  finalizado: { texto: 'Finalizado', color: colores.textoSecundario, fondo: colores.gris },
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
      <EncabezadoApp />

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colores.navy} />
      ) : error ? (
        <Text style={estilos.error}>{error}</Text>
      ) : (
        <FlatList
          data={torneos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: esAdmin ? 96 : 16 }}
          onRefresh={cargar}
          refreshing={false}
          ListHeaderComponent={sinConexion ? <AvisoSinConexion /> : null}
          ListEmptyComponent={<Text style={estilos.vacio}>Todavía no hay torneos creados</Text>}
          renderItem={({ item }) => {
            const etiqueta = ETIQUETAS_ESTADO[item.estado] || ETIQUETAS_ESTADO.inscripciones_abiertas;
            return (
              <Pressable style={estilos.tarjeta} onPress={() => router.push(`/torneos/${item.id}`)}>
                <View style={estilos.filaBadges}>
                  <View style={estilos.badgeTipo}>
                    <Text style={estilos.badgeTipoTexto}>{item.tipo === 'oficial' ? 'Oficial' : 'Flash'}</Text>
                  </View>
                  <View style={[estilos.badge, { backgroundColor: etiqueta.fondo }]}>
                    <Text style={[estilos.badgeTexto, { color: etiqueta.color }]}>{etiqueta.texto}</Text>
                  </View>
                </View>

                <Text style={estilos.nombre}>{item.nombre}</Text>

                <View style={estilos.filaIcono}>
                  <Ionicons name="globe-outline" size={13} color={colores.textoSecundario} />
                  <Text style={estilos.detalleTexto}>{item.alcance === 'abierto' ? 'Abierto' : 'Interno'}</Text>
                </View>
                <View style={estilos.filaIcono}>
                  <Ionicons name="calendar-outline" size={13} color={colores.textoSecundario} />
                  <Text style={estilos.detalleTexto}>{new Date(item.fechaInicio).toLocaleDateString('es-CO')}</Text>
                </View>

                <View style={estilos.cajaFormato}>
                  <Text style={estilos.cajaEtiqueta}>FORMATO</Text>
                  <Text style={estilos.cajaValor}>{item.formato.replace(/_/g, ' ')}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {esAdmin && (
        <Link href="/torneos/nuevo" asChild>
          <Pressable style={estilos.fab}>
            <Ionicons name="add" size={18} color={colores.textoClaro} />
            <Text style={estilos.fabTexto}>Crear torneo</Text>
          </Pressable>
        </Link>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  error: { color: colores.error, textAlign: 'center', marginTop: 24 },
  vacio: { textAlign: 'center', color: colores.textoSecundario, marginTop: 24 },
  tarjeta: {
    padding: 16,
    borderRadius: radios.tarjeta,
    backgroundColor: colores.tarjeta,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  filaBadges: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  badgeTipo: { backgroundColor: colores.gris, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radios.pildora },
  badgeTipoTexto: { fontSize: 11, fontWeight: '700', color: colores.textoSecundario },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radios.pildora },
  badgeTexto: { fontSize: 11, fontWeight: '700' },
  nombre: { fontSize: 17, fontWeight: '800', color: colores.navy, marginBottom: 8 },
  filaIcono: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  detalleTexto: { fontSize: 12, color: colores.textoSecundario, textTransform: 'capitalize' },
  cajaFormato: { backgroundColor: colores.fondo, borderRadius: 10, padding: 10, marginTop: 8 },
  cajaEtiqueta: { fontSize: 10, fontWeight: '700', color: colores.textoSecundario, letterSpacing: 0.5 },
  cajaValor: { fontSize: 13, color: colores.texto, fontWeight: '600', marginTop: 2, textTransform: 'capitalize' },
  fab: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colores.navy,
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: radios.pildora,
    elevation: 3,
  },
  fabTexto: { color: colores.textoClaro, fontWeight: '700' },
});

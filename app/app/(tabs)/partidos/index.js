import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Link, router, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiFetch } from '../../../src/api/client';
import { useAuth } from '../../../src/auth/AuthContext';
import EncabezadoApp from '../../../src/components/EncabezadoApp';
import SelectorOpciones from '../../../src/components/SelectorOpciones';
import { colores, radios } from '../../../src/theme/colores';

const OPCIONES_ORDEN = [
  { valor: 'fecha', etiqueta: 'Fecha' },
  { valor: 'ganados', etiqueta: 'Ganados' },
  { valor: 'perdidos', etiqueta: 'Perdidos' },
  { valor: 'jugador', etiqueta: 'Jugador' },
];

const ETIQUETAS_ESTADO = {
  pendiente: { texto: 'Pendiente de confirmar', color: colores.advertencia, fondo: colores.advertenciaFondo },
  pendiente_aprobacion: { texto: 'Pendiente de aprobación', color: colores.advertencia, fondo: colores.advertenciaFondo },
  confirmado: { texto: 'Confirmado', color: colores.exito, fondo: colores.exitoFondo },
  descartado: { texto: 'Descartado', color: colores.textoSecundario, fondo: colores.gris },
  en_revision: { texto: 'En disputa', color: colores.info, fondo: colores.infoFondo },
  anulado: { texto: 'Anulado', color: colores.error, fondo: colores.errorFondo },
  por_definir: { texto: 'Por definir', color: colores.textoSecundario, fondo: colores.gris },
};

export default function ListaPartidos() {
  const { usuario, token } = useAuth();
  const [partidos, setPartidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [criterioOrden, setCriterioOrden] = useState('fecha');

  const cargar = useCallback(async () => {
    if (!usuario) return;
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
  }, [usuario?.id, token]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  if (!usuario) {
    return <View style={estilos.contenedor} />;
  }

  // Los pendientes de confirmar siempre quedan primero, sin importar el criterio elegido; dentro
  // de cada grupo (pendientes / resto) se ordena según ese criterio.
  const ESTADOS_PENDIENTES = ['pendiente', 'pendiente_aprobacion'];
  const partidosOrdenados = [...partidos].sort((a, b) => {
    const pendienteA = ESTADOS_PENDIENTES.includes(a.estado) ? 0 : 1;
    const pendienteB = ESTADOS_PENDIENTES.includes(b.estado) ? 0 : 1;
    if (pendienteA !== pendienteB) return pendienteA - pendienteB;

    if (criterioOrden === 'jugador') {
      const rivalA = (a.jugadorA?.id === usuario.id ? a.jugadorB : a.jugadorA)?.nombre || '';
      const rivalB = (b.jugadorA?.id === usuario.id ? b.jugadorB : b.jugadorA)?.nombre || '';
      return rivalA.localeCompare(rivalB);
    }
    if (criterioOrden === 'ganados' || criterioOrden === 'perdidos') {
      const ganeA = a.ganador?.id === usuario.id;
      const ganeB = b.ganador?.id === usuario.id;
      if (ganeA !== ganeB) {
        const primeroSiGane = criterioOrden === 'ganados';
        return ganeA === primeroSiGane ? -1 : 1;
      }
    }
    return new Date(b.fechaPartido) - new Date(a.fechaPartido);
  });

  return (
    <View style={estilos.contenedor}>
      <EncabezadoApp />

      <View style={estilos.filtro}>
        <SelectorOpciones etiqueta="Ordenar por" opciones={OPCIONES_ORDEN} valor={criterioOrden} onCambiar={setCriterioOrden} />
      </View>

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colores.navy} />
      ) : error ? (
        <Text style={estilos.error}>{error}</Text>
      ) : (
        <FlatList
          data={partidosOrdenados}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 96 }}
          onRefresh={cargar}
          refreshing={false}
          ListEmptyComponent={<Text style={estilos.vacio}>Todavía no has jugado ningún partido</Text>}
          renderItem={({ item }) => {
            const soyJugadorA = item.jugadorA?.id === usuario.id;
            const rival = soyJugadorA ? item.jugadorB : item.jugadorA;
            const etiqueta = ETIQUETAS_ESTADO[item.estado] || ETIQUETAS_ESTADO.por_definir;

            return (
              <Pressable style={estilos.tarjeta} onPress={() => router.push(`/partidos/${item.id}`)}>
                <View style={estilos.filaSuperior}>
                  <View style={[estilos.badge, { backgroundColor: etiqueta.fondo }]}>
                    <Text style={[estilos.badgeTexto, { color: etiqueta.color }]}>{etiqueta.texto}</Text>
                  </View>
                  {item.torneoId && <Text style={estilos.torneoTag}>{item.ronda || 'Torneo'}</Text>}
                </View>
                <Text style={estilos.rival}>vs {rival?.nombre || 'Por definir'}</Text>
                <View style={estilos.filaFecha}>
                  <Ionicons name="calendar-outline" size={13} color={colores.textoSecundario} />
                  <Text style={estilos.fecha}>{new Date(item.fechaPartido).toLocaleDateString('es-CO')}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <Link href="/partidos/nuevo" asChild>
        <Pressable style={estilos.fab}>
          <Ionicons name="add" size={18} color={colores.textoClaro} />
          <Text style={estilos.fabTexto}>Registrar partido</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  filtro: { paddingHorizontal: 16, paddingTop: 14 },
  error: { color: colores.error, textAlign: 'center', marginTop: 24 },
  vacio: { textAlign: 'center', color: colores.textoSecundario, marginTop: 24 },
  tarjeta: {
    padding: 16,
    borderRadius: radios.tarjeta,
    backgroundColor: colores.tarjeta,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  filaSuperior: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  rival: { fontSize: 16, fontWeight: '700', color: colores.texto },
  filaFecha: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  fecha: { fontSize: 12, color: colores.textoSecundario },
  torneoTag: { fontSize: 11, color: colores.navy, fontWeight: '700' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radios.pildora },
  badgeTexto: { fontSize: 11, fontWeight: '700' },
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

import { useCallback, useRef, useState } from 'react';
import { Animated, View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
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
  desafio_pendiente: { texto: 'Desafío pendiente', color: colores.advertencia, fondo: colores.advertenciaFondo },
  desafio_rechazado: { texto: 'Desafío rechazado', color: colores.textoSecundario, fondo: colores.gris },
  en_juego: { texto: 'En juego', color: colores.info, fondo: colores.infoFondo },
};

// Cuenta cuántos sets ganó cada lado a partir del marcador de cada set.
function contarSetsGanados(sets, soyJugadorA) {
  let misSets = 0;
  let setsRival = 0;
  for (const s of sets || []) {
    const ganeEsteSet = soyJugadorA ? s.puntosJugadorA > s.puntosJugadorB : s.puntosJugadorB > s.puntosJugadorA;
    if (ganeEsteSet) misSets++;
    else setsRival++;
  }
  return { misSets, setsRival };
}

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
  const ESTADOS_PENDIENTES = ['pendiente', 'pendiente_aprobacion', 'desafio_pendiente', 'en_juego'];
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
            const esConfirmado = item.estado === 'confirmado';
            const gane = esConfirmado && item.ganador?.id === usuario.id;
            const { misSets, setsRival } = contarSetsGanados(item.sets, soyJugadorA);

            return (
              <Pressable
                style={[estilos.tarjeta, esConfirmado && { borderLeftColor: gane ? colores.exito : colores.error }]}
                onPress={() => router.push(`/partidos/${item.id}`)}
              >
                <View style={estilos.filaSuperior}>
                  <View style={[estilos.badge, { backgroundColor: etiqueta.fondo }]}>
                    <Text style={[estilos.badgeTexto, { color: etiqueta.color }]}>{etiqueta.texto}</Text>
                  </View>
                  {item.torneoId && <Text style={estilos.torneoTag}>{item.ronda || 'Torneo'}</Text>}
                </View>

                <View style={estilos.filaPrincipal}>
                  <View style={{ flex: 1 }}>
                    <Text style={estilos.rival}>vs {rival?.nombre || 'Por definir'}</Text>
                    <View style={estilos.filaFecha}>
                      <Ionicons name="calendar-outline" size={13} color={colores.textoSecundario} />
                      <Text style={estilos.fecha}>{new Date(item.fechaPartido).toLocaleDateString('es-CO')}</Text>
                    </View>
                  </View>

                  {esConfirmado && (
                    <View style={estilos.resultado}>
                      <Text style={[estilos.resultadoTexto, { color: gane ? colores.exito : colores.error }]}>
                        {gane ? 'GANASTE' : 'PERDISTE'}
                      </Text>
                      <Text style={estilos.marcadorSets}>
                        {misSets}-{setsRival}
                      </Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      )}

      <MenuNuevoPartido />
    </View>
  );
}

// Un solo botón circular abajo a la derecha que, al tocarlo, despliega las dos formas de
// registrar un partido (con una animación sutil) en vez de mostrar siempre los dos botones.
function MenuNuevoPartido() {
  const [abierto, setAbierto] = useState(false);
  // Mientras está cerrado del todo, las píldoras ni se montan: en Android, un elemento con
  // elevación (la sombra) puede seguir dibujando esa sombra aunque su opacidad animada llegue a
  // 0, y quedaba un rastro de sombra "flotando" sobre el botón + una vez terminaba la animación.
  const [mostrarOpciones, setMostrarOpciones] = useState(false);
  const progreso = useRef(new Animated.Value(0)).current;
  // Se necesita además de `abierto` (estado, para pintar) porque al tocar varias veces muy rápido
  // el callback de una animación de cierre interrumpida por una de apertura podía llegar tarde y
  // desmontar las píldoras aunque ya se hubiera vuelto a abrir — con la ref siempre se sabe cuál
  // fue la ÚLTIMA intención real, sin depender del orden en que terminen las animaciones.
  const abiertoRef = useRef(false);

  function cerrar() {
    abiertoRef.current = false;
    setAbierto(false);
    Animated.spring(progreso, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 8 }).start(({ finished }) => {
      if (finished && !abiertoRef.current) {
        setMostrarOpciones(false);
      }
    });
  }

  function alternar() {
    if (abiertoRef.current) {
      cerrar();
      return;
    }
    abiertoRef.current = true;
    setMostrarOpciones(true);
    setAbierto(true);
    Animated.spring(progreso, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 8 }).start();
  }

  function ir(ruta) {
    cerrar();
    router.push(ruta);
  }

  const rotacion = progreso.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  const estiloOpcion = (indice) => ({
    opacity: progreso,
    transform: [
      { translateY: progreso.interpolate({ inputRange: [0, 1], outputRange: [0, -(70 + indice * 54)] }) },
      { scale: progreso.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
    ],
  });

  return (
    <View style={estilos.menuNuevo} pointerEvents="box-none">
      {mostrarOpciones && (
        <>
          <Animated.View style={[estilos.opcionFab, estiloOpcion(1)]} pointerEvents={abierto ? 'auto' : 'none'}>
            <Pressable style={estilos.opcionFabPildora} onPress={() => ir('/partidos/desafio')}>
              <Text style={estilos.opcionFabPildoraTexto} numberOfLines={1}>Desafiar</Text>
              <Ionicons name="flash" size={17} color={colores.textoClaro} />
            </Pressable>
          </Animated.View>

          <Animated.View style={[estilos.opcionFab, estiloOpcion(0)]} pointerEvents={abierto ? 'auto' : 'none'}>
            <Pressable style={estilos.opcionFabPildora} onPress={() => ir('/partidos/nuevo')}>
              <Text style={estilos.opcionFabPildoraTexto} numberOfLines={1}>Registrar</Text>
              <Ionicons name="create-outline" size={17} color={colores.textoClaro} />
            </Pressable>
          </Animated.View>
        </>
      )}

      <Pressable style={estilos.fabPrincipal} onPress={alternar}>
        <Animated.View style={{ transform: [{ rotate: rotacion }] }}>
          <Ionicons name="add" size={30} color={colores.textoClaro} />
        </Animated.View>
      </Pressable>
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
    borderLeftWidth: 4,
    borderLeftColor: 'transparent',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  filaSuperior: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  filaPrincipal: { flexDirection: 'row', alignItems: 'center' },
  rival: { fontSize: 16, fontWeight: '700', color: colores.texto },
  filaFecha: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  fecha: { fontSize: 12, color: colores.textoSecundario },
  torneoTag: { fontSize: 11, color: colores.navy, fontWeight: '700' },
  resultado: { alignItems: 'flex-end' },
  resultadoTexto: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },
  marcadorSets: { fontSize: 20, fontWeight: '800', color: colores.texto, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radios.pildora },
  badgeTexto: { fontSize: 11, fontWeight: '700' },
  menuNuevo: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    alignItems: 'flex-end',
  },
  fabPrincipal: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colores.navy,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  opcionFab: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  opcionFabPildora: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colores.navy,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radios.pildora,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  opcionFabPildoraTexto: { color: colores.textoClaro, fontWeight: '700', fontSize: 13, letterSpacing: 0.3 },
});

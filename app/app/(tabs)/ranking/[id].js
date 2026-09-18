import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiFetch } from '../../../src/api/client';
import { useAuth } from '../../../src/auth/AuthContext';
import Avatar from '../../../src/components/Avatar';
import EtiquetaNivel from '../../../src/components/EtiquetaNivel';
import GraficoElo from '../../../src/components/GraficoElo';
import BarraProporcion from '../../../src/components/BarraProporcion';
import { colores, radios } from '../../../src/theme/colores';

export default function PerfilJugador() {
  const { id, desde } = useLocalSearchParams();
  const { token } = useAuth();

  const [datos, setDatos] = useState(null);
  const [partidos, setPartidos] = useState([]);
  const [historialElo, setHistorialElo] = useState([]);
  const [mapaDeltaElo, setMapaDeltaElo] = useState(new Map());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [mostrarNivel, setMostrarNivel] = useState(false);
  const [vista, setVista] = useState('rival');
  const [gruposAbiertos, setGruposAbiertos] = useState(new Set());

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [stats, listaPartidos, historial] = await Promise.all([
        apiFetch(`/usuarios/${id}/estadisticas`, { token }),
        apiFetch(`/partidos?usuario_id=${id}&estado=confirmado`, { token }),
        apiFetch(`/usuarios/${id}/historial-ranking?tipo=no_oficial`, { token }),
      ]);
      setDatos(stats);
      setPartidos(listaPartidos);
      setMapaDeltaElo(new Map(historial.map((h) => [h.partidoId, h.eloDespues - h.eloAntes])));
      if (historial.length === 0) {
        setHistorialElo([]);
      } else {
        // Se antepone el punto de partida (el eloAntes del primer registro) para que la línea
        // no arranque "en el aire" en el primer partido.
        setHistorialElo([
          { fecha: 'Antes del primer partido', elo: historial[0].eloAntes },
          ...historial.map((h) => ({ fecha: new Date(h.fecha).toLocaleDateString('es-CO'), elo: h.eloDespues })),
        ]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [id, token]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  useEffect(() => {
    if (!token) return;
    apiFetch('/configuracion', { token })
      .then((datos) => setMostrarNivel(datos.mostrarNivelEnRanking))
      .catch(() => {
        // no es crítico: si falla, simplemente no se muestra la etiqueta
      });
  }, [token]);

  function alternarGrupo(rivalId) {
    setGruposAbiertos((anteriores) => {
      const siguientes = new Set(anteriores);
      if (siguientes.has(rivalId)) siguientes.delete(rivalId);
      else siguientes.add(rivalId);
      return siguientes;
    });
  }

  // Al entrar desde "Ver historial de partidos" (Perfil), navegar acá cambia la pestaña activa a
  // Ranking, así que un "volver" normal no regresaría a Perfil sino a la lista del ranking.
  const botonVolver = () => (
    <Pressable onPress={() => (desde === 'perfil' ? router.replace('/perfil') : router.back())} hitSlop={10} style={{ paddingRight: 12 }}>
      <Ionicons name="arrow-back" size={22} color={colores.textoClaro} />
    </Pressable>
  );

  if (cargando || !datos) {
    return (
      <View style={estilos.centrado}>
        <Stack.Screen options={{ title: 'Jugador', headerLeft: botonVolver }} />
        {error ? <Text style={estilos.error}>{error}</Text> : <ActivityIndicator color={colores.navy} />}
      </View>
    );
  }

  const { usuario, record, racha } = datos;
  const colorRacha = racha.tipo === 'V' ? colores.exito : racha.tipo === 'D' ? colores.error : colores.textoSecundario;
  const deltaRanking = historialElo.length >= 2 ? historialElo[historialElo.length - 1].elo - historialElo[historialElo.length - 2].elo : 0;

  // Agrupa los partidos confirmados por rival, cada grupo ordenado del más nuevo al más viejo, y
  // los grupos ordenados por el partido más reciente de cada uno.
  const gruposPorRival = (() => {
    const mapa = new Map();
    for (const p of partidos) {
      const rival = p.jugadorA?.id === id ? p.jugadorB : p.jugadorA;
      if (!rival) continue;
      if (!mapa.has(rival.id)) {
        mapa.set(rival.id, { rivalId: rival.id, rivalNombre: rival.nombre, partidos: [] });
      }
      mapa.get(rival.id).partidos.push(p);
    }
    return [...mapa.values()].sort((a, b) => new Date(b.partidos[0].fechaPartido) - new Date(a.partidos[0].fechaPartido));
  })();

  return (
    <ScrollView contentContainerStyle={estilos.contenedor}>
      <Stack.Screen options={{ title: usuario.nombre, headerLeft: botonVolver }} />

      <View style={estilos.encabezado}>
        <Avatar nombre={usuario.nombre} avatarSeed={usuario.avatarSeed} tamano={64} />
        {mostrarNivel && (
          <View style={{ marginTop: 6 }}>
            <EtiquetaNivel nivel={usuario.nivel} />
          </View>
        )}
      </View>

      <View style={estilos.tarjeta}>
        <Text style={estilos.tarjetaTitulo}>TM RATING</Text>
        <View style={estilos.filaElo}>
          <View style={estilos.itemElo}>
            <Text style={estilos.eloValor}>{usuario.eloOficial}</Text>
            <Text style={estilos.eloEtiqueta}>Ranking Interno</Text>
          </View>
          <View style={estilos.separador} />
          <View style={estilos.itemElo}>
            <View style={estilos.filaEloValor}>
              <Text style={estilos.eloValor}>{usuario.eloNoOficial}</Text>
              {deltaRanking !== 0 && (
                <Text style={[estilos.eloTendencia, { color: deltaRanking > 0 ? colores.exito : colores.error }]}>
                  {deltaRanking > 0 ? '▲' : '▼'}
                  {Math.abs(deltaRanking)}
                </Text>
              )}
            </View>
            <Text style={estilos.eloEtiqueta}>Ranking</Text>
          </View>
        </View>
      </View>

      {record.totalPartidos === 0 ? (
        <View style={estilos.tarjeta}>
          <Text style={estilos.vacio}>Este jugador todavía no tiene partidos confirmados</Text>
        </View>
      ) : (
        <>
          <View style={estilos.filaTarjetas}>
            <View style={[estilos.tarjeta, { flex: 1 }]}>
              <Text style={estilos.tarjetaTitulo}>RÉCORD</Text>
              <Text style={estilos.recordValor}>
                {record.victorias}-{record.derrotas}
              </Text>
              <Text style={estilos.recordSubtitulo}>
                {record.totalPartidos} partidos · {record.porcentajeVictorias}% victorias
              </Text>
              <BarraProporcion victorias={record.victorias} derrotas={record.derrotas} />
            </View>
            <View style={[estilos.tarjeta, { flex: 1 }]}>
              <Text style={estilos.tarjetaTitulo}>RACHA ACTUAL</Text>
              <View style={[estilos.badgeRacha, { backgroundColor: colorRacha + '22' }]}>
                <Text style={[estilos.badgeRachaTexto, { color: colorRacha }]}>
                  {racha.cantidad}
                  {racha.tipo}
                </Text>
              </View>
              {datos.mejorRachaVictorias > 0 && (
                <Text style={estilos.mejorRachaTexto}>
                  Mejor racha: <Text style={estilos.mejorRachaValor}>{datos.mejorRachaVictorias} victorias</Text>
                </Text>
              )}
            </View>
          </View>

          <View style={estilos.tarjeta}>
            <Text style={estilos.tarjetaTitulo}>Evolución del ranking</Text>
            <GraficoElo
              puntos={historialElo}
              mensajeVacio="Todavía no hay suficientes partidos para ver la evolución"
              sufijoDelta="desde el partido anterior"
            />
          </View>

          <Text style={estilos.subtitulo}>Historial de partidos</Text>
          <View style={estilos.segmentado}>
            <Pressable style={[estilos.segmento, vista === 'rival' && estilos.segmentoActivo]} onPress={() => setVista('rival')}>
              <Text style={[estilos.segmentoTexto, vista === 'rival' && estilos.segmentoTextoActivo]}>Por rival</Text>
            </Pressable>
            <Pressable style={[estilos.segmento, vista === 'cronologico' && estilos.segmentoActivo]} onPress={() => setVista('cronologico')}>
              <Text style={[estilos.segmentoTexto, vista === 'cronologico' && estilos.segmentoTextoActivo]}>Cronológico</Text>
            </Pressable>
          </View>

          {vista === 'rival' ? (
            <View style={{ gap: 10 }}>
              {gruposPorRival.map((g) => {
                const victorias = g.partidos.filter((p) => p.ganadorId === id).length;
                const derrotas = g.partidos.length - victorias;
                const abierto = gruposAbiertos.has(g.rivalId);
                return (
                  <View key={g.rivalId} style={estilos.grupoRival}>
                    <Pressable style={estilos.grupoCabecera} onPress={() => alternarGrupo(g.rivalId)}>
                      <Avatar nombre={g.rivalNombre} tamano={34} />
                      <View style={estilos.grupoInfo}>
                        <Text style={estilos.grupoNombre} numberOfLines={1}>
                          {g.rivalNombre}
                        </Text>
                        <BarraProporcion victorias={victorias} derrotas={derrotas} alto={5} />
                      </View>
                      <Text style={estilos.grupoRecord}>
                        {victorias}-{derrotas}
                      </Text>
                      <Ionicons name={abierto ? 'chevron-up' : 'chevron-down'} size={16} color={colores.textoSecundario} />
                    </Pressable>
                    {abierto && (
                      <View style={estilos.listaPartidosGrupo}>
                        {g.partidos.map((p) => (
                          <FilaPartido key={p.id} partido={p} idJugador={id} delta={mapaDeltaElo.get(p.id)} />
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {partidos.map((p) => (
                <View key={p.id} style={estilos.tarjetaPartidoSuelto}>
                  <FilaPartido partido={p} idJugador={id} delta={mapaDeltaElo.get(p.id)} mostrarRival />
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

// Una fila de historial: fecha + variación de ELO arriba, y debajo el marcador completo en forma
// de mini-tabla (una fila por jugador, la primera columna es cuántos sets ganó cada quien) — la
// fila de quien ganó el partido queda resaltada, y dentro de cada fila, el set que ganó esa
// persona tiene su celda con fondo más marcado.
function FilaPartido({ partido: p, idJugador, delta, mostrarRival = false }) {
  const esJugadorA = p.jugadorA?.id === idJugador;
  const misPuntos = p.sets.map((s) => (esJugadorA ? s.puntosJugadorA : s.puntosJugadorB));
  const susPuntos = p.sets.map((s) => (esJugadorA ? s.puntosJugadorB : s.puntosJugadorA));
  const misSets = misPuntos.filter((v, i) => v > susPuntos[i]).length;
  const susSets = susPuntos.filter((v, i) => v > misPuntos[i]).length;
  const gane = p.ganadorId === idJugador;
  const rival = esJugadorA ? p.jugadorB : p.jugadorA;

  return (
    <Pressable
      style={estilos.filaPartido}
      onPress={() => router.push(`/partidos/${p.id}?volverA=${encodeURIComponent(`/ranking/${idJugador}`)}`)}
    >
      <View style={estilos.filaPartidoCabecera}>
        <View style={estilos.filaFechaGrupo}>
          <View style={[estilos.puntoResultado, { backgroundColor: gane ? colores.exito : colores.error }]} />
          <Text style={estilos.partidoFecha} numberOfLines={1}>
            {mostrarRival ? `vs ${rival?.nombre || 'Rival'} · ` : ''}
            {new Date(p.fechaPartido).toLocaleDateString('es-CO')}
          </Text>
        </View>
        {delta !== undefined && (
          <Text style={[estilos.partidoElo, { color: delta >= 0 ? colores.exito : colores.error }]}>
            {delta >= 0 ? '+' : '−'}
            {Math.abs(delta)}
          </Text>
        )}
      </View>
      <View style={estilos.tablaMarcador}>
        <FilaMarcador puntos={misPuntos} puntosRival={susPuntos} setsGanados={misSets} esGanador={gane} />
        <FilaMarcador puntos={susPuntos} puntosRival={misPuntos} setsGanados={susSets} esGanador={!gane} />
      </View>
    </Pressable>
  );
}

function FilaMarcador({ puntos, puntosRival, setsGanados, esGanador }) {
  return (
    <View style={estilos.filaMarcador}>
      <Text style={[estilos.celdaSets, esGanador && estilos.textoGanador]}>{setsGanados}</Text>
      {puntos.map((v, i) => {
        const ganoEsteSet = v > puntosRival[i];
        return (
          <View key={i} style={[estilos.celdaPunto, ganoEsteSet && estilos.celdaPuntoGanado]}>
            <Text
              style={[
                estilos.celdaPuntoTexto,
                esGanador && estilos.textoGanador,
                ganoEsteSet && (esGanador ? estilos.celdaPuntoGanadoTextoFuerte : null),
              ]}
            >
              {v}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.fondo },
  error: { color: colores.error, textAlign: 'center', paddingHorizontal: 24 },
  contenedor: { padding: 16, paddingBottom: 48, backgroundColor: colores.fondo },
  encabezado: { alignItems: 'center', marginBottom: 16, marginTop: 8 },
  tarjeta: {
    backgroundColor: colores.tarjeta,
    borderRadius: radios.tarjeta,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  tarjetaTitulo: { fontSize: 11, fontWeight: '700', color: colores.textoSecundario, letterSpacing: 0.5, marginBottom: 10 },
  filaElo: { flexDirection: 'row', alignItems: 'center' },
  itemElo: { flex: 1, alignItems: 'center' },
  separador: { width: 1, height: 40, backgroundColor: colores.borde },
  filaEloValor: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  eloValor: { fontSize: 26, fontWeight: '800', color: colores.texto },
  eloTendencia: { fontSize: 12, fontWeight: '800' },
  eloEtiqueta: { fontSize: 12, color: colores.textoSecundario, marginTop: 4 },
  vacio: { textAlign: 'center', color: colores.textoSecundario, paddingVertical: 8 },
  filaTarjetas: { flexDirection: 'row', gap: 12 },
  recordValor: { fontSize: 28, fontWeight: '800', color: colores.texto },
  recordSubtitulo: { fontSize: 12, color: colores.textoSecundario, marginTop: 4, marginBottom: 10 },
  badgeRacha: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: radios.pildora },
  badgeRachaTexto: { fontSize: 20, fontWeight: '800' },
  mejorRachaTexto: { fontSize: 10.5, color: colores.textoSecundario, marginTop: 9 },
  mejorRachaValor: { color: colores.texto, fontWeight: '700' },
  subtitulo: { fontSize: 13, fontWeight: '700', color: colores.textoSecundario, marginTop: 4, marginBottom: 8, letterSpacing: 0.3 },

  segmentado: { flexDirection: 'row', backgroundColor: colores.gris, borderRadius: 12, padding: 3, gap: 3, marginBottom: 12 },
  segmento: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9 },
  segmentoActivo: { backgroundColor: colores.navy },
  segmentoTexto: { fontSize: 12.5, fontWeight: '700', color: colores.textoSecundario },
  segmentoTextoActivo: { color: colores.textoClaro },

  grupoRival: {
    backgroundColor: colores.tarjeta,
    borderRadius: radios.tarjeta,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    overflow: 'hidden',
  },
  grupoCabecera: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14 },
  grupoInfo: { flex: 1, minWidth: 0 },
  grupoNombre: { fontSize: 14, fontWeight: '700', color: colores.texto, marginBottom: 6 },
  grupoRecord: { fontSize: 13, fontWeight: '800', color: colores.texto },
  listaPartidosGrupo: { borderTopWidth: 1, borderTopColor: colores.borde },

  tarjetaPartidoSuelto: {
    backgroundColor: colores.tarjeta,
    borderRadius: radios.tarjeta,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },

  filaPartido: { padding: 13, borderTopWidth: 1, borderTopColor: colores.borde },
  filaPartidoCabecera: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  filaFechaGrupo: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1, minWidth: 0 },
  puntoResultado: { width: 7, height: 7, borderRadius: 4, flexShrink: 0 },
  partidoFecha: { fontSize: 11, color: colores.textoSecundario, flexShrink: 1 },
  partidoElo: { fontSize: 12, fontWeight: '800' },

  tablaMarcador: { gap: 3 },
  filaMarcador: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  celdaSets: { width: 20, fontSize: 13.5, fontWeight: '700', color: colores.textoSecundario, textAlign: 'center' },
  celdaPunto: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colores.gris,
    borderRadius: 6,
    paddingVertical: 4,
  },
  celdaPuntoGanado: { backgroundColor: colores.acentoFondo },
  celdaPuntoTexto: { fontSize: 12, fontWeight: '600', color: colores.textoSecundario },
  celdaPuntoGanadoTextoFuerte: { color: colores.acento },
  textoGanador: { color: colores.navy, fontWeight: '800' },
});

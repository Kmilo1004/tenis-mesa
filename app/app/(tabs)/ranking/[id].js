import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiFetch } from '../../../src/api/client';
import { useAuth } from '../../../src/auth/AuthContext';
import Avatar from '../../../src/components/Avatar';
import { colores, radios } from '../../../src/theme/colores';

export default function PerfilJugador() {
  const { id } = useLocalSearchParams();
  const { token } = useAuth();

  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await apiFetch(`/usuarios/${id}/estadisticas`, { token });
      setDatos(respuesta);
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

  if (cargando || !datos) {
    return (
      <View style={estilos.centrado}>
        <Stack.Screen options={{ title: 'Jugador' }} />
        {error ? <Text style={estilos.error}>{error}</Text> : <ActivityIndicator color={colores.navy} />}
      </View>
    );
  }

  const { usuario, record, racha, headToHead, partidosRecientes } = datos;
  const colorRacha = racha.tipo === 'V' ? colores.exito : racha.tipo === 'D' ? colores.error : colores.textoSecundario;

  return (
    <ScrollView contentContainerStyle={estilos.contenedor}>
      <Stack.Screen options={{ title: usuario.nombre }} />

      <View style={estilos.encabezado}>
        <Avatar nombre={usuario.nombre} tamano={64} />
        <Text style={estilos.nombre}>{usuario.nombre}</Text>
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
            <Text style={estilos.eloValor}>{usuario.eloNoOficial}</Text>
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
            </View>
            <View style={[estilos.tarjeta, { flex: 1 }]}>
              <Text style={estilos.tarjetaTitulo}>RACHA ACTUAL</Text>
              <View style={[estilos.badgeRacha, { backgroundColor: colorRacha + '22' }]}>
                <Text style={[estilos.badgeRachaTexto, { color: colorRacha }]}>
                  {racha.cantidad}
                  {racha.tipo}
                </Text>
              </View>
            </View>
          </View>

          <Text style={estilos.subtitulo}>Cara a cara</Text>
          <View style={estilos.tarjeta}>
            {headToHead.map((r, i) => (
              <View key={r.rivalId} style={[estilos.filaRival, i > 0 && estilos.filaConDivisor]}>
                <Avatar nombre={r.rivalNombre} tamano={32} />
                <Text style={estilos.rivalNombre}>{r.rivalNombre}</Text>
                <Text style={estilos.rivalRecord}>
                  {r.victorias}-{r.derrotas}
                </Text>
              </View>
            ))}
          </View>

          <Text style={estilos.subtitulo}>Partidos recientes</Text>
          {partidosRecientes.map((p) => {
            const gano = p.ganadorId === usuario.id;
            const rival = p.jugadorAId === usuario.id ? p.jugadorB : p.jugadorA;
            return (
              <Pressable key={p.id} style={estilos.filaPartido} onPress={() => router.push(`/partidos/${p.id}`)}>
                <View style={[estilos.puntoResultado, { backgroundColor: gano ? colores.exito : colores.error }]} />
                <View style={{ flex: 1 }}>
                  <Text style={estilos.partidoRival}>vs {rival?.nombre || 'Rival'}</Text>
                  <Text style={estilos.partidoFecha}>{new Date(p.fechaPartido).toLocaleDateString('es-CO')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colores.textoSecundario} />
              </Pressable>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.fondo },
  error: { color: colores.error, textAlign: 'center', paddingHorizontal: 24 },
  contenedor: { padding: 16, paddingBottom: 48, backgroundColor: colores.fondo },
  encabezado: { alignItems: 'center', marginBottom: 16, marginTop: 8 },
  nombre: { fontSize: 19, fontWeight: '800', color: colores.texto, marginTop: 10 },
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
  separador: { width: 1, height: 36, backgroundColor: colores.borde },
  eloValor: { fontSize: 26, fontWeight: '800', color: colores.texto },
  eloEtiqueta: { fontSize: 12, color: colores.textoSecundario, marginTop: 4 },
  vacio: { textAlign: 'center', color: colores.textoSecundario, paddingVertical: 8 },
  filaTarjetas: { flexDirection: 'row', gap: 12 },
  recordValor: { fontSize: 28, fontWeight: '800', color: colores.texto },
  recordSubtitulo: { fontSize: 12, color: colores.textoSecundario, marginTop: 4 },
  badgeRacha: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6, borderRadius: radios.pildora },
  badgeRachaTexto: { fontSize: 20, fontWeight: '800' },
  subtitulo: { fontSize: 13, fontWeight: '700', color: colores.textoSecundario, marginTop: 8, marginBottom: 8, letterSpacing: 0.3 },
  filaRival: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  filaConDivisor: { borderTopWidth: 1, borderTopColor: colores.borde },
  rivalNombre: { flex: 1, fontSize: 14, color: colores.texto, fontWeight: '600' },
  rivalRecord: { fontSize: 14, fontWeight: '700', color: colores.navy },
  filaPartido: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colores.tarjeta,
    borderRadius: radios.tarjeta,
    padding: 14,
    marginBottom: 8,
  },
  puntoResultado: { width: 8, height: 8, borderRadius: 4 },
  partidoRival: { fontSize: 14, fontWeight: '600', color: colores.texto },
  partidoFecha: { fontSize: 12, color: colores.textoSecundario, marginTop: 2 },
});

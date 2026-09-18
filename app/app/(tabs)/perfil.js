import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiFetch } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';
import AvisoSinConexion from '../../src/components/AvisoSinConexion';
import EncabezadoApp from '../../src/components/EncabezadoApp';
import Avatar from '../../src/components/Avatar';
import GraficoElo from '../../src/components/GraficoElo';
import BarraProporcion from '../../src/components/BarraProporcion';
import { colores, radios } from '../../src/theme/colores';
import { esVersionMasNueva } from '../../src/lib/actualizaciones';

const VERSION_ACTUAL = Constants.expoConfig?.version || '1.0.0';

export default function Perfil() {
  const { usuario, token, cargando, sinConexion } = useAuth();
  const [hayActualizacion, setHayActualizacion] = useState(false);
  const [estadisticas, setEstadisticas] = useState(null);
  const [historialElo, setHistorialElo] = useState([]);
  const [totalPorAprobar, setTotalPorAprobar] = useState(0);

  useEffect(() => {
    if (!cargando && !usuario) {
      router.replace('/login');
    }
  }, [cargando, usuario]);

  useFocusEffect(
    useCallback(() => {
      if (!usuario) return;
      apiFetch(`/usuarios/${usuario.id}/estadisticas`, { token })
        .then(setEstadisticas)
        .catch(() => {
          // no es crítico: si falla, la tarjeta de estadísticas simplemente no se muestra
        });

      apiFetch(`/usuarios/${usuario.id}/historial-ranking?tipo=no_oficial`, { token })
        .then((datos) => {
          if (datos.length === 0) {
            setHistorialElo([]);
            return;
          }
          // Se antepone el punto de partida (el eloAntes del primer registro) para que la línea
          // no arranque "en el aire" en el primer partido.
          setHistorialElo([
            { fecha: 'Antes de tu primer partido', elo: datos[0].eloAntes },
            ...datos.map((d) => ({ fecha: new Date(d.fecha).toLocaleDateString('es-CO'), elo: d.eloDespues })),
          ]);
        })
        .catch(() => {
          // no es crítico: si falla, el gráfico simplemente no se muestra
        });

      const esAdmin = usuario.roles?.some((r) => r.rol === 'administrador');
      if (!esAdmin) return;
      Promise.all([
        apiFetch('/partidos?estado=pendiente_aprobacion', { token }),
        apiFetch('/partidos?estado=en_revision', { token }),
        apiFetch('/partidos?estado=descartado', { token }),
      ])
        .then(([a, b, c]) => setTotalPorAprobar(a.length + b.length + c.filter((p) => p.tipoPartido === 'casual').length))
        .catch(() => {
          // no es crítico: si falla, simplemente no se muestra el contador
        });
    }, [usuario?.id, token]),
  );

  // Chequeo liviano y silencioso: solo para decidir si mostrar el puntito rojo sobre la
  // tuerquita. El botón de "Buscar actualizaciones" en sí (con la tarjeta de descarga) vive en
  // Configuración.
  useEffect(() => {
    apiFetch('/version')
      .then((datos) => setHayActualizacion(esVersionMasNueva(datos.version, VERSION_ACTUAL)))
      .catch(() => {
        // no es crítico: si falla, simplemente no se muestra el puntito
      });
  }, []);

  if (cargando || !usuario) {
    return (
      <View style={estilos.centrado}>
        <ActivityIndicator color={colores.navy} />
      </View>
    );
  }

  const esAdmin = usuario.roles?.some((r) => r.rol === 'administrador');
  const deltaRanking = historialElo.length >= 2 ? historialElo[historialElo.length - 1].elo - historialElo[historialElo.length - 2].elo : 0;
  // Los últimos resultados (de más antiguo a más reciente) a partir de los partidos recientes,
  // que ya vienen ordenados del más nuevo al más viejo.
  const ultimosResultados = estadisticas ? [...estadisticas.partidosRecientes].reverse() : [];

  return (
    <ScrollView style={estilos.contenedor} contentContainerStyle={{ paddingBottom: 40 }}>
      <EncabezadoApp
        accionDerecha={
          <Pressable style={estilos.botonConfig} onPress={() => router.push('/configuracion')} hitSlop={10}>
            <Ionicons name="settings-outline" size={24} color={colores.textoClaro} />
            {hayActualizacion && <View style={estilos.puntoActualizacion} />}
          </Pressable>
        }
      >
        <View style={estilos.filaAvatar}>
          <Avatar nombre={usuario.nombre} avatarSeed={usuario.avatarSeed} avatarEstilo={usuario.avatarEstilo} tamano={56} />
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={estilos.nombre}>{usuario.nombre}</Text>
            <Text style={estilos.correo}>{usuario.correo}</Text>
            {usuario.institucion && <Text style={estilos.institucion}>{usuario.institucion}</Text>}
          </View>
        </View>
      </EncabezadoApp>

      <View style={estilos.cuerpo}>
        {sinConexion && <AvisoSinConexion />}

        <View style={estilos.rolesFila}>
          {usuario.roles?.map((r) => (
            <View key={r.id} style={estilos.rolBadge}>
              <Text style={estilos.rolTexto}>{r.rol}</Text>
            </View>
          ))}
        </View>

        <View style={estilos.tarjeta}>
          <Text style={estilos.tarjetaTitulo}>TM RATING</Text>
          <View style={estilos.tarjetasElo}>
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

        {estadisticas && estadisticas.record.totalPartidos === 0 && (
          <View style={estilos.tarjeta}>
            <Text style={estilos.statsVacio}>Todavía no tienes partidos confirmados</Text>
          </View>
        )}

        {estadisticas && estadisticas.record.totalPartidos > 0 && (
          <>
            <View style={estilos.filaStats}>
              <View style={[estilos.tarjeta, estilos.subTarjetaStats]}>
                <Text style={estilos.tarjetaTitulo}>Récord</Text>
                <Text style={estilos.statsRecordValor}>
                  {estadisticas.record.victorias}-{estadisticas.record.derrotas}
                </Text>
                <Text style={estilos.statsRecordSub}>
                  {estadisticas.record.totalPartidos} partidos · {estadisticas.record.porcentajeVictorias}% victorias
                </Text>
                <BarraProporcion victorias={estadisticas.record.victorias} derrotas={estadisticas.record.derrotas} />
              </View>
              <View style={[estilos.tarjeta, estilos.subTarjetaStats]}>
                <Text style={estilos.tarjetaTitulo}>Racha actual</Text>
                <View
                  style={[
                    estilos.badgeRacha,
                    { backgroundColor: estadisticas.racha.tipo === 'V' ? colores.exitoFondo : colores.errorFondo },
                  ]}
                >
                  <Text
                    style={[estilos.badgeRachaTexto, { color: estadisticas.racha.tipo === 'V' ? colores.exito : colores.error }]}
                  >
                    {estadisticas.racha.cantidad}
                    {estadisticas.racha.tipo}
                  </Text>
                </View>
                {estadisticas.mejorRachaVictorias > 0 && (
                  <Text style={estilos.mejorRachaTexto}>
                    Mejor racha: <Text style={estilos.mejorRachaValor}>{estadisticas.mejorRachaVictorias} victorias</Text>
                  </Text>
                )}
              </View>
            </View>

            {ultimosResultados.length > 0 && (
              <View style={estilos.tarjeta}>
                <Text style={estilos.tarjetaTitulo}>Últimos resultados</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.formaFila}>
                  {ultimosResultados.map((p, i) => {
                    const resultado = p.ganadorId === usuario.id ? 'V' : 'D';
                    const rival = p.jugadorAId === usuario.id ? p.jugadorB : p.jugadorA;
                    return (
                      <Pressable
                        key={p.id}
                        style={[
                          estilos.formaChip,
                          { backgroundColor: resultado === 'V' ? colores.exitoFondo : colores.errorFondo },
                          i === ultimosResultados.length - 1 && [
                            estilos.formaChipActual,
                            { borderColor: resultado === 'V' ? colores.exito : colores.error },
                          ],
                        ]}
                        onPress={() => router.push(`/partidos/${p.id}?volverA=${encodeURIComponent('/perfil')}`)}
                        hitSlop={4}
                      >
                        <Text style={[estilos.formaChipTexto, { color: resultado === 'V' ? colores.exito : colores.error }]}>
                          {resultado}
                        </Text>
                        <Text style={estilos.formaChipRival} numberOfLines={1}>
                          {rival?.nombre?.split(' ')[0] || '—'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={estilos.tarjeta}>
              <Text style={estilos.tarjetaTitulo}>Evolución del ranking</Text>
              <GraficoElo puntos={historialElo} />
            </View>

            {estadisticas.headToHead.length > 0 && (
              <View style={estilos.tarjeta}>
                <Text style={estilos.tarjetaTitulo}>Enfrentamientos</Text>
                {estadisticas.headToHead.slice(0, 3).map((r, i) => (
                  <View key={r.rivalId} style={[estilos.filaRival, i > 0 && estilos.filaConDivisor]}>
                    <View style={estilos.rivalCabecera}>
                      <Avatar nombre={r.rivalNombre} tamano={26} />
                      <Text style={estilos.rivalNombre}>{r.rivalNombre}</Text>
                      <Text style={estilos.rivalRecord}>
                        {r.victorias}-{r.derrotas}
                      </Text>
                    </View>
                    <BarraProporcion victorias={r.victorias} derrotas={r.derrotas} alto={5} />
                  </View>
                ))}
              </View>
            )}

            <Pressable style={estilos.enlaceCompleto} onPress={() => router.push(`/ranking/${usuario.id}?desde=perfil`)}>
              <Text style={estilos.enlaceCompletoTexto}>Ver historial de partidos</Text>
              <Ionicons name="chevron-forward" size={14} color={colores.acento} />
            </Pressable>
          </>
        )}

        {esAdmin && (
          <View style={estilos.tarjeta}>
            <Text style={estilos.tarjetaTitulo}>ADMINISTRACIÓN</Text>
            <Pressable style={estilos.filaEnlace} onPress={() => router.push('/aprobaciones')}>
              <Ionicons name="checkmark-done-outline" size={20} color={colores.navy} />
              <Text style={estilos.filaEnlaceTexto}>Por aprobar</Text>
              {totalPorAprobar > 0 && (
                <View style={estilos.contadorBadge}>
                  <Text style={estilos.contadorBadgeTexto}>{totalPorAprobar}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={colores.textoSecundario} />
            </Pressable>
            <View style={estilos.divisor} />
            <Pressable style={estilos.filaEnlace} onPress={() => router.push('/reportes')}>
              <Ionicons name="bar-chart-outline" size={20} color={colores.navy} />
              <Text style={estilos.filaEnlaceTexto}>Ver reportes</Text>
              <Ionicons name="chevron-forward" size={18} color={colores.textoSecundario} />
            </Pressable>
            <View style={estilos.divisor} />
            <Pressable style={estilos.filaEnlace} onPress={() => router.push('/auditoria')}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colores.navy} />
              <Text style={estilos.filaEnlaceTexto}>Ver log de auditoría</Text>
              <Ionicons name="chevron-forward" size={18} color={colores.textoSecundario} />
            </Pressable>
            <View style={estilos.divisor} />
            <Pressable style={estilos.filaEnlace} onPress={() => router.push('/gestionar-roles')}>
              <Ionicons name="people-outline" size={20} color={colores.navy} />
              <Text style={estilos.filaEnlaceTexto}>Gestionar roles</Text>
              <Ionicons name="chevron-forward" size={18} color={colores.textoSecundario} />
            </Pressable>
          </View>
        )}

      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.fondo },
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  filaAvatar: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  nombre: { fontSize: 20, fontWeight: '800', color: colores.textoClaro },
  correo: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  institucion: { fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  cuerpo: { paddingHorizontal: 20, marginTop: -16 },
  rolesFila: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  rolBadge: { backgroundColor: colores.tarjeta, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radios.pildora, elevation: 2 },
  rolTexto: { fontSize: 12, color: colores.navy, fontWeight: '700', textTransform: 'capitalize' },
  tarjeta: {
    backgroundColor: colores.tarjeta,
    borderRadius: radios.tarjeta,
    padding: 18,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  tarjetaTitulo: { fontSize: 11, fontWeight: '700', color: colores.textoSecundario, letterSpacing: 0.5, marginBottom: 12 },
  tarjetasElo: { flexDirection: 'row', alignItems: 'center' },
  itemElo: { flex: 1, alignItems: 'center' },
  separador: { width: 1, height: 40, backgroundColor: colores.borde },
  filaEloValor: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  eloValor: { fontSize: 30, fontWeight: '800', color: colores.texto },
  eloTendencia: { fontSize: 12, fontWeight: '800' },
  eloEtiqueta: { fontSize: 12, color: colores.textoSecundario, marginTop: 4 },
  filaEnlace: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  filaEnlaceTexto: { flex: 1, fontSize: 14, color: colores.texto, fontWeight: '600' },
  contadorBadge: { backgroundColor: colores.error, borderRadius: radios.pildora, paddingHorizontal: 8, paddingVertical: 2, marginRight: 4 },
  contadorBadgeTexto: { color: colores.textoClaro, fontSize: 11, fontWeight: '800' },
  divisor: { height: 1, backgroundColor: colores.borde },
  botonConfig: { padding: 2 },
  puntoActualizacion: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colores.error,
    borderWidth: 1.5,
    borderColor: colores.navy,
  },
  statsVacio: { color: colores.textoSecundario, fontSize: 13 },
  filaStats: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  subTarjetaStats: { flex: 1, marginBottom: 0 },
  statsRecordValor: { fontSize: 22, fontWeight: '800', color: colores.texto },
  statsRecordSub: { fontSize: 11, color: colores.textoSecundario, marginTop: 2, marginBottom: 10 },
  badgeRacha: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: radios.pildora },
  badgeRachaTexto: { fontSize: 16, fontWeight: '800' },
  mejorRachaTexto: { fontSize: 10.5, color: colores.textoSecundario, marginTop: 9 },
  mejorRachaValor: { color: colores.texto, fontWeight: '700' },
  formaFila: { flexDirection: 'row', gap: 8, paddingRight: 2 },
  formaChip: { width: 46, height: 46, borderRadius: 10, alignItems: 'center', justifyContent: 'center', gap: 1 },
  formaChipActual: { borderWidth: 2 },
  formaChipTexto: { fontWeight: '800', fontSize: 13 },
  formaChipRival: { fontSize: 8.5, fontWeight: '600', color: colores.textoSecundario, maxWidth: 40 },
  filaRival: { paddingVertical: 9 },
  filaConDivisor: { borderTopWidth: 1, borderTopColor: colores.borde },
  rivalCabecera: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 7 },
  rivalNombre: { flex: 1, fontSize: 13, fontWeight: '600', color: colores.texto },
  rivalRecord: { fontSize: 13, fontWeight: '800', color: colores.navy },
  enlaceCompleto: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colores.borde,
  },
  enlaceCompletoTexto: { fontSize: 13, fontWeight: '700', color: colores.acento },
});

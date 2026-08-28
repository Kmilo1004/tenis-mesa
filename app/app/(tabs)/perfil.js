import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, Linking, Alert } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiFetch } from '../../src/api/client';
import { useAuth } from '../../src/auth/AuthContext';
import AvisoSinConexion from '../../src/components/AvisoSinConexion';
import EncabezadoApp from '../../src/components/EncabezadoApp';
import Avatar from '../../src/components/Avatar';
import { colores, radios } from '../../src/theme/colores';
import { esVersionMasNueva } from '../../src/lib/actualizaciones';

const VERSION_ACTUAL = Constants.expoConfig?.version || '1.0.0';

export default function Perfil() {
  const { usuario, token, cargando, sinConexion, cerrarSesion } = useAuth();
  const [buscandoActualizacion, setBuscandoActualizacion] = useState(false);
  const [actualizacionDisponible, setActualizacionDisponible] = useState(null);
  const [estadisticas, setEstadisticas] = useState(null);
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

  useEffect(() => {
    buscarActualizacion({ silencioso: true });
  }, []);

  async function buscarActualizacion({ silencioso = false } = {}) {
    setBuscandoActualizacion(true);
    try {
      const datos = await apiFetch('/version');
      if (esVersionMasNueva(datos.version, VERSION_ACTUAL)) {
        setActualizacionDisponible(datos);
      } else {
        setActualizacionDisponible(null);
        if (!silencioso) {
          Alert.alert('Ya estás al día', 'Tienes instalada la última versión de la app.');
        }
      }
    } catch (err) {
      if (!silencioso) {
        Alert.alert('No se pudo buscar actualizaciones', err.message);
      }
    } finally {
      setBuscandoActualizacion(false);
    }
  }

  if (cargando || !usuario) {
    return (
      <View style={estilos.centrado}>
        <ActivityIndicator color={colores.navy} />
      </View>
    );
  }

  const esAdmin = usuario.roles?.some((r) => r.rol === 'administrador');

  async function salir() {
    await cerrarSesion();
    router.replace('/login');
  }

  return (
    <ScrollView style={estilos.contenedor} contentContainerStyle={{ paddingBottom: 40 }}>
      <EncabezadoApp>
        <View style={estilos.filaAvatar}>
          <Avatar nombre={usuario.nombre} tamano={56} />
          <View style={{ marginLeft: 14, flex: 1 }}>
            <Text style={estilos.nombre}>{usuario.nombre}</Text>
            <Text style={estilos.correo}>{usuario.correo}</Text>
            {usuario.institucion && <Text style={estilos.institucion}>{usuario.institucion}</Text>}
          </View>
        </View>
      </EncabezadoApp>

      <View style={estilos.cuerpo}>
        {sinConexion && <AvisoSinConexion />}

        {actualizacionDisponible && (
          <View style={estilos.tarjetaActualizacion}>
            <View style={estilos.filaActualizacion}>
              <Ionicons name="cloud-download-outline" size={22} color={colores.navy} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={estilos.actualizacionTitulo}>Nueva versión disponible ({actualizacionDisponible.version})</Text>
                {actualizacionDisponible.notas && <Text style={estilos.actualizacionNotas}>{actualizacionDisponible.notas}</Text>}
              </View>
            </View>
            <Pressable style={estilos.botonActualizar} onPress={() => Linking.openURL(actualizacionDisponible.url)}>
              <Text style={estilos.botonActualizarTexto}>Descargar</Text>
            </Pressable>
          </View>
        )}

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
              <Text style={estilos.eloValor}>{usuario.eloNoOficial}</Text>
              <Text style={estilos.eloEtiqueta}>Ranking</Text>
            </View>
          </View>
        </View>

        {estadisticas && (
          <View style={estilos.tarjeta}>
            <Text style={estilos.tarjetaTitulo}>MIS ESTADÍSTICAS</Text>
            {estadisticas.record.totalPartidos === 0 ? (
              <Text style={estilos.statsVacio}>Todavía no tienes partidos confirmados</Text>
            ) : (
              <>
                <View style={estilos.filaStats}>
                  <View style={estilos.subTarjetaStats}>
                    <Text style={estilos.statsMiniTitulo}>Récord</Text>
                    <Text style={estilos.statsRecordValor}>
                      {estadisticas.record.victorias}-{estadisticas.record.derrotas}
                    </Text>
                    <Text style={estilos.statsRecordSub}>
                      {estadisticas.record.totalPartidos} partidos · {estadisticas.record.porcentajeVictorias}% victorias
                    </Text>
                  </View>
                  <View style={estilos.subTarjetaStats}>
                    <Text style={estilos.statsMiniTitulo}>Racha actual</Text>
                    <View
                      style={[
                        estilos.badgeRacha,
                        { backgroundColor: estadisticas.racha.tipo === 'V' ? colores.exitoFondo : colores.errorFondo },
                      ]}
                    >
                      <Text
                        style={[
                          estilos.badgeRachaTexto,
                          { color: estadisticas.racha.tipo === 'V' ? colores.exito : colores.error },
                        ]}
                      >
                        {estadisticas.racha.cantidad}
                        {estadisticas.racha.tipo}
                      </Text>
                    </View>
                  </View>
                </View>

                {estadisticas.headToHead.length > 0 && (
                  <View style={estilos.listaRivales}>
                    {estadisticas.headToHead.slice(0, 3).map((r) => (
                      <View key={r.rivalId} style={estilos.filaRival}>
                        <Avatar nombre={r.rivalNombre} tamano={26} />
                        <Text style={estilos.rivalNombre}>{r.rivalNombre}</Text>
                        <Text style={estilos.rivalRecord}>
                          {r.victorias}-{r.derrotas}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <Pressable style={estilos.enlaceCompleto} onPress={() => router.push(`/ranking/${usuario.id}`)}>
                  <Text style={estilos.enlaceCompletoTexto}>Ver estadísticas completas</Text>
                  <Ionicons name="chevron-forward" size={14} color={colores.acento} />
                </Pressable>
              </>
            )}
          </View>
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

        <Pressable style={estilos.botonBuscarActualizacion} onPress={() => buscarActualizacion()} disabled={buscandoActualizacion}>
          {buscandoActualizacion ? (
            <ActivityIndicator color={colores.navy} size="small" />
          ) : (
            <Ionicons name="refresh-outline" size={18} color={colores.navy} />
          )}
          <Text style={estilos.botonBuscarActualizacionTexto}>Buscar actualizaciones</Text>
        </Pressable>
        <Text style={estilos.versionTexto}>Versión {VERSION_ACTUAL}</Text>
        <Text style={estilos.creditoTexto}>By Andrés Alvarez</Text>

        <Pressable style={estilos.botonSalir} onPress={salir}>
          <Ionicons name="log-out-outline" size={18} color={colores.error} />
          <Text style={estilos.botonSalirTexto}>Cerrar sesión</Text>
        </Pressable>
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
  eloValor: { fontSize: 30, fontWeight: '800', color: colores.texto },
  eloEtiqueta: { fontSize: 12, color: colores.textoSecundario, marginTop: 4 },
  filaEnlace: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  filaEnlaceTexto: { flex: 1, fontSize: 14, color: colores.texto, fontWeight: '600' },
  contadorBadge: { backgroundColor: colores.error, borderRadius: radios.pildora, paddingHorizontal: 8, paddingVertical: 2, marginRight: 4 },
  contadorBadgeTexto: { color: colores.textoClaro, fontSize: 11, fontWeight: '800' },
  divisor: { height: 1, backgroundColor: colores.borde },
  botonSalir: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 14,
  },
  botonSalirTexto: { color: colores.error, fontWeight: '700' },
  tarjetaActualizacion: {
    backgroundColor: colores.infoFondo,
    borderRadius: radios.tarjeta,
    padding: 16,
    marginBottom: 16,
  },
  filaActualizacion: { flexDirection: 'row', alignItems: 'flex-start' },
  actualizacionTitulo: { fontSize: 14, fontWeight: '700', color: colores.texto },
  actualizacionNotas: { fontSize: 12, color: colores.textoSecundario, marginTop: 4 },
  botonActualizar: {
    backgroundColor: colores.navy,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  botonActualizarTexto: { color: colores.textoClaro, fontWeight: '700' },
  botonBuscarActualizacion: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 12,
  },
  botonBuscarActualizacionTexto: { color: colores.navy, fontWeight: '600' },
  versionTexto: { textAlign: 'center', color: colores.textoSecundario, fontSize: 11, marginTop: 2 },
  creditoTexto: { textAlign: 'center', color: colores.textoSecundario, fontSize: 11, marginTop: 2 },
  statsVacio: { color: colores.textoSecundario, fontSize: 13 },
  filaStats: { flexDirection: 'row', gap: 10 },
  subTarjetaStats: { flex: 1, backgroundColor: colores.fondo, borderRadius: 14, padding: 12 },
  statsMiniTitulo: { fontSize: 10, fontWeight: '700', color: colores.textoSecundario, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 6 },
  statsRecordValor: { fontSize: 22, fontWeight: '800', color: colores.texto },
  statsRecordSub: { fontSize: 11, color: colores.textoSecundario, marginTop: 2 },
  badgeRacha: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: radios.pildora },
  badgeRachaTexto: { fontSize: 16, fontWeight: '800' },
  listaRivales: { marginTop: 14, gap: 9 },
  filaRival: { flexDirection: 'row', alignItems: 'center', gap: 9 },
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

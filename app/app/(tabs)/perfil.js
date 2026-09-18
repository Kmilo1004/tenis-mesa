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
import DetalleEstadisticasJugador from '../../src/components/DetalleEstadisticasJugador';
import { colores, radios } from '../../src/theme/colores';
import { esVersionMasNueva } from '../../src/lib/actualizaciones';

const VERSION_ACTUAL = Constants.expoConfig?.version || '1.0.0';

export default function Perfil() {
  const { usuario, token, cargando, sinConexion } = useAuth();
  const [hayActualizacion, setHayActualizacion] = useState(false);
  const [totalPorAprobar, setTotalPorAprobar] = useState(0);

  useEffect(() => {
    if (!cargando && !usuario) {
      router.replace('/login');
    }
  }, [cargando, usuario]);

  useFocusEffect(
    useCallback(() => {
      if (!usuario) return;
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

        <DetalleEstadisticasJugador usuarioId={usuario.id} rutaVolver="/perfil" />

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
});

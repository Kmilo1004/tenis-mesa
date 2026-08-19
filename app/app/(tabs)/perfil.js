import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/auth/AuthContext';
import AvisoSinConexion from '../../src/components/AvisoSinConexion';

export default function Perfil() {
  const { usuario, cargando, sinConexion, cerrarSesion } = useAuth();

  useEffect(() => {
    if (!cargando && !usuario) {
      router.replace('/login');
    }
  }, [cargando, usuario]);

  if (cargando || !usuario) {
    return (
      <View style={estilos.centrado}>
        <ActivityIndicator />
      </View>
    );
  }

  const esAdmin = usuario.roles?.some((r) => r.rol === 'administrador');

  async function salir() {
    await cerrarSesion();
    router.replace('/login');
  }

  return (
    <View style={estilos.contenedor}>
      {sinConexion && <AvisoSinConexion />}
      <Text style={estilos.nombre}>{usuario.nombre}</Text>
      <Text style={estilos.correo}>{usuario.correo}</Text>

      <View style={estilos.rolesFila}>
        {usuario.roles?.map((r) => (
          <View key={r.id} style={estilos.rolBadge}>
            <Text style={estilos.rolTexto}>{r.rol}</Text>
          </View>
        ))}
      </View>

      <View style={estilos.tarjetasElo}>
        <View style={estilos.tarjetaElo}>
          <Text style={estilos.eloEtiqueta}>Ranking Oficial</Text>
          <Text style={estilos.eloValor}>{usuario.eloOficial}</Text>
        </View>
        <View style={estilos.tarjetaElo}>
          <Text style={estilos.eloEtiqueta}>Ranking No Oficial</Text>
          <Text style={estilos.eloValor}>{usuario.eloNoOficial}</Text>
        </View>
      </View>

      {esAdmin && (
        <>
          <Pressable style={estilos.botonAuditoria} onPress={() => router.push('/reportes')}>
            <Text style={estilos.botonAuditoriaTexto}>Ver reportes</Text>
          </Pressable>
          <Pressable style={[estilos.botonAuditoria, { marginTop: 10 }]} onPress={() => router.push('/auditoria')}>
            <Text style={estilos.botonAuditoriaTexto}>Ver log de auditoría</Text>
          </Pressable>
        </>
      )}

      <Pressable style={estilos.botonSalir} onPress={salir}>
        <Text style={estilos.botonSalirTexto}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contenedor: { flex: 1, alignItems: 'center', padding: 24, paddingTop: 64, backgroundColor: '#fff' },
  nombre: { fontSize: 24, fontWeight: 'bold' },
  correo: { fontSize: 14, color: '#666', marginTop: 4 },
  rolesFila: { flexDirection: 'row', gap: 8, marginTop: 12 },
  rolBadge: { backgroundColor: '#e0e7ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  rolTexto: { fontSize: 12, color: '#3730a3', fontWeight: '600' },
  tarjetasElo: { flexDirection: 'row', gap: 12, marginTop: 32, width: '100%' },
  tarjetaElo: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12, padding: 16, alignItems: 'center' },
  eloEtiqueta: { fontSize: 12, color: '#555', marginBottom: 6, textAlign: 'center' },
  eloValor: { fontSize: 28, fontWeight: 'bold', color: '#1d4ed8' },
  botonAuditoria: { marginTop: 40, borderWidth: 1, borderColor: '#1d4ed8', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20 },
  botonAuditoriaTexto: { color: '#1d4ed8', fontWeight: '600' },
  botonSalir: { marginTop: 20, paddingVertical: 12, paddingHorizontal: 20 },
  botonSalirTexto: { color: '#dc2626', fontWeight: '600' },
});

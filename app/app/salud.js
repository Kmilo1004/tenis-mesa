import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { apiFetch } from '../src/api/client';

export default function Salud() {
  const [estado, setEstado] = useState('inactivo'); // inactivo | cargando | ok | error
  const [detalle, setDetalle] = useState(null);

  async function probarConexion() {
    setEstado('cargando');
    try {
      const datos = await apiFetch('/health');
      setDetalle(datos);
      setEstado(datos.baseDeDatos === 'ok' ? 'ok' : 'error');
    } catch (error) {
      setDetalle({ error: error.message });
      setEstado('error');
    }
  }

  return (
    <View style={estilos.contenedor}>
      <Stack.Screen options={{ title: 'Diagnóstico de conexión' }} />
      <Text style={estilos.subtitulo}>Prueba de conexión con el backend</Text>

      <Pressable style={estilos.boton} onPress={probarConexion} disabled={estado === 'cargando'}>
        {estado === 'cargando' ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={estilos.botonTexto}>Probar conexión (/health)</Text>
        )}
      </Pressable>

      {estado === 'ok' && (
        <View style={[estilos.tarjeta, estilos.tarjetaOk]}>
          <Text style={estilos.tarjetaTitulo}>✅ Servidor y base de datos conectados</Text>
          <Text style={estilos.tarjetaTexto}>{JSON.stringify(detalle, null, 2)}</Text>
        </View>
      )}

      {estado === 'error' && (
        <View style={[estilos.tarjeta, estilos.tarjetaError]}>
          <Text style={estilos.tarjetaTitulo}>❌ No se pudo conectar</Text>
          <Text style={estilos.tarjetaTexto}>{JSON.stringify(detalle, null, 2)}</Text>
          <Text style={estilos.ayuda}>
            Revisa que el backend esté corriendo (`npm run dev` en /backend) y que tu celular esté en la misma
            red WiFi que tu computador. La URL configurada está en src/api/config.js.
          </Text>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
    backgroundColor: '#fff',
  },
  subtitulo: { fontSize: 14, color: '#666', marginBottom: 16, textAlign: 'center' },
  boton: {
    backgroundColor: '#0B1E4D',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  botonTexto: { color: '#fff', fontWeight: '600' },
  tarjeta: { marginTop: 24, padding: 16, borderRadius: 8, width: '100%' },
  tarjetaOk: { backgroundColor: '#dcfce7' },
  tarjetaError: { backgroundColor: '#fee2e2' },
  tarjetaTitulo: { fontWeight: '600', marginBottom: 8 },
  tarjetaTexto: { fontFamily: 'monospace', fontSize: 12 },
  ayuda: { marginTop: 12, fontSize: 12, color: '#555' },
});

import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, ActivityIndicator, Linking } from 'react-native';
import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiFetch } from '../api/client';
import { esVersionMasNueva } from '../lib/actualizaciones';
import { descargarEInstalarApk } from '../lib/actualizarApk';
import { colores } from '../theme/colores';

const VERSION_ACTUAL = Constants.expoConfig?.version || '1.0.0';

// Aviso no bloqueante: se puede cerrar y seguir usando la app con normalidad. Se puede cerrar y
// aparece de nuevo la próxima vez que se abra la app, mientras siga desactualizada.
export default function AvisoActualizacion() {
  const [info, setInfo] = useState(null);
  const [visible, setVisible] = useState(false);
  const [instalando, setInstalando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch('/version')
      .then((datos) => {
        if (esVersionMasNueva(datos.version, VERSION_ACTUAL)) {
          setInfo(datos);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  async function actualizar() {
    if (Platform.OS !== 'android') {
      Linking.openURL(info.url);
      return;
    }
    setError(null);
    setInstalando(true);
    setProgreso(0);
    try {
      await descargarEInstalarApk(info.url, setProgreso);
    } catch (err) {
      setError(err.message);
    } finally {
      setInstalando(false);
    }
  }

  if (!visible || !info) return null;

  return (
    <View style={estilos.banner}>
      <Ionicons name="cloud-download-outline" size={18} color={colores.textoClaro} />
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={estilos.texto} numberOfLines={1}>
          {instalando ? `Descargando… ${Math.round(progreso * 100)}%` : `Nueva versión disponible (${info.version})`}
        </Text>
        {error && (
          <Text style={estilos.error} numberOfLines={1}>
            {error}
          </Text>
        )}
      </View>
      {instalando ? (
        <ActivityIndicator color={colores.textoClaro} size="small" />
      ) : (
        <>
          <Pressable style={estilos.botonActualizar} onPress={actualizar}>
            <Text style={estilos.botonActualizarTexto}>Actualizar</Text>
          </Pressable>
          <Pressable onPress={() => setVisible(false)} hitSlop={8} style={estilos.cerrar}>
            <Ionicons name="close" size={18} color={colores.textoClaro} />
          </Pressable>
        </>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colores.navy,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  texto: { color: colores.textoClaro, fontSize: 12, fontWeight: '600' },
  error: { color: '#ffb4b4', fontSize: 11, marginTop: 2 },
  botonActualizar: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  botonActualizarTexto: { color: colores.textoClaro, fontWeight: '700', fontSize: 12 },
  cerrar: { marginLeft: 8 },
});

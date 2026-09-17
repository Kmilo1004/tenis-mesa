import { useState } from 'react';
import { Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { apiFetch } from '../../../src/api/client';
import { useAuth } from '../../../src/auth/AuthContext';
import SelectorJugador from '../../../src/components/SelectorJugador';
import { colores, radios } from '../../../src/theme/colores';

export default function NuevoDesafio() {
  const { usuario, token } = useAuth();
  const [rival, setRival] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function enviar() {
    if (!rival) return;
    setError(null);
    setEnviando(true);
    try {
      const partido = await apiFetch('/partidos/desafios', {
        method: 'POST',
        token,
        body: JSON.stringify({ jugadorBId: rival.id }),
      });
      router.replace(`/partidos/${partido.id}`);
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenedor}>
      <View style={estilos.tarjeta}>
        <Text style={estilos.etiqueta}>¿A quién desafías?</Text>
        <SelectorJugador etiqueta="Rival" valor={rival} onSeleccionar={setRival} excluirId={usuario?.id} token={token} />
      </View>

      <Text style={estilos.explicacion}>
        Tu rival recibe una notificación y tiene 24 horas para aceptar el desafío antes de que se elimine solo. Una vez
        acepte, cualquiera de los dos puede ir agregando el resultado de cada set a medida que termine, y dejar un análisis
        opcional (privado) sobre cada uno.
      </Text>

      {error && <Text style={estilos.error}>{error}</Text>}

      <Pressable style={[estilos.boton, (!rival || enviando) && estilos.botonDeshabilitado]} onPress={enviar} disabled={!rival || enviando}>
        {enviando ? <ActivityIndicator color={colores.textoClaro} /> : <Text style={estilos.botonTexto}>Mandar desafío</Text>}
      </Pressable>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: 16, paddingBottom: 48, backgroundColor: colores.fondo, flexGrow: 1 },
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
  etiqueta: { fontSize: 13, color: colores.textoSecundario, marginBottom: 10, fontWeight: '600' },
  explicacion: { fontSize: 12, color: colores.textoSecundario, marginBottom: 16, lineHeight: 18 },
  error: { color: colores.error, marginTop: 4, marginBottom: 8, textAlign: 'center' },
  boton: { backgroundColor: colores.navy, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  botonDeshabilitado: { opacity: 0.5 },
  botonTexto: { color: colores.textoClaro, fontWeight: '700' },
});

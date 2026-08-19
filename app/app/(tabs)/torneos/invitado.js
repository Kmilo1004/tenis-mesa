import { useState } from 'react';
import { Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '../../../src/api/client';
import { useAuth } from '../../../src/auth/AuthContext';
import CampoTexto from '../../../src/components/CampoTexto';

export default function AgregarInvitado() {
  const { torneoId } = useLocalSearchParams();
  const { token } = useAuth();

  const [nombre, setNombre] = useState('');
  const [procedencia, setProcedencia] = useState('');
  const [consiente, setConsiente] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const listo = nombre.trim() && consiente;

  async function enviar() {
    setError(null);
    setEnviando(true);
    try {
      const invitado = await apiFetch('/usuarios/externos', {
        method: 'POST',
        token,
        body: JSON.stringify({
          nombre: nombre.trim(),
          procedencia: procedencia.trim() || undefined,
          consentimientoDatos: true,
        }),
      });

      await apiFetch(`/torneos/${torneoId}/inscripciones/manual`, {
        method: 'POST',
        token,
        body: JSON.stringify({ usuarioId: invitado.id }),
      });

      router.back();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={estilos.contenedor}>
        <Text style={estilos.subtitulo}>
          Crea un perfil ligero para un jugador invitado (sin correo ni contraseña) y lo inscribe en este torneo.
        </Text>

        <CampoTexto etiqueta="Nombre completo" placeholder="Nombre del invitado" value={nombre} onChangeText={setNombre} />
        <CampoTexto
          etiqueta="Procedencia (opcional)"
          placeholder="Universidad, club, ciudad..."
          value={procedencia}
          onChangeText={setProcedencia}
        />

        <Pressable style={estilos.filaConsentimiento} onPress={() => setConsiente((v) => !v)}>
          <View style={[estilos.checkbox, consiente && estilos.checkboxMarcado]}>
            {consiente && <Text style={estilos.checkboxMarca}>✓</Text>}
          </View>
          <Text style={estilos.textoConsentimiento}>
            El invitado dio su consentimiento explícito para almacenar sus datos (Ley 1581 de 2012)
          </Text>
        </Pressable>

        {error && <Text style={estilos.error}>{error}</Text>}

        <Pressable style={estilos.boton} onPress={enviar} disabled={!listo || enviando}>
          {enviando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.botonTexto}>Agregar e inscribir</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: 20, paddingBottom: 48 },
  subtitulo: { fontSize: 13, color: '#666', marginBottom: 20 },
  filaConsentimiento: { flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 8 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#999',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  checkboxMarcado: { backgroundColor: '#1d4ed8', borderColor: '#1d4ed8' },
  checkboxMarca: { color: '#fff', fontSize: 14, fontWeight: '700' },
  textoConsentimiento: { flex: 1, fontSize: 13, color: '#444' },
  error: { color: '#dc2626', marginTop: 8, textAlign: 'center' },
  boton: { backgroundColor: '#1d4ed8', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  botonTexto: { color: '#fff', fontWeight: '700' },
});

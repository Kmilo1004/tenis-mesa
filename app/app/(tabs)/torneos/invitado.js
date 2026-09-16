import { useState } from 'react';
import { Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '../../../src/api/client';
import { useAuth } from '../../../src/auth/AuthContext';
import CampoTexto from '../../../src/components/CampoTexto';
import SelectorOpciones from '../../../src/components/SelectorOpciones';
import { NIVELES_OPCIONES } from '../../../src/lib/niveles';

export default function AgregarInvitado() {
  const { torneoId } = useLocalSearchParams();
  const { token } = useAuth();

  const [nombre, setNombre] = useState('');
  const [procedencia, setProcedencia] = useState('');
  const [nivel, setNivel] = useState('precompetitivo');

  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const listo = nombre.trim();

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
          nivel,
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
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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
        <SelectorOpciones etiqueta="Nivel del jugador" opciones={NIVELES_OPCIONES} valor={nivel} onCambiar={setNivel} />

        {error && <Text style={estilos.error}>{error}</Text>}

        <Pressable style={[estilos.boton, (!listo || enviando) && estilos.botonDeshabilitado]} onPress={enviar} disabled={!listo || enviando}>
          {enviando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.botonTexto}>Agregar e inscribir</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { padding: 20, paddingBottom: 48 },
  subtitulo: { fontSize: 13, color: '#666', marginBottom: 20 },
  error: { color: '#dc2626', marginTop: 8, textAlign: 'center' },
  boton: { backgroundColor: '#0B1E4D', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  botonDeshabilitado: { opacity: 0.5 },
  botonTexto: { color: '#fff', fontWeight: '700' },
});

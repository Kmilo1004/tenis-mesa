import { useState } from 'react';
import { Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, Stack } from 'expo-router';
import { apiFetch } from '../src/api/client';
import CampoTexto from '../src/components/CampoTexto';
import { colores } from '../src/theme/colores';

export default function OlvidePassword() {
  const [correo, setCorreo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [enviado, setEnviado] = useState(false);

  async function enviar() {
    setError(null);
    setEnviando(true);
    try {
      await apiFetch('/auth/olvide-password', { method: 'POST', body: JSON.stringify({ correo: correo.trim() }) });
      setEnviado(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={estilos.contenedor}>
        <Stack.Screen options={{ title: 'Recuperar contraseña' }} />

        {enviado ? (
          <>
            <Text style={estilos.titulo}>Revisa tu correo</Text>
            <Text style={estilos.subtitulo}>
              Si {correo.trim()} está registrado, te llegará un enlace para elegir una contraseña nueva. Puede tardar unos minutos —
              revisa también spam.
            </Text>
          </>
        ) : (
          <>
            <Text style={estilos.titulo}>Recuperar contraseña</Text>
            <Text style={estilos.subtitulo}>Escribe tu correo y te mandamos un enlace para elegir una nueva.</Text>

            <CampoTexto
              etiqueta="Correo"
              placeholder="tucorreo@universidad.edu"
              autoCapitalize="none"
              keyboardType="email-address"
              value={correo}
              onChangeText={setCorreo}
            />

            {error && <Text style={estilos.error}>{error}</Text>}

            <Pressable
              style={[estilos.boton, (enviando || !correo.trim()) && estilos.botonDeshabilitado]}
              onPress={enviar}
              disabled={enviando || !correo.trim()}
            >
              {enviando ? <ActivityIndicator color={colores.textoClaro} /> : <Text style={estilos.botonTexto}>Enviar enlace</Text>}
            </Pressable>
          </>
        )}

        <Link href="/login" style={estilos.enlace}>
          Volver a iniciar sesión
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colores.fondo },
  titulo: { fontSize: 24, fontWeight: '800', color: colores.texto, marginBottom: 4, textAlign: 'center' },
  subtitulo: { fontSize: 13, color: colores.textoSecundario, marginBottom: 20, textAlign: 'center' },
  boton: { backgroundColor: colores.navy, paddingVertical: 14, borderRadius: 10, width: '100%', alignItems: 'center', marginTop: 8 },
  botonDeshabilitado: { opacity: 0.5 },
  botonTexto: { color: colores.textoClaro, fontWeight: '700' },
  error: { color: colores.error, marginBottom: 8, textAlign: 'center' },
  enlace: { marginTop: 20, color: colores.navy, fontWeight: '600' },
});

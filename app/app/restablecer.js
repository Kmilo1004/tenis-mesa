import { useState } from 'react';
import { Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '../src/api/client';
import CampoTexto from '../src/components/CampoTexto';
import { colores } from '../src/theme/colores';

export default function Restablecer() {
  const { token } = useLocalSearchParams();
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [completado, setCompletado] = useState(false);

  const puedeEnviar = password.length >= 8 && password === confirmar;

  async function enviar() {
    setError(null);
    setEnviando(true);
    try {
      await apiFetch('/auth/restablecer-password', { method: 'POST', body: JSON.stringify({ token, password }) });
      setCompletado(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  if (!token) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={estilos.contenedor}>
          <Stack.Screen options={{ title: 'Restablecer contraseña' }} />
          <Text style={estilos.titulo}>Enlace incompleto</Text>
          <Text style={estilos.subtitulo}>Abre este enlace directamente desde el correo de recuperación que te enviamos.</Text>
          <Link href="/login" style={estilos.enlace}>
            Volver a iniciar sesión
          </Link>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={estilos.contenedor}>
        <Stack.Screen options={{ title: 'Restablecer contraseña' }} />

        {completado ? (
          <>
            <Text style={estilos.titulo}>Contraseña actualizada</Text>
            <Text style={estilos.subtitulo}>Ya puedes iniciar sesión con tu contraseña nueva.</Text>
          </>
        ) : (
          <>
            <Text style={estilos.titulo}>Elige una contraseña nueva</Text>

            <CampoTexto
              etiqueta="Contraseña nueva (mínimo 8 caracteres)"
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
            <CampoTexto etiqueta="Confirmar contraseña" placeholder="••••••••" secureTextEntry value={confirmar} onChangeText={setConfirmar} />

            {error && <Text style={estilos.error}>{error}</Text>}

            <Pressable style={[estilos.boton, (enviando || !puedeEnviar) && estilos.botonDeshabilitado]} onPress={enviar} disabled={enviando || !puedeEnviar}>
              {enviando ? <ActivityIndicator color={colores.textoClaro} /> : <Text style={estilos.botonTexto}>Guardar contraseña</Text>}
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

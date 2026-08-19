import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, router, Stack } from 'expo-router';
import { useAuth } from '../src/auth/AuthContext';
import CampoTexto from '../src/components/CampoTexto';

export default function Login() {
  const { iniciarSesion } = useAuth();
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  async function enviar() {
    setError(null);
    setEnviando(true);
    try {
      await iniciarSesion(correo.trim(), password);
      router.replace('/perfil');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={estilos.contenedor} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={estilos.titulo}>Tenis de Mesa</Text>
      <Text style={estilos.subtitulo}>Inicia sesión con tu correo institucional</Text>

      <CampoTexto
        etiqueta="Correo"
        placeholder="tucorreo@universidad.edu"
        autoCapitalize="none"
        keyboardType="email-address"
        value={correo}
        onChangeText={setCorreo}
      />
      <CampoTexto etiqueta="Contraseña" placeholder="••••••••" secureTextEntry value={password} onChangeText={setPassword} />

      {error && <Text style={estilos.error}>{error}</Text>}

      <Pressable style={estilos.boton} onPress={enviar} disabled={enviando || !correo || !password}>
        {enviando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.botonTexto}>Iniciar sesión</Text>}
      </Pressable>

      <Link href="/registro" style={estilos.enlace}>
        ¿No tienes cuenta? Regístrate
      </Link>
      <Link href="/salud" style={estilos.enlaceSecundario}>
        ¿Problemas de conexión?
      </Link>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  titulo: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  subtitulo: { fontSize: 14, color: '#666', marginBottom: 24, textAlign: 'center' },
  boton: { backgroundColor: '#1d4ed8', paddingVertical: 14, borderRadius: 8, width: '100%', alignItems: 'center', marginTop: 8 },
  botonTexto: { color: '#fff', fontWeight: '600' },
  error: { color: '#dc2626', marginBottom: 8, textAlign: 'center' },
  enlace: { marginTop: 20, color: '#1d4ed8', fontWeight: '600' },
  enlaceSecundario: { marginTop: 12, color: '#888', fontSize: 12 },
});

import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Link, router, Stack } from 'expo-router';
import { useAuth } from '../src/auth/AuthContext';
import CampoTexto from '../src/components/CampoTexto';

export default function Registro() {
  const { registrarse } = useAuth();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [programaFacultad, setProgramaFacultad] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const listo = nombre && correo && password.length >= 8;

  async function enviar() {
    setError(null);
    setEnviando(true);
    try {
      await registrarse({
        nombre: nombre.trim(),
        correo: correo.trim(),
        password,
        tipo: 'interno',
        programaFacultad: programaFacultad.trim() || undefined,
      });
      router.replace('/perfil');
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={estilos.contenedor}>
        <Stack.Screen options={{ title: 'Crear cuenta' }} />
        <Text style={estilos.titulo}>Crear cuenta</Text>
        <Text style={estilos.subtitulo}>Solo para estudiantes y profesores con correo institucional</Text>

        <CampoTexto etiqueta="Nombre completo" placeholder="Sharith Osorio" value={nombre} onChangeText={setNombre} />
        <CampoTexto
          etiqueta="Correo institucional"
          placeholder="tucorreo@universidad.edu"
          autoCapitalize="none"
          keyboardType="email-address"
          value={correo}
          onChangeText={setCorreo}
        />
        <CampoTexto
          etiqueta="Contraseña (mínimo 8 caracteres)"
          placeholder="••••••••"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <CampoTexto
          etiqueta="Programa o facultad (opcional)"
          placeholder="Ingeniería de Sistemas"
          value={programaFacultad}
          onChangeText={setProgramaFacultad}
        />

        {error && <Text style={estilos.error}>{error}</Text>}

        <Pressable style={estilos.boton} onPress={enviar} disabled={enviando || !listo}>
          {enviando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.botonTexto}>Crear cuenta</Text>}
        </Pressable>

        <Link href="/login" style={estilos.enlace}>
          ¿Ya tienes cuenta? Inicia sesión
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  titulo: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  subtitulo: { fontSize: 13, color: '#666', marginBottom: 20, textAlign: 'center' },
  boton: { backgroundColor: '#1d4ed8', paddingVertical: 14, borderRadius: 8, width: '100%', alignItems: 'center', marginTop: 8 },
  botonTexto: { color: '#fff', fontWeight: '600' },
  error: { color: '#dc2626', marginBottom: 8, textAlign: 'center' },
  enlace: { marginTop: 20, color: '#1d4ed8', fontWeight: '600' },
});

import { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router, Stack } from 'expo-router';
import { useAuth } from '../src/auth/AuthContext';
import CampoTexto from '../src/components/CampoTexto';
import { colores, radios } from '../src/theme/colores';

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
    <KeyboardAvoidingView style={estilos.fondo} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={estilos.contenedor}>
        <Image source={require('../assets/Logo.jpeg')} style={estilos.logo} />
        <Text style={estilos.marca}>TM UNIMAG</Text>
        <Text style={estilos.eslogan}>Ranking de tenis de mesa</Text>

        <View style={estilos.tarjeta}>
          <Text style={estilos.titulo}>Iniciar sesión</Text>
          <Text style={estilos.subtitulo}>Con tu correo institucional</Text>

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
            {enviando ? <ActivityIndicator color={colores.textoClaro} /> : <Text style={estilos.botonTexto}>Iniciar sesión</Text>}
          </Pressable>

          <Link href="/registro" style={estilos.enlace}>
            ¿No tienes cuenta? Regístrate
          </Link>
          <Link href="/salud" style={estilos.enlaceSecundario}>
            ¿Problemas de conexión?
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: colores.navy },
  contenedor: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { width: 88, height: 88, borderRadius: 44, marginBottom: 12 },
  marca: { color: colores.textoClaro, fontSize: 30, fontWeight: '800', letterSpacing: 1 },
  eslogan: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4, marginBottom: 32 },
  tarjeta: { backgroundColor: colores.tarjeta, borderRadius: radios.tarjeta, padding: 24, width: '100%' },
  titulo: { fontSize: 20, fontWeight: '800', color: colores.texto, marginBottom: 2 },
  subtitulo: { fontSize: 13, color: colores.textoSecundario, marginBottom: 20 },
  boton: { backgroundColor: colores.navy, paddingVertical: 14, borderRadius: 10, width: '100%', alignItems: 'center', marginTop: 8 },
  botonTexto: { color: colores.textoClaro, fontWeight: '700' },
  error: { color: colores.error, marginBottom: 8, textAlign: 'center' },
  enlace: { marginTop: 20, color: colores.navy, fontWeight: '600', textAlign: 'center' },
  enlaceSecundario: { marginTop: 12, color: colores.textoSecundario, fontSize: 12, textAlign: 'center' },
});

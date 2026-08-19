import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/auth/AuthContext';

export default function Arranque() {
  const { cargando, usuario } = useAuth();

  useEffect(() => {
    if (!cargando) {
      router.replace(usuario ? '/perfil' : '/login');
    }
  }, [cargando, usuario]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Stack.Screen options={{ headerShown: false }} />
      <ActivityIndicator />
    </View>
  );
}

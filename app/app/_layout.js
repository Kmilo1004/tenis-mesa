import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/auth/AuthContext';
import { colores } from '../src/theme/colores';

export default function LayoutRaiz() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack
          screenOptions={{
            headerTitleAlign: 'center',
            headerStyle: { backgroundColor: colores.navy },
            headerTintColor: colores.textoClaro,
            headerTitleStyle: { fontWeight: '700' },
            contentStyle: { backgroundColor: colores.fondo },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

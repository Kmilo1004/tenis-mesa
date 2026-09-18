import { View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../src/auth/AuthContext';
import MarcoResponsivo from '../src/components/MarcoResponsivo';
import AvisoActualizacion from '../src/components/AvisoActualizacion';
import { colores } from '../src/theme/colores';

export default function LayoutRaiz() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MarcoResponsivo>
          <View style={{ flex: 1 }}>
            <AvisoActualizacion />
            <Stack
              screenOptions={{
                headerTitleAlign: 'center',
                headerStyle: { backgroundColor: colores.navy },
                headerTintColor: colores.textoClaro,
                headerTitleStyle: { fontWeight: '700' },
                contentStyle: { backgroundColor: colores.fondo },
                animation: 'slide_from_right',
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          </View>
        </MarcoResponsivo>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

import { Stack } from 'expo-router';
import { colores } from '../../../src/theme/colores';

export default function LayoutRanking() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        headerStyle: { backgroundColor: colores.navy },
        headerTintColor: colores.textoClaro,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colores.fondo },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ title: 'Jugador' }} />
    </Stack>
  );
}

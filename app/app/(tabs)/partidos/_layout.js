import { Stack } from 'expo-router';
import { colores } from '../../../src/theme/colores';

export default function LayoutPartidos() {
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
      <Stack.Screen name="nuevo" options={{ title: 'Registrar partido', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle del partido' }} />
    </Stack>
  );
}

import { Stack } from 'expo-router';
import { colores } from '../../../src/theme/colores';

export default function LayoutTorneos() {
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
      <Stack.Screen name="nuevo" options={{ title: 'Nuevo torneo', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Torneo' }} />
      <Stack.Screen name="invitado" options={{ title: 'Agregar invitado', presentation: 'modal' }} />
    </Stack>
  );
}

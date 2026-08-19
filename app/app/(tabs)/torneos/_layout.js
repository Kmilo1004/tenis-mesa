import { Stack } from 'expo-router';

export default function LayoutTorneos() {
  return (
    <Stack screenOptions={{ headerTitleAlign: 'center' }}>
      <Stack.Screen name="index" options={{ title: 'Torneos' }} />
      <Stack.Screen name="nuevo" options={{ title: 'Nuevo torneo', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Torneo' }} />
      <Stack.Screen name="invitado" options={{ title: 'Agregar invitado', presentation: 'modal' }} />
    </Stack>
  );
}

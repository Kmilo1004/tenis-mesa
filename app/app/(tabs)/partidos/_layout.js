import { Stack } from 'expo-router';

export default function LayoutPartidos() {
  return (
    <Stack screenOptions={{ headerTitleAlign: 'center' }}>
      <Stack.Screen name="index" options={{ title: 'Partidos' }} />
      <Stack.Screen name="nuevo" options={{ title: 'Registrar partido', presentation: 'modal' }} />
      <Stack.Screen name="[id]" options={{ title: 'Detalle del partido' }} />
    </Stack>
  );
}

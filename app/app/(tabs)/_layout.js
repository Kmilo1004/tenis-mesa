import { Tabs } from 'expo-router';

export default function LayoutTabs() {
  return (
    <Tabs screenOptions={{ headerTitleAlign: 'center' }}>
      <Tabs.Screen name="perfil" options={{ title: 'Perfil' }} />
      <Tabs.Screen name="partidos" options={{ title: 'Partidos', headerShown: false }} />
      <Tabs.Screen name="torneos" options={{ title: 'Torneos', headerShown: false }} />
      <Tabs.Screen name="ranking" options={{ title: 'Ranking' }} />
      <Tabs.Screen name="notificaciones" options={{ title: 'Notificaciones' }} />
    </Tabs>
  );
}

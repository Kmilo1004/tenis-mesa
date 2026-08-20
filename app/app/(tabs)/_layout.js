import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colores } from '../../src/theme/colores';

function icono(nombre) {
  return ({ focused, color, size }) => <Ionicons name={focused ? nombre : `${nombre}-outline`} size={size} color={color} />;
}

export default function LayoutTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colores.navy,
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: { borderTopColor: colores.borde },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: icono('person') }} />
      <Tabs.Screen name="partidos" options={{ title: 'Partidos', tabBarIcon: icono('flash') }} />
      <Tabs.Screen name="torneos" options={{ title: 'Torneos', tabBarIcon: icono('trophy') }} />
      <Tabs.Screen name="ranking" options={{ title: 'Ranking', tabBarIcon: icono('people') }} />
      <Tabs.Screen name="notificaciones" options={{ title: 'Avisos', tabBarIcon: icono('notifications') }} />
    </Tabs>
  );
}

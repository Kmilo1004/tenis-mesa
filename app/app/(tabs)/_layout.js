import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { colores } from '../../src/theme/colores';

// Un pequeño "pop" de escala al enfocar la pestaña, en vez del cambio seco de ícono.
function IconoTab({ nombre, focused, color, size }) {
  const escala = useRef(new Animated.Value(focused ? 1.12 : 1)).current;

  useEffect(() => {
    Animated.spring(escala, {
      toValue: focused ? 1.12 : 1,
      useNativeDriver: true,
      speed: 18,
      bounciness: 10,
    }).start();
  }, [focused, escala]);

  return (
    <Animated.View style={{ transform: [{ scale: escala }] }}>
      <Ionicons name={focused ? nombre : `${nombre}-outline`} size={size} color={color} />
    </Animated.View>
  );
}

function icono(nombre) {
  return ({ focused, color, size }) => <IconoTab nombre={nombre} focused={focused} color={color} size={size} />;
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

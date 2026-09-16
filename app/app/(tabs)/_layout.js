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

// Al tocar un botón de la barra inferior, siempre lleva a la pantalla principal de esa pestaña
// (la lista, no donde se haya quedado navegando la última vez) — tanto si ya estabas ahí como si
// vienes de otra pestaña. Por defecto, React Navigation solo resetea la pestaña ya enfocada; esto
// también resetea al cambiar de pestaña.
function reiniciarAlTocar({ navigation, route }) {
  return {
    tabPress: (e) => {
      const estado = navigation.getState();
      const indiceTab = estado.routes.findIndex((r) => r.name === route.name);
      const rutaTab = estado.routes[indiceTab];
      if (rutaTab?.state && rutaTab.state.index > 0) {
        e.preventDefault();
        navigation.reset({
          ...estado,
          index: indiceTab,
          routes: estado.routes.map((r, i) => (i === indiceTab ? { ...r, state: undefined } : r)),
        });
      }
    },
  };
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
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: icono('person') }} listeners={reiniciarAlTocar} />
      <Tabs.Screen name="partidos" options={{ title: 'Partidos', tabBarIcon: icono('flash') }} listeners={reiniciarAlTocar} />
      <Tabs.Screen name="torneos" options={{ title: 'Torneos', tabBarIcon: icono('trophy') }} listeners={reiniciarAlTocar} />
      <Tabs.Screen name="ranking" options={{ title: 'Ranking', tabBarIcon: icono('people') }} listeners={reiniciarAlTocar} />
      <Tabs.Screen
        name="notificaciones"
        options={{ title: 'Avisos', tabBarIcon: icono('notifications') }}
        listeners={reiniciarAlTocar}
      />
    </Tabs>
  );
}

import { useEffect, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiFetch } from '../../../src/api/client';
import { useAuth } from '../../../src/auth/AuthContext';
import Avatar from '../../../src/components/Avatar';
import EtiquetaNivel from '../../../src/components/EtiquetaNivel';
import DetalleEstadisticasJugador from '../../../src/components/DetalleEstadisticasJugador';
import { colores } from '../../../src/theme/colores';

export default function PerfilJugador() {
  const { id } = useLocalSearchParams();
  const { token } = useAuth();

  const [usuario, setUsuario] = useState(null);
  const [mostrarNivel, setMostrarNivel] = useState(false);

  useEffect(() => {
    if (!token) return;
    apiFetch(`/usuarios/${id}/estadisticas`, { token })
      .then((datos) => setUsuario(datos.usuario))
      .catch(() => {
        // no es crítico: si falla, el encabezado simplemente no muestra el avatar todavía
      });
    apiFetch('/configuracion', { token })
      .then((datos) => setMostrarNivel(datos.mostrarNivelEnRanking))
      .catch(() => {
        // no es crítico: si falla, simplemente no se muestra la etiqueta
      });
  }, [id, token]);

  const botonVolver = () => (
    <Pressable onPress={() => router.back()} hitSlop={10} style={{ paddingRight: 12 }}>
      <Ionicons name="arrow-back" size={22} color={colores.textoClaro} />
    </Pressable>
  );

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, backgroundColor: colores.fondo }}>
      <Stack.Screen options={{ title: usuario?.nombre || 'Jugador', headerLeft: botonVolver }} />

      <View style={{ alignItems: 'center', marginBottom: 16, marginTop: 8 }}>
        <Avatar nombre={usuario?.nombre} avatarSeed={usuario?.avatarSeed} avatarEstilo={usuario?.avatarEstilo} tamano={64} />
        {mostrarNivel && usuario?.nivel && (
          <View style={{ marginTop: 6 }}>
            <EtiquetaNivel nivel={usuario.nivel} />
          </View>
        )}
      </View>

      <DetalleEstadisticasJugador
        usuarioId={id}
        rutaVolver={`/ranking/${id}`}
        mensajeSinPartidos="Este jugador todavía no tiene partidos confirmados"
        mensajeVacioGrafico="Todavía no hay suficientes partidos para ver la evolución"
        sufijoDeltaGrafico="desde el partido anterior"
      />
    </ScrollView>
  );
}

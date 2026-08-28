import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { router, Stack, useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiFetch } from '../src/api/client';
import { useAuth } from '../src/auth/AuthContext';
import { colores, radios } from '../src/theme/colores';

const MOTIVOS_TEXTO = {
  marcador_incorrecto: 'El marcador es incorrecto',
  no_jugado: 'Este partido no se jugó',
  rival_equivocado: 'El rival está equivocado',
};

function nombrePartido(p) {
  return `${p.jugadorA?.nombre || 'Por definir'} vs ${p.jugadorB?.nombre || 'Por definir'}`;
}

export default function Aprobaciones() {
  const { token } = useAuth();
  const [porAprobar, setPorAprobar] = useState([]);
  const [enDisputa, setEnDisputa] = useState([]);
  const [descartados, setDescartados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [aprobar, disputa, vencidos] = await Promise.all([
        apiFetch('/partidos?estado=pendiente_aprobacion', { token }),
        apiFetch('/partidos?estado=en_revision', { token }),
        apiFetch('/partidos?estado=descartado', { token }),
      ]);
      setPorAprobar(aprobar);
      setEnDisputa(disputa);
      setDescartados(vencidos.filter((p) => p.tipoPartido === 'casual'));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  const totalPendientes = porAprobar.length + enDisputa.length + descartados.length;

  return (
    <ScrollView style={estilos.contenedor} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
      <Stack.Screen options={{ title: 'Por aprobar' }} />

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colores.navy} />
      ) : error ? (
        <Text style={estilos.error}>{error}</Text>
      ) : totalPendientes === 0 ? (
        <View style={estilos.vacioContenedor}>
          <Ionicons name="checkmark-circle-outline" size={40} color={colores.exito} />
          <Text style={estilos.vacioTexto}>Todo al día — no hay nada pendiente</Text>
        </View>
      ) : (
        <>
          <Seccion
            titulo="Resultados de torneo por aprobar"
            icono="trophy-outline"
            items={porAprobar}
            render={(p) => (
              <>
                <Text style={estilos.itemTitulo}>{nombrePartido(p)}</Text>
                <Text style={estilos.itemDetalle}>
                  {p.ronda || 'Fase de grupos'} · reportado por {p.reportador?.nombre || 'un jugador'}
                </Text>
              </>
            )}
            colorBadge={colores.advertencia}
            fondoBadge={colores.advertenciaFondo}
            textoBadge="Por aprobar"
          />

          <Seccion
            titulo="Partidos casuales en disputa"
            icono="alert-circle-outline"
            items={enDisputa}
            render={(p) => (
              <>
                <Text style={estilos.itemTitulo}>{nombrePartido(p)}</Text>
                <Text style={estilos.itemDetalle}>{MOTIVOS_TEXTO[p.motivoDisputa] || p.motivoDisputa}</Text>
              </>
            )}
            colorBadge={colores.info}
            fondoBadge={colores.infoFondo}
            textoBadge="En disputa"
          />

          <Seccion
            titulo="Partidos casuales vencidos sin confirmar"
            icono="time-outline"
            items={descartados}
            render={(p) => (
              <>
                <Text style={estilos.itemTitulo}>{nombrePartido(p)}</Text>
                <Text style={estilos.itemDetalle}>{new Date(p.fechaPartido).toLocaleDateString('es-CO')} · se puede rescatar</Text>
              </>
            )}
            colorBadge={colores.textoSecundario}
            fondoBadge={colores.gris}
            textoBadge="Descartado"
          />
        </>
      )}
    </ScrollView>
  );
}

function Seccion({ titulo, icono, items, render, colorBadge, fondoBadge, textoBadge }) {
  if (items.length === 0) return null;

  return (
    <View style={estilos.seccion}>
      <View style={estilos.seccionEncabezado}>
        <Ionicons name={icono} size={16} color={colores.navy} />
        <Text style={estilos.seccionTitulo}>
          {titulo} ({items.length})
        </Text>
      </View>
      {items.map((p) => (
        <Pressable key={p.id} style={estilos.item} onPress={() => router.push(`/partidos/${p.id}`)}>
          <View style={{ flex: 1 }}>{render(p)}</View>
          <View style={[estilos.badge, { backgroundColor: fondoBadge }]}>
            <Text style={[estilos.badgeTexto, { color: colorBadge }]}>{textoBadge}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colores.textoSecundario} />
        </Pressable>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  error: { color: colores.error, textAlign: 'center', marginTop: 24 },
  vacioContenedor: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 12 },
  vacioTexto: { color: colores.textoSecundario, fontSize: 14 },
  seccion: { marginBottom: 24 },
  seccionEncabezado: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  seccionTitulo: { fontSize: 13, fontWeight: '700', color: colores.texto },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colores.tarjeta,
    borderRadius: radios.tarjeta,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  itemTitulo: { fontSize: 14, fontWeight: '700', color: colores.texto },
  itemDetalle: { fontSize: 12, color: colores.textoSecundario, marginTop: 3 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radios.pildora },
  badgeTexto: { fontSize: 11, fontWeight: '700' },
});

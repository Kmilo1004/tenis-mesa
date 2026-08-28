import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, TextInput, ScrollView, Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiFetch } from '../../../src/api/client';
import { useAuth } from '../../../src/auth/AuthContext';
import EditorSets, { setsIniciales, setsCompletos } from '../../../src/components/EditorSets';
import { colores, radios } from '../../../src/theme/colores';

const MOTIVOS = [
  { valor: 'marcador_incorrecto', etiqueta: 'El marcador es incorrecto' },
  { valor: 'no_jugado', etiqueta: 'Este partido no se jugó' },
  { valor: 'rival_equivocado', etiqueta: 'El rival está equivocado' },
];
const MOTIVOS_TEXTO = Object.fromEntries(MOTIVOS.map((m) => [m.valor, m.etiqueta]));

const ETIQUETAS_ESTADO = {
  pendiente: { texto: 'Pendiente de confirmar', color: colores.advertencia, fondo: colores.advertenciaFondo },
  pendiente_aprobacion: { texto: 'Pendiente de aprobación', color: colores.advertencia, fondo: colores.advertenciaFondo },
  confirmado: { texto: 'Confirmado', color: colores.exito, fondo: colores.exitoFondo },
  descartado: { texto: 'Descartado', color: colores.textoSecundario, fondo: colores.gris },
  en_revision: { texto: 'En disputa', color: colores.info, fondo: colores.infoFondo },
  anulado: { texto: 'Anulado', color: colores.error, fondo: colores.errorFondo },
  por_definir: { texto: 'Por definir', color: colores.textoSecundario, fondo: colores.gris },
};

export default function DetallePartido() {
  const { id } = useLocalSearchParams();
  const { usuario, token } = useAuth();

  const [partido, setPartido] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [mostrarDisputa, setMostrarDisputa] = useState(false);
  const [motivo, setMotivo] = useState(null);
  const [comentario, setComentario] = useState('');
  const [setsResultado, setSetsResultado] = useState(setsIniciales());
  const [mostrarEdicion, setMostrarEdicion] = useState(false);
  const [setsEdicion, setSetsEdicion] = useState(setsIniciales());
  const [motivoAdmin, setMotivoAdmin] = useState('');
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [mostrarRechazo, setMostrarRechazo] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const datos = await apiFetch(`/partidos/${id}`, { token });
      setPartido(datos);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [id, token]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  if (cargando || !partido || !usuario) {
    return (
      <View style={estilos.centrado}>
        <ActivityIndicator color={colores.navy} />
      </View>
    );
  }

  const soyJugadorA = partido.jugadorA?.id === usuario.id;
  const rival = soyJugadorA ? partido.jugadorB : partido.jugadorA;
  const esPartidoTorneo = Boolean(partido.torneoId);
  const esAdminOArbitro = usuario.roles?.some((r) => r.rol === 'administrador' || r.rol === 'arbitro');
  const puedoResponder = !esPartidoTorneo && partido.estado === 'pendiente' && partido.registradoPor !== usuario.id;
  const esParticipanteTorneo = esPartidoTorneo && (partido.jugadorA?.id === usuario.id || partido.jugadorB?.id === usuario.id);
  const puedoReportarResultado =
    esPartidoTorneo && partido.estado === 'pendiente' && (esAdminOArbitro || esParticipanteTorneo);
  const esAdmin = usuario.roles?.some((r) => r.rol === 'administrador');
  const puedoResolverDisputa = esAdmin && partido.estado === 'en_revision';
  const puedoAdministrarResultado = esAdmin && partido.estado === 'confirmado';
  const puedeAprobarResultado = esAdminOArbitro && partido.estado === 'pendiente_aprobacion';
  const puedePromoverOficial =
    esAdmin &&
    partido.estado === 'confirmado' &&
    partido.tipoPartido === 'casual' &&
    partido.afectaRanking === 'no_oficial' &&
    !partido.promovidoAOficial;
  const puedeRescatar = esAdmin && partido.estado === 'descartado';
  const etiquetaEstado = ETIQUETAS_ESTADO[partido.estado] || ETIQUETAS_ESTADO.por_definir;

  async function confirmar() {
    setEnviando(true);
    setError(null);
    try {
      await apiFetch(`/partidos/${id}/confirmar`, { method: 'POST', token });
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function reportarResultado() {
    setEnviando(true);
    setError(null);
    try {
      await apiFetch(`/partidos/${id}/resultado`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          sets: setsResultado.map((s) => ({ puntosJugadorA: Number(s.puntosJugadorA), puntosJugadorB: Number(s.puntosJugadorB) })),
        }),
      });
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function aprobarResultadoTorneo(aprobar) {
    setEnviando(true);
    setError(null);
    try {
      await apiFetch(`/partidos/${id}/aprobar-resultado`, {
        method: 'POST',
        token,
        body: JSON.stringify({ aprobar, motivo: aprobar ? undefined : motivoRechazo.trim() || undefined }),
      });
      setMostrarRechazo(false);
      setMotivoRechazo('');
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function disputar() {
    if (!motivo) return;
    setEnviando(true);
    setError(null);
    try {
      await apiFetch(`/partidos/${id}/disputar`, {
        method: 'POST',
        token,
        body: JSON.stringify({ motivo, comentario: comentario.trim() || undefined }),
      });
      await cargar();
      setMostrarDisputa(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function resolverDisputa(resolucion) {
    setEnviando(true);
    setError(null);
    try {
      await apiFetch(`/partidos/${id}/resolver-disputa`, { method: 'POST', token, body: JSON.stringify({ resolucion }) });
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  function abrirEdicion() {
    setSetsEdicion(
      partido.sets.map((s) => ({ puntosJugadorA: String(s.puntosJugadorA), puntosJugadorB: String(s.puntosJugadorB) })),
    );
    setMotivoAdmin('');
    setMostrarEdicion(true);
  }

  async function guardarEdicion() {
    setEnviando(true);
    setError(null);
    try {
      await apiFetch(`/partidos/${id}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({
          sets: setsEdicion.map((s) => ({ puntosJugadorA: Number(s.puntosJugadorA), puntosJugadorB: Number(s.puntosJugadorB) })),
          motivo: motivoAdmin.trim() || undefined,
        }),
      });
      await cargar();
      setMostrarEdicion(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  function confirmarAnulacion() {
    Alert.alert('¿Anular este resultado?', 'Esto revierte el efecto que tuvo en el ranking. No se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Anular', style: 'destructive', onPress: anular },
    ]);
  }

  async function anular() {
    setEnviando(true);
    setError(null);
    try {
      await apiFetch(`/partidos/${id}`, { method: 'PATCH', token, body: JSON.stringify({ anular: true }) });
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  function confirmarPromocion() {
    Alert.alert(
      '¿Promover este partido a oficial?',
      'Además del Ranking normal (que ya tiene), este resultado también se aplicará al Ranking Interno, con su propio cálculo de puntos. No se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Promover', onPress: promoverAOficial },
      ],
    );
  }

  async function promoverAOficial() {
    setEnviando(true);
    setError(null);
    try {
      await apiFetch(`/partidos/${id}/validar`, { method: 'POST', token });
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function rescatarPartido() {
    setEnviando(true);
    setError(null);
    try {
      await apiFetch(`/partidos/${id}/validar`, { method: 'POST', token });
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={estilos.contenedor}>
      <View style={estilos.tarjetaPrincipal}>
        <View style={[estilos.badge, { backgroundColor: etiquetaEstado.fondo, alignSelf: 'center' }]}>
          <Text style={[estilos.badgeTexto, { color: etiquetaEstado.color }]}>{etiquetaEstado.texto}</Text>
        </View>

        <Text style={estilos.titulo}>vs {rival?.nombre || 'Por definir'}</Text>
        {esPartidoTorneo && <Text style={estilos.torneoTag}>{partido.ronda || 'Fase de grupos'}</Text>}
        {partido.promovidoAOficial && <Text style={estilos.torneoTag}>Promovido a oficial · cuenta para Ranking Interno</Text>}
        <View style={estilos.filaFecha}>
          <Ionicons name="calendar-outline" size={13} color={colores.textoSecundario} />
          <Text style={estilos.fecha}>{new Date(partido.fechaPartido).toLocaleString('es-CO')}</Text>
        </View>

        {partido.estado === 'por_definir' && (
          <Text style={estilos.avisoTexto}>Todavía no se conocen ambos jugadores de este partido.</Text>
        )}

        {partido.sets.length > 0 && (
          <View style={estilos.marcador}>
            {partido.sets.map((s, i) => {
              const misPuntos = soyJugadorA ? s.puntosJugadorA : s.puntosJugadorB;
              const puntosRival = soyJugadorA ? s.puntosJugadorB : s.puntosJugadorA;
              const gane = misPuntos > puntosRival;
              return (
                <View key={s.id} style={[estilos.set, gane && estilos.setGanado]}>
                  <Text style={estilos.setNumero}>Set {i + 1}</Text>
                  <Text style={[estilos.setPuntos, gane && estilos.setPuntosGanado]}>{misPuntos}</Text>
                  <Text style={estilos.setGuion}>-</Text>
                  <Text style={estilos.setPuntos}>{puntosRival}</Text>
                </View>
              );
            })}
          </View>
        )}

        {partido.ganador && (
          <View style={estilos.filaGanador}>
            <Ionicons name="trophy" size={16} color={colores.navy} />
            <Text style={estilos.ganador}>Ganó: {partido.ganador.id === usuario.id ? 'Tú' : partido.ganador.nombre}</Text>
          </View>
        )}
      </View>

      {partido.estado === 'en_revision' && (
        <View style={estilos.avisoDisputa}>
          <Text style={estilos.avisoDisputaTexto}>
            {esAdmin ? 'Este resultado está en disputa:' : 'Este resultado está en disputa. Un administrador debe resolverlo antes de que afecte tu ranking.'}
          </Text>
          {esAdmin && (
            <>
              <Text style={estilos.avisoDisputaDetalle}>Motivo: {MOTIVOS_TEXTO[partido.motivoDisputa] || partido.motivoDisputa}</Text>
              {partido.comentarioDisputa && <Text style={estilos.avisoDisputaDetalle}>Comentario: {partido.comentarioDisputa}</Text>}
              {partido.marcadorPropuesto && (
                <Text style={estilos.avisoDisputaDetalle}>
                  Marcador propuesto: {partido.marcadorPropuesto.map((s) => `${s.puntosJugadorA}-${s.puntosJugadorB}`).join(', ')}
                </Text>
              )}
            </>
          )}
        </View>
      )}

      {error && <Text style={estilos.error}>{error}</Text>}

      {puedoResponder && !mostrarDisputa && (
        <View style={estilos.acciones}>
          <Pressable style={estilos.boton} onPress={confirmar} disabled={enviando}>
            {enviando ? <ActivityIndicator color={colores.textoClaro} /> : <Text style={estilos.botonTexto}>Confirmar resultado</Text>}
          </Pressable>
          <Pressable style={estilos.botonSecundario} onPress={() => setMostrarDisputa(true)} disabled={enviando}>
            <Text style={estilos.botonSecundarioTexto}>Disputar resultado</Text>
          </Pressable>
        </View>
      )}

      {puedoResponder && mostrarDisputa && (
        <View style={estilos.tarjeta}>
          <Text style={estilos.etiqueta}>¿Cuál es el problema?</Text>
          {MOTIVOS.map((m) => (
            <Pressable
              key={m.valor}
              style={[estilos.opcionMotivo, motivo === m.valor && estilos.opcionMotivoActiva]}
              onPress={() => setMotivo(m.valor)}
            >
              <Text style={motivo === m.valor ? estilos.opcionMotivoTextoActivo : estilos.opcionMotivoTexto}>{m.etiqueta}</Text>
            </Pressable>
          ))}

          <Text style={[estilos.etiqueta, { marginTop: 12 }]}>Comentario (opcional)</Text>
          <TextInput
            style={estilos.textarea}
            multiline
            placeholder="Cuéntale al administrador qué pasó..."
            placeholderTextColor={colores.textoSecundario}
            value={comentario}
            onChangeText={setComentario}
          />

          <Pressable style={estilos.boton} onPress={disputar} disabled={!motivo || enviando}>
            {enviando ? <ActivityIndicator color={colores.textoClaro} /> : <Text style={estilos.botonTexto}>Enviar disputa</Text>}
          </Pressable>
          <Pressable onPress={() => setMostrarDisputa(false)}>
            <Text style={estilos.cancelar}>Cancelar</Text>
          </Pressable>
        </View>
      )}

      {puedoReportarResultado && (
        <View style={estilos.tarjeta}>
          <Text style={estilos.etiqueta}>Marcador por set</Text>
          <EditorSets
            sets={setsResultado}
            onCambiar={setSetsResultado}
            etiquetaA={partido.jugadorA?.nombre || 'Jugador A'}
            etiquetaB={partido.jugadorB?.nombre || 'Jugador B'}
          />
          {!esAdminOArbitro && (
            <Text style={estilos.avisoTextoIzq}>
              Un administrador o árbitro debe aprobar este resultado antes de que afecte el ranking.
            </Text>
          )}

          <Pressable style={estilos.boton} onPress={reportarResultado} disabled={!setsCompletos(setsResultado) || enviando}>
            {enviando ? <ActivityIndicator color={colores.textoClaro} /> : <Text style={estilos.botonTexto}>Registrar resultado</Text>}
          </Pressable>
        </View>
      )}

      {partido.estado === 'pendiente_aprobacion' && !puedeAprobarResultado && (
        <View style={estilos.avisoDisputa}>
          <Text style={estilos.avisoDisputaTexto}>
            {partido.reportadoPor === usuario.id
              ? 'Reportaste este resultado. Un administrador o árbitro debe aprobarlo antes de que afecte el ranking.'
              : 'Tu rival reportó un resultado para este partido. Un administrador o árbitro debe aprobarlo antes de que afecte el ranking.'}
          </Text>
        </View>
      )}

      {puedeAprobarResultado && !mostrarRechazo && (
        <View style={estilos.tarjeta}>
          <Text style={estilos.etiqueta}>Resultado reportado por {partido.reportador?.nombre || 'un jugador'}</Text>
          <Pressable style={estilos.boton} onPress={() => aprobarResultadoTorneo(true)} disabled={enviando}>
            {enviando ? <ActivityIndicator color={colores.textoClaro} /> : <Text style={estilos.botonTexto}>Aprobar resultado</Text>}
          </Pressable>
          <Pressable style={estilos.botonSecundario} onPress={() => setMostrarRechazo(true)} disabled={enviando}>
            <Text style={estilos.botonSecundarioTexto}>Rechazar resultado</Text>
          </Pressable>
        </View>
      )}

      {puedeAprobarResultado && mostrarRechazo && (
        <View style={estilos.tarjeta}>
          <Text style={estilos.etiqueta}>¿Por qué se rechaza? (opcional)</Text>
          <TextInput
            style={estilos.textarea}
            multiline
            placeholder="Ej. el marcador no coincide con lo jugado..."
            placeholderTextColor={colores.textoSecundario}
            value={motivoRechazo}
            onChangeText={setMotivoRechazo}
          />
          <View style={estilos.filaBotonesFormulario}>
            <Pressable onPress={() => setMostrarRechazo(false)} disabled={enviando}>
              <Text style={estilos.cancelar}>Cancelar</Text>
            </Pressable>
            <Pressable style={[estilos.boton, { flex: 1 }]} onPress={() => aprobarResultadoTorneo(false)} disabled={enviando}>
              {enviando ? <ActivityIndicator color={colores.textoClaro} /> : <Text style={estilos.botonTexto}>Rechazar</Text>}
            </Pressable>
          </View>
        </View>
      )}

      {puedoResolverDisputa && (
        <View style={estilos.tarjeta}>
          <Text style={estilos.etiqueta}>Resolver disputa</Text>
          <Pressable style={estilos.boton} onPress={() => resolverDisputa('confirmar_original')} disabled={enviando}>
            <Text style={estilos.botonTexto}>Confirmar marcador original</Text>
          </Pressable>
          {partido.marcadorPropuesto && (
            <Pressable style={[estilos.boton, { marginTop: 10 }]} onPress={() => resolverDisputa('aceptar_propuesto')} disabled={enviando}>
              <Text style={estilos.botonTexto}>Aceptar marcador propuesto</Text>
            </Pressable>
          )}
          <Pressable style={estilos.botonSecundario} onPress={() => resolverDisputa('anular')} disabled={enviando}>
            <Text style={estilos.botonSecundarioTexto}>Anular partido</Text>
          </Pressable>
        </View>
      )}

      {puedeRescatar && (
        <View style={estilos.tarjeta}>
          <Text style={estilos.etiqueta}>Este partido venció sin que nadie lo confirmara</Text>
          <Text style={estilos.avisoTextoIzq}>
            Puedes rescatarlo y aplicar el marcador reportado, como si se hubiera confirmado a tiempo.
          </Text>
          <Pressable style={estilos.boton} onPress={rescatarPartido} disabled={enviando}>
            {enviando ? <ActivityIndicator color={colores.textoClaro} /> : <Text style={estilos.botonTexto}>Rescatar partido</Text>}
          </Pressable>
        </View>
      )}

      {puedoAdministrarResultado && !mostrarEdicion && (
        <View style={estilos.tarjeta}>
          <Text style={estilos.etiqueta}>Panel de administración</Text>
          <Pressable style={estilos.botonAdmin} onPress={abrirEdicion} disabled={enviando}>
            <Text style={estilos.botonAdminTexto}>Editar resultado</Text>
          </Pressable>
          {puedePromoverOficial && (
            <Pressable style={[estilos.botonAdmin, { marginTop: 10 }]} onPress={confirmarPromocion} disabled={enviando}>
              <Text style={estilos.botonAdminTexto}>Promover a oficial</Text>
            </Pressable>
          )}
          <Pressable style={[estilos.botonSecundario, { marginTop: 10 }]} onPress={confirmarAnulacion} disabled={enviando}>
            <Text style={estilos.botonSecundarioTexto}>Anular resultado</Text>
          </Pressable>
        </View>
      )}

      {puedoAdministrarResultado && mostrarEdicion && (
        <View style={estilos.tarjeta}>
          <Text style={estilos.etiqueta}>Nuevo marcador</Text>
          <EditorSets
            sets={setsEdicion}
            onCambiar={setSetsEdicion}
            etiquetaA={partido.jugadorA?.nombre || 'Jugador A'}
            etiquetaB={partido.jugadorB?.nombre || 'Jugador B'}
          />
          <Text style={[estilos.etiqueta, { marginTop: 8 }]}>Motivo del cambio (opcional)</Text>
          <TextInput
            style={estilos.textarea}
            multiline
            placeholderTextColor={colores.textoSecundario}
            value={motivoAdmin}
            onChangeText={setMotivoAdmin}
          />

          <View style={estilos.filaBotonesFormulario}>
            <Pressable onPress={() => setMostrarEdicion(false)} disabled={enviando}>
              <Text style={estilos.cancelar}>Cancelar</Text>
            </Pressable>
            <Pressable style={[estilos.boton, { flex: 1 }]} onPress={guardarEdicion} disabled={!setsCompletos(setsEdicion) || enviando}>
              {enviando ? <ActivityIndicator color={colores.textoClaro} /> : <Text style={estilos.botonTexto}>Guardar cambios</Text>}
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.fondo },
  contenedor: { padding: 16, paddingBottom: 48 },
  tarjetaPrincipal: {
    backgroundColor: colores.tarjeta,
    borderRadius: radios.tarjeta,
    padding: 20,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  tarjeta: {
    backgroundColor: colores.tarjeta,
    borderRadius: radios.tarjeta,
    padding: 20,
    marginTop: 14,
    width: '100%',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radios.pildora, marginBottom: 12 },
  badgeTexto: { fontSize: 12, fontWeight: '700' },
  titulo: { fontSize: 22, fontWeight: '800', color: colores.texto, textAlign: 'center' },
  torneoTag: { color: colores.navy, fontWeight: '700', marginTop: 6, fontSize: 12 },
  avisoTexto: { color: colores.textoSecundario, marginTop: 12, textAlign: 'center' },
  avisoTextoIzq: { color: colores.textoSecundario, fontSize: 12, marginTop: 4, marginBottom: 4 },
  filaFecha: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  fecha: { color: colores.textoSecundario, fontSize: 12 },
  marcador: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 24, justifyContent: 'center' },
  set: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colores.gris,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  setGanado: { backgroundColor: colores.exitoFondo },
  setNumero: { fontSize: 11, color: colores.textoSecundario, marginRight: 4 },
  setPuntos: { fontSize: 17, fontWeight: '700', color: colores.texto, width: 20, textAlign: 'center' },
  setPuntosGanado: { color: colores.exito },
  setGuion: { color: colores.textoSecundario },
  filaGanador: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18 },
  ganador: { fontWeight: '700', color: colores.texto },
  avisoDisputa: { marginTop: 14, backgroundColor: colores.infoFondo, padding: 14, borderRadius: radios.tarjeta, width: '100%' },
  avisoDisputaTexto: { color: colores.info, fontSize: 13, fontWeight: '600' },
  avisoDisputaDetalle: { color: colores.info, fontSize: 12, marginTop: 4 },
  error: { color: colores.error, marginTop: 12, textAlign: 'center' },
  acciones: { width: '100%', marginTop: 20, gap: 10 },
  boton: { backgroundColor: colores.navy, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  botonTexto: { color: colores.textoClaro, fontWeight: '700' },
  botonSecundario: { paddingVertical: 12, alignItems: 'center' },
  botonSecundarioTexto: { color: colores.error, fontWeight: '600' },
  etiqueta: { fontSize: 13, fontWeight: '700', color: colores.texto, marginBottom: 10 },
  opcionMotivo: { borderWidth: 1, borderColor: colores.borde, borderRadius: 10, padding: 12, marginBottom: 8 },
  opcionMotivoActiva: { borderColor: colores.navy, backgroundColor: colores.fondo },
  opcionMotivoTexto: { color: colores.texto },
  opcionMotivoTextoActivo: { color: colores.navy, fontWeight: '600' },
  textarea: {
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    color: colores.texto,
  },
  cancelar: { textAlign: 'center', color: colores.textoSecundario, marginTop: 12 },
  botonAdmin: { borderWidth: 1, borderColor: colores.navy, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  botonAdminTexto: { color: colores.navy, fontWeight: '600' },
  filaBotonesFormulario: { flexDirection: 'row', gap: 16, alignItems: 'center', marginTop: 16 },
});

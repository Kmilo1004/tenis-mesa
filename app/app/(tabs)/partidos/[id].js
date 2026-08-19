import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, TextInput, ScrollView, Alert } from 'react-native';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '../../../src/api/client';
import { useAuth } from '../../../src/auth/AuthContext';
import EditorSets, { setsIniciales, setsCompletos } from '../../../src/components/EditorSets';

const MOTIVOS = [
  { valor: 'marcador_incorrecto', etiqueta: 'El marcador es incorrecto' },
  { valor: 'no_jugado', etiqueta: 'Este partido no se jugó' },
  { valor: 'rival_equivocado', etiqueta: 'El rival está equivocado' },
];
const MOTIVOS_TEXTO = Object.fromEntries(MOTIVOS.map((m) => [m.valor, m.etiqueta]));

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

  if (cargando || !partido) {
    return (
      <View style={estilos.centrado}>
        <ActivityIndicator />
      </View>
    );
  }

  const soyJugadorA = partido.jugadorA?.id === usuario.id;
  const rival = soyJugadorA ? partido.jugadorB : partido.jugadorA;
  const esPartidoTorneo = Boolean(partido.torneoId);
  const esAdminOArbitro = usuario.roles?.some((r) => r.rol === 'administrador' || r.rol === 'arbitro');
  const puedoResponder = !esPartidoTorneo && partido.estado === 'pendiente' && partido.registradoPor !== usuario.id;
  const puedoReportarResultado = esPartidoTorneo && partido.estado === 'pendiente' && esAdminOArbitro;
  const esAdmin = usuario.roles?.some((r) => r.rol === 'administrador');
  const puedoResolverDisputa = esAdmin && partido.estado === 'en_revision';
  const puedoAdministrarResultado = esAdmin && partido.estado === 'confirmado';

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

  return (
    <ScrollView contentContainerStyle={estilos.contenedor}>
      <Text style={estilos.titulo}>vs {rival?.nombre || 'Por definir'}</Text>
      {esPartidoTorneo && <Text style={estilos.torneoTag}>{partido.ronda || 'Fase de grupos'}</Text>}
      <Text style={estilos.fecha}>{new Date(partido.fechaPartido).toLocaleString('es-CO')}</Text>
      <Text style={estilos.estado}>{partido.estado.replace('_', ' ')}</Text>

      {partido.estado === 'por_definir' && (
        <Text style={estilos.avisoTexto}>Todavía no se conocen ambos jugadores de este partido.</Text>
      )}

      <View style={estilos.marcador}>
        {partido.sets.map((s) => (
          <View key={s.id} style={estilos.set}>
            <Text style={estilos.setPuntos}>{soyJugadorA ? s.puntosJugadorA : s.puntosJugadorB}</Text>
            <Text style={estilos.setGuion}>-</Text>
            <Text style={estilos.setPuntos}>{soyJugadorA ? s.puntosJugadorB : s.puntosJugadorA}</Text>
          </View>
        ))}
      </View>

      {partido.ganador && (
        <Text style={estilos.ganador}>
          Ganó: {partido.ganador.id === usuario.id ? 'Tú' : partido.ganador.nombre}
        </Text>
      )}

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
            {enviando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.botonTexto}>Confirmar resultado</Text>}
          </Pressable>
          <Pressable style={estilos.botonSecundario} onPress={() => setMostrarDisputa(true)} disabled={enviando}>
            <Text style={estilos.botonSecundarioTexto}>Disputar resultado</Text>
          </Pressable>
        </View>
      )}

      {puedoResponder && mostrarDisputa && (
        <View style={estilos.formularioDisputa}>
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
            value={comentario}
            onChangeText={setComentario}
          />

          <Pressable style={estilos.boton} onPress={disputar} disabled={!motivo || enviando}>
            {enviando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.botonTexto}>Enviar disputa</Text>}
          </Pressable>
          <Pressable onPress={() => setMostrarDisputa(false)}>
            <Text style={estilos.cancelar}>Cancelar</Text>
          </Pressable>
        </View>
      )}

      {puedoReportarResultado && (
        <View style={estilos.formularioDisputa}>
          <Text style={estilos.etiqueta}>Marcador por set</Text>
          <EditorSets
            sets={setsResultado}
            onCambiar={setSetsResultado}
            etiquetaA={partido.jugadorA?.nombre || 'Jugador A'}
            etiquetaB={partido.jugadorB?.nombre || 'Jugador B'}
          />

          <Pressable style={estilos.boton} onPress={reportarResultado} disabled={!setsCompletos(setsResultado) || enviando}>
            {enviando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.botonTexto}>Registrar resultado</Text>}
          </Pressable>
        </View>
      )}

      {puedoResolverDisputa && (
        <View style={estilos.panelAdmin}>
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

      {puedoAdministrarResultado && !mostrarEdicion && (
        <View style={estilos.panelAdmin}>
          <Text style={estilos.etiqueta}>Panel de administración</Text>
          <Pressable style={estilos.botonAdmin} onPress={abrirEdicion} disabled={enviando}>
            <Text style={estilos.botonAdminTexto}>Editar resultado</Text>
          </Pressable>
          <Pressable style={[estilos.botonSecundario, { marginTop: 10 }]} onPress={confirmarAnulacion} disabled={enviando}>
            <Text style={estilos.botonSecundarioTexto}>Anular resultado</Text>
          </Pressable>
        </View>
      )}

      {puedoAdministrarResultado && mostrarEdicion && (
        <View style={estilos.panelAdmin}>
          <Text style={estilos.etiqueta}>Nuevo marcador</Text>
          <EditorSets
            sets={setsEdicion}
            onCambiar={setSetsEdicion}
            etiquetaA={partido.jugadorA?.nombre || 'Jugador A'}
            etiquetaB={partido.jugadorB?.nombre || 'Jugador B'}
          />
          <Text style={[estilos.etiqueta, { marginTop: 8 }]}>Motivo del cambio (opcional)</Text>
          <TextInput style={estilos.textarea} multiline value={motivoAdmin} onChangeText={setMotivoAdmin} />

          <View style={estilos.filaBotonesFormulario}>
            <Pressable onPress={() => setMostrarEdicion(false)} disabled={enviando}>
              <Text style={estilos.cancelar}>Cancelar</Text>
            </Pressable>
            <Pressable style={[estilos.boton, { flex: 1 }]} onPress={guardarEdicion} disabled={!setsCompletos(setsEdicion) || enviando}>
              {enviando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.botonTexto}>Guardar cambios</Text>}
            </Pressable>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contenedor: { padding: 24, alignItems: 'center' },
  titulo: { fontSize: 22, fontWeight: '700' },
  torneoTag: { color: '#1d4ed8', fontWeight: '600', marginTop: 4, fontSize: 13 },
  avisoTexto: { color: '#888', marginTop: 12, textAlign: 'center' },
  fecha: { color: '#666', marginTop: 4 },
  estado: { color: '#1d4ed8', fontWeight: '600', marginTop: 8, textTransform: 'capitalize' },
  marcador: { flexDirection: 'row', gap: 12, marginTop: 24 },
  set: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f3f4f6', padding: 10, borderRadius: 8 },
  setPuntos: { fontSize: 16, fontWeight: '700', width: 20, textAlign: 'center' },
  setGuion: { marginHorizontal: 2, color: '#999' },
  ganador: { marginTop: 16, fontWeight: '600' },
  avisoDisputa: { marginTop: 16, backgroundColor: '#f3e8ff', padding: 12, borderRadius: 8, width: '100%' },
  avisoDisputaTexto: { color: '#7e22ce', fontSize: 13 },
  avisoDisputaDetalle: { color: '#6b21a8', fontSize: 12, marginTop: 4 },
  error: { color: '#dc2626', marginTop: 12, textAlign: 'center' },
  acciones: { width: '100%', marginTop: 32, gap: 10 },
  boton: { backgroundColor: '#1d4ed8', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  botonTexto: { color: '#fff', fontWeight: '700' },
  botonSecundario: { paddingVertical: 12, alignItems: 'center' },
  botonSecundarioTexto: { color: '#dc2626', fontWeight: '600' },
  formularioDisputa: { width: '100%', marginTop: 24 },
  etiqueta: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 8 },
  opcionMotivo: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 8 },
  opcionMotivoActiva: { borderColor: '#1d4ed8', backgroundColor: '#eff6ff' },
  opcionMotivoTexto: { color: '#333' },
  opcionMotivoTextoActivo: { color: '#1d4ed8', fontWeight: '600' },
  textarea: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, minHeight: 80, textAlignVertical: 'top' },
  cancelar: { textAlign: 'center', color: '#666', marginTop: 12 },
  panelAdmin: { width: '100%', marginTop: 28, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#eee' },
  botonAdmin: { borderWidth: 1, borderColor: '#1d4ed8', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  botonAdminTexto: { color: '#1d4ed8', fontWeight: '600' },
  filaBotonesFormulario: { flexDirection: 'row', gap: 16, alignItems: 'center', marginTop: 16 },
});

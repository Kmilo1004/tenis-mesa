import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiFetch } from '../../../src/api/client';
import { useAuth } from '../../../src/auth/AuthContext';
import SeccionGrupos from '../../../src/components/SeccionGrupos';
import Avatar from '../../../src/components/Avatar';
import SelectorOpciones from '../../../src/components/SelectorOpciones';
import { descargarYCompartir } from '../../../src/lib/exportar';
import { colores, radios } from '../../../src/theme/colores';

const ETIQUETAS_ESTADO = {
  inscripciones_abiertas: { texto: 'Inscripciones abiertas', color: colores.exito, fondo: colores.exitoFondo },
  inscripciones_cerradas: { texto: 'Inscripciones cerradas', color: colores.advertencia, fondo: colores.advertenciaFondo },
  en_curso: { texto: 'En curso', color: colores.acento, fondo: '#DBEAFE' },
  finalizado: { texto: 'Finalizado', color: colores.textoSecundario, fondo: colores.gris },
};

const ETIQUETAS_ESTADO_PARTIDO = {
  por_definir: { texto: 'Por definir', color: colores.textoSecundario, fondo: colores.gris },
  pendiente: { texto: 'Pendiente', color: colores.advertencia, fondo: colores.advertenciaFondo },
  pendiente_aprobacion: { texto: 'Por aprobar', color: colores.advertencia, fondo: colores.advertenciaFondo },
  confirmado: { texto: 'Confirmado', color: colores.exito, fondo: colores.exitoFondo },
  en_revision: { texto: 'En disputa', color: colores.info, fondo: colores.infoFondo },
  anulado: { texto: 'Anulado', color: colores.error, fondo: colores.errorFondo },
};

const OPCIONES_SIEMBRA = [
  { valor: 'aleatorio', etiqueta: 'Aleatoria' },
  { valor: 'ranking', etiqueta: 'Por ranking' },
];

export default function DetalleTorneo() {
  const { id } = useLocalSearchParams();
  const { usuario, token } = useAuth();
  const esAdmin = usuario?.roles?.some((r) => r.rol === 'administrador');

  const [torneo, setTorneo] = useState(null);
  const [inscritos, setInscritos] = useState([]);
  const [cuadro, setCuadro] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState(null);
  const [siembraCuadro, setSiembraCuadro] = useState('aleatorio');
  const [editandoCruces, setEditandoCruces] = useState(false);
  const [intercambiando, setIntercambiando] = useState(null); // { partidoId, slot }
  const [inscritosAbiertos, setInscritosAbiertos] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [datosTorneo, datosInscritos, datosCuadro] = await Promise.all([
        apiFetch(`/torneos/${id}`),
        apiFetch(`/torneos/${id}/inscripciones`),
        apiFetch(`/torneos/${id}/cuadro`),
      ]);
      setTorneo(datosTorneo);
      setInscritos(datosInscritos);
      setCuadro(datosCuadro.partidos);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  if (cargando || !torneo || !usuario) {
    return (
      <View style={estilos.centrado}>
        <ActivityIndicator color={colores.navy} />
      </View>
    );
  }

  const estoyInscrito = inscritos.some((i) => i.usuarioId === usuario.id);
  const inscripcionesAbiertas = torneo.estado === 'inscripciones_abiertas';
  const puedoRetirarme = estoyInscrito && ['inscripciones_abiertas', 'inscripciones_cerradas'].includes(torneo.estado);
  const puedoGenerarCuadro =
    esAdmin && torneo.formato === 'eliminacion_directa' && torneo.estado === 'inscripciones_cerradas' && cuadro.length === 0;
  const puedeEditarCruces = esAdmin && cuadro.some((p) => p.nivelRonda === 0 && p.estado === 'pendiente');
  const etiquetaEstado = ETIQUETAS_ESTADO[torneo.estado];

  async function accion(fn) {
    setError(null);
    setEnviando(true);
    try {
      await fn();
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const inscribirme = () => accion(() => apiFetch(`/torneos/${id}/inscripciones`, { method: 'POST', token }));
  const retirarme = () => accion(() => apiFetch(`/torneos/${id}/inscripciones/me`, { method: 'DELETE', token }));
  const cerrarInscripciones = () => accion(() => apiFetch(`/torneos/${id}/cerrar-inscripciones`, { method: 'POST', token }));
  const generarCuadro = () =>
    accion(() => apiFetch(`/torneos/${id}/cuadro/generar`, { method: 'POST', token, body: JSON.stringify({ siembra: siembraCuadro }) }));

  async function eliminarTorneo() {
    setError(null);
    setEnviando(true);
    try {
      await apiFetch(`/torneos/${id}`, { method: 'DELETE', token });
      router.back();
    } catch (err) {
      setError(err.message);
      setEnviando(false);
    }
  }

  function confirmarEliminacion() {
    Alert.alert(
      '¿Eliminar este torneo?',
      'Se borrarán sus inscripciones, grupos y partidos, y se revertirá el efecto que hayan tenido en el ranking. No se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: eliminarTorneo },
      ],
    );
  }

  async function exportarResultados(formato) {
    setError(null);
    setExportando(true);
    try {
      await descargarYCompartir(`/reportes/torneo/${id}?formato=${formato}`, `${torneo.nombre}.${formato}`, token);
    } catch (err) {
      setError(err.message);
    } finally {
      setExportando(false);
    }
  }

  function candidatosIntercambio(partidoActualId) {
    const candidatos = [];
    for (const p of cuadro) {
      if (p.nivelRonda !== 0 || p.estado !== 'pendiente' || p.id === partidoActualId) continue;
      if (p.jugadorA) candidatos.push({ id: p.jugadorA.id, nombre: p.jugadorA.nombre });
      if (p.jugadorB) candidatos.push({ id: p.jugadorB.id, nombre: p.jugadorB.nombre });
    }
    return candidatos;
  }

  async function intercambiarCruce(partidoId, slot, nuevoJugadorId) {
    setError(null);
    setEnviando(true);
    try {
      await apiFetch(`/torneos/${id}/cuadro/${partidoId}`, {
        method: 'PATCH',
        token,
        body: JSON.stringify({ slot, nuevoJugadorId }),
      });
      setIntercambiando(null);
      await cargar();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  const rondas = [];
  for (const partido of cuadro) {
    const nombreRonda = partido.ronda || 'Ronda';
    let ronda = rondas.find((r) => r.nombre === nombreRonda);
    if (!ronda) {
      ronda = { nombre: nombreRonda, partidos: [] };
      rondas.push(ronda);
    }
    ronda.partidos.push(partido);
  }

  // En los torneos "mixto" el cuadro de eliminación solo se genera cuando la fase de grupos
  // termina, así que si ya hay cuadro esa es la fase vigente y se muestra antes que los grupos.
  const bloqueCuadro = rondas.length > 0 && (
    <View key="bloque-cuadro">
      <View style={estilos.filaSubtituloConAccion}>
        <Text style={[estilos.subtitulo, { marginTop: 0 }]}>Cuadro</Text>
        {puedeEditarCruces && (
          <Pressable
            onPress={() => {
              setEditandoCruces((v) => !v);
              setIntercambiando(null);
            }}
          >
            <Text style={estilos.enlaceEditarCruces}>{editandoCruces ? 'Listo' : 'Editar cruces'}</Text>
          </Pressable>
        )}
      </View>

      {rondas.map((ronda, indiceRonda) => (
        <View key={ronda.nombre} style={estilos.bloqueRonda}>
          <Text style={estilos.nombreRonda}>{ronda.nombre}</Text>
          {ronda.partidos.map((p) => {
            const etiquetaPartido = ETIQUETAS_ESTADO_PARTIDO[p.estado] || ETIQUETAS_ESTADO_PARTIDO.por_definir;
            const esEditable = editandoCruces && indiceRonda === 0 && p.estado === 'pendiente';

            if (esEditable) {
              return (
                <View key={p.id} style={estilos.filaPartidoEditable}>
                  <View style={estilos.filaCruceEditable}>
                    <Pressable style={estilos.chipJugador} onPress={() => setIntercambiando({ partidoId: p.id, slot: 'A' })}>
                      <Text style={estilos.chipJugadorTexto} numberOfLines={1}>
                        {p.jugadorA?.nombre || 'Por definir'}
                      </Text>
                      <Ionicons name="swap-horizontal-outline" size={14} color={colores.navy} />
                    </Pressable>
                    <Text style={estilos.vsTexto}>vs</Text>
                    <Pressable style={estilos.chipJugador} onPress={() => setIntercambiando({ partidoId: p.id, slot: 'B' })}>
                      <Text style={estilos.chipJugadorTexto} numberOfLines={1}>
                        {p.jugadorB?.nombre || 'Por definir'}
                      </Text>
                      <Ionicons name="swap-horizontal-outline" size={14} color={colores.navy} />
                    </Pressable>
                  </View>

                  {intercambiando?.partidoId === p.id && (
                    <View style={estilos.listaCandidatos}>
                      <Text style={estilos.listaCandidatosTitulo}>Intercambiar con:</Text>
                      {candidatosIntercambio(p.id).length === 0 ? (
                        <Text style={estilos.vacio}>No hay otro cruce disponible para intercambiar</Text>
                      ) : (
                        candidatosIntercambio(p.id).map((c) => (
                          <Pressable
                            key={c.id}
                            style={estilos.candidato}
                            onPress={() => intercambiarCruce(p.id, intercambiando.slot, c.id)}
                            disabled={enviando}
                          >
                            <Text style={estilos.candidatoTexto}>{c.nombre}</Text>
                          </Pressable>
                        ))
                      )}
                      <Pressable onPress={() => setIntercambiando(null)} disabled={enviando}>
                        <Text style={estilos.cancelarTexto}>Cancelar</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            }

            return (
              <Pressable key={p.id} style={estilos.filaPartido} onPress={() => router.push(`/partidos/${p.id}?desdeTorneo=${id}`)}>
                <Text style={estilos.jugadoresPartido}>
                  {p.jugadorA?.nombre || 'Por definir'} vs {p.jugadorB?.nombre || 'Por definir'}
                </Text>
                <View style={[estilos.badge, { backgroundColor: etiquetaPartido.fondo }]}>
                  <Text style={[estilos.badgeTexto, { color: etiquetaPartido.color }]}>{etiquetaPartido.texto}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={estilos.contenedor}>
      <View style={estilos.tarjetaPrincipal}>
        <View style={[estilos.badge, { backgroundColor: etiquetaEstado.fondo, alignSelf: 'center' }]}>
          <Text style={[estilos.badgeTexto, { color: etiquetaEstado.color }]}>{etiquetaEstado.texto}</Text>
        </View>

        <Text style={estilos.nombre}>{torneo.nombre}</Text>

        <View style={estilos.filaChips}>
          <View style={estilos.chip}>
            <Text style={estilos.chipTexto}>{torneo.tipo === 'oficial' ? 'Oficial' : 'Flash'}</Text>
          </View>
          <View style={estilos.chip}>
            <Text style={estilos.chipTexto}>{torneo.alcance === 'abierto' ? 'Abierto' : 'Interno'}</Text>
          </View>
          <View style={estilos.chip}>
            <Text style={estilos.chipTexto}>{torneo.formato.replace(/_/g, ' ')}</Text>
          </View>
        </View>

        <View style={estilos.filaFecha}>
          <Ionicons name="calendar-outline" size={13} color={colores.textoSecundario} />
          <Text style={estilos.fecha}>
            {new Date(torneo.fechaInicio).toLocaleDateString('es-CO')} — {new Date(torneo.fechaFin).toLocaleDateString('es-CO')}
          </Text>
        </View>
      </View>

      {error && <Text style={estilos.error}>{error}</Text>}

      {(inscripcionesAbiertas && !estoyInscrito) || puedoRetirarme ? (
        <View style={estilos.accionesJugador}>
          {inscripcionesAbiertas && !estoyInscrito && (
            <Pressable style={estilos.boton} onPress={inscribirme} disabled={enviando}>
              {enviando ? <ActivityIndicator color={colores.textoClaro} /> : <Text style={estilos.botonTexto}>Inscribirme</Text>}
            </Pressable>
          )}
          {puedoRetirarme && (
            <Pressable style={estilos.botonSecundario} onPress={retirarme} disabled={enviando}>
              <Text style={estilos.botonSecundarioTexto}>Retirar mi inscripción</Text>
            </Pressable>
          )}
        </View>
      ) : null}

      {esAdmin && (
        <View style={estilos.tarjeta}>
          <Text style={estilos.tarjetaTitulo}>ADMINISTRACIÓN</Text>

          <Pressable style={estilos.filaEnlace} onPress={() => router.push(`/torneos/editar?torneoId=${id}`)} disabled={enviando}>
            <Ionicons name="create-outline" size={20} color={colores.navy} />
            <Text style={estilos.filaEnlaceTexto}>Editar torneo</Text>
            <Ionicons name="chevron-forward" size={18} color={colores.textoSecundario} />
          </Pressable>

          {inscripcionesAbiertas && (
            <>
              <View style={estilos.divisor} />
              <Pressable style={estilos.filaEnlace} onPress={cerrarInscripciones} disabled={enviando}>
                <Ionicons name="lock-closed-outline" size={20} color={colores.navy} />
                <Text style={estilos.filaEnlaceTexto}>Cerrar inscripciones</Text>
                <Ionicons name="chevron-forward" size={18} color={colores.textoSecundario} />
              </Pressable>
            </>
          )}

          {torneo.alcance === 'abierto' && (
            <>
              <View style={estilos.divisor} />
              <Pressable style={estilos.filaEnlace} onPress={() => router.push(`/torneos/invitado?torneoId=${id}`)} disabled={enviando}>
                <Ionicons name="person-add-outline" size={20} color={colores.navy} />
                <Text style={estilos.filaEnlaceTexto}>Agregar invitado</Text>
                <Ionicons name="chevron-forward" size={18} color={colores.textoSecundario} />
              </Pressable>
            </>
          )}

          <View style={estilos.divisor} />
          <View style={estilos.filaExportar}>
            <Pressable style={[estilos.botonAdmin, { flex: 1 }]} onPress={() => exportarResultados('csv')} disabled={exportando}>
              {exportando ? <ActivityIndicator color={colores.navy} /> : <Text style={estilos.botonAdminTexto}>Exportar CSV</Text>}
            </Pressable>
            <Pressable style={[estilos.botonAdmin, { flex: 1 }]} onPress={() => exportarResultados('pdf')} disabled={exportando}>
              {exportando ? <ActivityIndicator color={colores.navy} /> : <Text style={estilos.botonAdminTexto}>Exportar PDF</Text>}
            </Pressable>
          </View>

          <View style={estilos.divisor} />
          <Pressable style={estilos.filaEnlace} onPress={confirmarEliminacion} disabled={enviando}>
            <Ionicons name="trash-outline" size={20} color={colores.error} />
            <Text style={[estilos.filaEnlaceTexto, { color: colores.error }]}>Eliminar torneo</Text>
          </Pressable>
        </View>
      )}

      {puedoGenerarCuadro && (
        <View style={estilos.tarjeta}>
          <Text style={estilos.tarjetaTitulo}>GENERAR CUADRO</Text>
          <SelectorOpciones etiqueta="Siembra" opciones={OPCIONES_SIEMBRA} valor={siembraCuadro} onCambiar={setSiembraCuadro} />
          <Pressable style={estilos.boton} onPress={generarCuadro} disabled={enviando}>
            {enviando ? <ActivityIndicator color={colores.textoClaro} /> : <Text style={estilos.botonTexto}>Generar cuadro</Text>}
          </Pressable>
        </View>
      )}

      <Pressable style={estilos.filaSubtituloConAccion} onPress={() => setInscritosAbiertos((v) => !v)}>
        <Text style={[estilos.subtitulo, { marginTop: 0 }]}>Inscritos ({inscritos.length})</Text>
        <Ionicons name={inscritosAbiertos ? 'chevron-up' : 'chevron-down'} size={18} color={colores.textoSecundario} />
      </Pressable>
      {inscritosAbiertos && (
        <View style={estilos.tarjeta}>
          {inscritos.length === 0 ? (
            <Text style={estilos.vacio}>Todavía no hay inscritos</Text>
          ) : (
            inscritos.map((item, i) => (
              <View key={item.id} style={[estilos.filaInscrito, i > 0 && estilos.filaConDivisor]}>
                <Avatar nombre={item.usuario.nombre} tamano={32} />
                <Text style={estilos.inscritoNombre}>{item.usuario.nombre}</Text>
                {item.usuario.tipo === 'externo' && (
                  <View style={estilos.tagExterno}>
                    <Text style={estilos.tagExternoTexto}>Externo</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      )}

      {bloqueCuadro}

      <SeccionGrupos torneoId={id} torneo={torneo} inscritos={inscritos} esAdmin={esAdmin} token={token} onCambio={cargar} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.fondo },
  contenedor: { padding: 16, paddingBottom: 48, backgroundColor: colores.fondo },
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
  badge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radios.pildora, marginBottom: 12 },
  badgeTexto: { fontSize: 12, fontWeight: '700' },
  nombre: { fontSize: 21, fontWeight: '800', color: colores.texto, textAlign: 'center' },
  filaChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 12 },
  chip: { backgroundColor: colores.gris, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radios.pildora },
  chipTexto: { fontSize: 12, fontWeight: '600', color: colores.textoSecundario, textTransform: 'capitalize' },
  filaFecha: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  fecha: { color: colores.textoSecundario, fontSize: 12 },
  error: { color: colores.error, marginTop: 12, textAlign: 'center' },
  accionesJugador: { width: '100%', marginTop: 16, gap: 10 },
  boton: { backgroundColor: colores.navy, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  botonTexto: { color: colores.textoClaro, fontWeight: '700' },
  botonSecundario: { paddingVertical: 10, alignItems: 'center' },
  botonSecundarioTexto: { color: colores.error, fontWeight: '600' },
  botonAdmin: { borderWidth: 1, borderColor: colores.navy, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  botonAdminTexto: { color: colores.navy, fontWeight: '600' },
  filaExportar: { flexDirection: 'row', gap: 10, marginTop: 12 },
  subtitulo: { fontWeight: '700', color: colores.texto, marginTop: 24, marginBottom: 8, fontSize: 15 },
  filaSubtituloConAccion: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 8 },
  enlaceEditarCruces: { color: colores.acento, fontWeight: '700', fontSize: 13 },
  tarjeta: {
    backgroundColor: colores.tarjeta,
    borderRadius: radios.tarjeta,
    padding: 18,
    marginTop: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  tarjetaTitulo: { fontSize: 11, fontWeight: '700', color: colores.textoSecundario, letterSpacing: 0.5, marginBottom: 4 },
  filaEnlace: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  filaEnlaceTexto: { flex: 1, fontSize: 14, color: colores.texto, fontWeight: '600' },
  divisor: { height: 1, backgroundColor: colores.borde },
  vacio: { color: colores.textoSecundario, fontSize: 13 },
  filaInscrito: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  filaConDivisor: { borderTopWidth: 1, borderTopColor: colores.borde },
  inscritoNombre: { fontSize: 14, color: colores.texto, fontWeight: '600', flex: 1 },
  tagExterno: { backgroundColor: colores.infoFondo, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radios.pildora },
  tagExternoTexto: { fontSize: 11, color: colores.info, fontWeight: '700' },
  bloqueRonda: { marginBottom: 16 },
  nombreRonda: { fontWeight: '700', color: colores.navy, marginBottom: 8 },
  filaPartido: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colores.tarjeta,
    padding: 14,
    borderRadius: radios.tarjeta,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  jugadoresPartido: { fontSize: 13, color: colores.texto, flex: 1, marginRight: 8, fontWeight: '600' },
  filaPartidoEditable: {
    backgroundColor: colores.tarjeta,
    borderRadius: radios.tarjeta,
    borderWidth: 1,
    borderColor: colores.navy,
    padding: 12,
    marginBottom: 8,
  },
  filaCruceEditable: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipJugador: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    backgroundColor: colores.gris,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chipJugadorTexto: { fontSize: 12.5, fontWeight: '600', color: colores.texto, flexShrink: 1 },
  vsTexto: { fontSize: 11, color: colores.textoSecundario, fontWeight: '700' },
  listaCandidatos: { marginTop: 10, borderTopWidth: 1, borderTopColor: colores.borde, paddingTop: 10, gap: 4 },
  listaCandidatosTitulo: { fontSize: 12, fontWeight: '700', color: colores.textoSecundario, marginBottom: 4 },
  candidato: { paddingVertical: 8, paddingHorizontal: 10, backgroundColor: colores.gris, borderRadius: 8, marginBottom: 4 },
  candidatoTexto: { fontSize: 13, color: colores.texto, fontWeight: '600' },
  cancelarTexto: { textAlign: 'center', color: colores.textoSecundario, marginTop: 6, fontSize: 13 },
});

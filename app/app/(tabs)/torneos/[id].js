import { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { apiFetch } from '../../../src/api/client';
import { useAuth } from '../../../src/auth/AuthContext';
import SeccionGrupos from '../../../src/components/SeccionGrupos';
import { descargarYCompartir } from '../../../src/lib/exportar';

const NOMBRE_ESTADO = {
  inscripciones_abiertas: 'Inscripciones abiertas',
  inscripciones_cerradas: 'Inscripciones cerradas',
  en_curso: 'En curso',
  finalizado: 'Finalizado',
};

const ETIQUETAS_ESTADO_PARTIDO = {
  por_definir: 'Por definir',
  pendiente: 'Pendiente de jugarse',
  confirmado: 'Confirmado',
  en_revision: 'En revisión',
  anulado: 'Anulado',
};

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
        <ActivityIndicator />
      </View>
    );
  }

  const estoyInscrito = inscritos.some((i) => i.usuarioId === usuario.id);
  const inscripcionesAbiertas = torneo.estado === 'inscripciones_abiertas';
  const puedoRetirarme = estoyInscrito && ['inscripciones_abiertas', 'inscripciones_cerradas'].includes(torneo.estado);
  const puedoGenerarCuadro =
    esAdmin && torneo.formato === 'eliminacion_directa' && torneo.estado === 'inscripciones_cerradas' && cuadro.length === 0;

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
    accion(() => apiFetch(`/torneos/${id}/cuadro/generar`, { method: 'POST', token, body: JSON.stringify({ siembra: 'aleatorio' }) }));

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

  return (
    <ScrollView contentContainerStyle={estilos.contenedor}>
      <Text style={estilos.nombre}>{torneo.nombre}</Text>
      <Text style={estilos.detalle}>
        {torneo.tipo === 'oficial' ? 'Oficial' : 'Flash'} · {torneo.alcance === 'abierto' ? 'Abierto' : 'Interno'} ·{' '}
        {torneo.formato.replace('_', ' ')}
      </Text>
      <Text style={estilos.estado}>{NOMBRE_ESTADO[torneo.estado]}</Text>
      <Text style={estilos.fecha}>
        {new Date(torneo.fechaInicio).toLocaleDateString('es-CO')} — {new Date(torneo.fechaFin).toLocaleDateString('es-CO')}
      </Text>

      {error && <Text style={estilos.error}>{error}</Text>}

      <View style={estilos.acciones}>
        {inscripcionesAbiertas && !estoyInscrito && (
          <Pressable style={estilos.boton} onPress={inscribirme} disabled={enviando}>
            {enviando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.botonTexto}>Inscribirme</Text>}
          </Pressable>
        )}

        {puedoRetirarme && (
          <Pressable style={estilos.botonSecundario} onPress={retirarme} disabled={enviando}>
            <Text style={estilos.botonSecundarioTexto}>Retirar mi inscripción</Text>
          </Pressable>
        )}

        {esAdmin && (
          <Pressable
            style={estilos.botonAdmin}
            onPress={() => router.push(`/torneos/editar?torneoId=${id}`)}
            disabled={enviando}
          >
            <Text style={estilos.botonAdminTexto}>Editar torneo</Text>
          </Pressable>
        )}

        {esAdmin && inscripcionesAbiertas && (
          <Pressable style={estilos.botonAdmin} onPress={cerrarInscripciones} disabled={enviando}>
            <Text style={estilos.botonAdminTexto}>Cerrar inscripciones</Text>
          </Pressable>
        )}

        {puedoGenerarCuadro && (
          <Pressable style={estilos.botonAdmin} onPress={generarCuadro} disabled={enviando}>
            {enviando ? <ActivityIndicator color="#0B1E4D" /> : <Text style={estilos.botonAdminTexto}>Generar cuadro</Text>}
          </Pressable>
        )}

        {esAdmin && torneo.alcance === 'abierto' && (
          <Pressable
            style={estilos.botonAdmin}
            onPress={() => router.push(`/torneos/invitado?torneoId=${id}`)}
            disabled={enviando}
          >
            <Text style={estilos.botonAdminTexto}>Agregar invitado</Text>
          </Pressable>
        )}

        {esAdmin && (
          <View style={estilos.filaExportar}>
            <Pressable style={[estilos.botonAdmin, { flex: 1 }]} onPress={() => exportarResultados('csv')} disabled={exportando}>
              {exportando ? <ActivityIndicator color="#0B1E4D" /> : <Text style={estilos.botonAdminTexto}>Exportar CSV</Text>}
            </Pressable>
            <Pressable style={[estilos.botonAdmin, { flex: 1 }]} onPress={() => exportarResultados('pdf')} disabled={exportando}>
              {exportando ? <ActivityIndicator color="#0B1E4D" /> : <Text style={estilos.botonAdminTexto}>Exportar PDF</Text>}
            </Pressable>
          </View>
        )}

        {esAdmin && (
          <Pressable style={estilos.botonEliminar} onPress={confirmarEliminacion} disabled={enviando}>
            <Text style={estilos.botonEliminarTexto}>Eliminar torneo</Text>
          </Pressable>
        )}
      </View>

      <Text style={estilos.subtitulo}>Inscritos ({inscritos.length})</Text>
      {inscritos.length === 0 ? (
        <Text style={estilos.vacio}>Todavía no hay inscritos</Text>
      ) : (
        inscritos.map((item) => (
          <View key={item.id} style={estilos.filaInscrito}>
            <Text style={estilos.inscritoNombre}>{item.usuario.nombre}</Text>
            {item.usuario.tipo === 'externo' && <Text style={estilos.tagExterno}>Externo</Text>}
          </View>
        ))
      )}

      <SeccionGrupos torneoId={id} torneo={torneo} inscritos={inscritos} esAdmin={esAdmin} token={token} onCambio={cargar} />

      {rondas.length > 0 && (
        <>
          <Text style={estilos.subtitulo}>Cuadro</Text>
          {rondas.map((ronda) => (
            <View key={ronda.nombre} style={estilos.bloqueRonda}>
              <Text style={estilos.nombreRonda}>{ronda.nombre}</Text>
              {ronda.partidos.map((p) => (
                <Pressable key={p.id} style={estilos.filaPartido} onPress={() => router.push(`/partidos/${p.id}`)}>
                  <Text style={estilos.jugadoresPartido}>
                    {p.jugadorA?.nombre || 'Por definir'} vs {p.jugadorB?.nombre || 'Por definir'}
                  </Text>
                  <Text style={estilos.estadoPartido}>{ETIQUETAS_ESTADO_PARTIDO[p.estado]}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contenedor: { padding: 20, alignItems: 'center', backgroundColor: '#fff' },
  nombre: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  detalle: { color: '#555', marginTop: 4, textTransform: 'capitalize' },
  estado: { color: '#0B1E4D', fontWeight: '600', marginTop: 8 },
  fecha: { color: '#888', fontSize: 12, marginTop: 4 },
  error: { color: '#dc2626', marginTop: 12, textAlign: 'center' },
  acciones: { width: '100%', marginTop: 20, gap: 10 },
  boton: { backgroundColor: '#0B1E4D', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  botonTexto: { color: '#fff', fontWeight: '700' },
  botonSecundario: { paddingVertical: 10, alignItems: 'center' },
  botonSecundarioTexto: { color: '#dc2626', fontWeight: '600' },
  botonAdmin: { borderWidth: 1, borderColor: '#0B1E4D', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  botonAdminTexto: { color: '#0B1E4D', fontWeight: '600' },
  filaExportar: { flexDirection: 'row', gap: 10 },
  botonEliminar: { borderWidth: 1, borderColor: '#dc2626', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  botonEliminarTexto: { color: '#dc2626', fontWeight: '600' },
  subtitulo: { alignSelf: 'flex-start', fontWeight: '600', marginTop: 28, marginBottom: 8 },
  vacio: { color: '#888', fontSize: 13, alignSelf: 'flex-start' },
  filaInscrito: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    width: '100%',
  },
  inscritoNombre: { fontSize: 14 },
  tagExterno: { fontSize: 11, color: '#7e22ce', fontWeight: '600' },
  bloqueRonda: { width: '100%', marginBottom: 16 },
  nombreRonda: { fontWeight: '700', color: '#0B1E4D', marginBottom: 6 },
  filaPartido: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 6,
  },
  jugadoresPartido: { fontSize: 13, flex: 1, marginRight: 8 },
  estadoPartido: { fontSize: 11, color: '#666' },
});

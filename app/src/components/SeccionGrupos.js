import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { apiFetch } from '../api/client';
import SelectorOpciones from './SelectorOpciones';

const METODOS = [
  { valor: 'aleatorio', etiqueta: 'Aleatorio' },
  { valor: 'ranking_serpentina', etiqueta: 'Por ranking' },
  { valor: 'manual', etiqueta: 'Manual' },
];

export default function SeccionGrupos({ torneoId, torneo, inscritos, esAdmin, token, onCambio }) {
  const [grupos, setGrupos] = useState([]);
  const [tablas, setTablas] = useState({});
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [numeroGrupos, setNumeroGrupos] = useState('2');
  const [metodoAsignacion, setMetodoAsignacion] = useState('aleatorio');
  const [clasificadosPorGrupo, setClasificadosPorGrupo] = useState('2');

  const publicado = ['en_curso', 'finalizado'].includes(torneo.estado);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const datosGrupos = await apiFetch(`/torneos/${torneoId}/grupos`);
      setGrupos(datosGrupos);

      if (publicado && datosGrupos.length > 0) {
        const entradas = await Promise.all(
          datosGrupos.map(async (g) => [g.id, (await apiFetch(`/torneos/${torneoId}/grupos/${g.id}/tabla`)).tabla]),
        );
        setTablas(Object.fromEntries(entradas));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [torneoId, publicado]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function accion(fn) {
    setError(null);
    setEnviando(true);
    try {
      await fn();
      await cargar();
      onCambio?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  }

  function abrirFormulario() {
    // Prellena con la configuración actual del torneo (si ya se generaron grupos antes)
    setNumeroGrupos(String(torneo.numeroGrupos || 2));
    setMetodoAsignacion(torneo.metodoAsignacionGrupos || 'aleatorio');
    setClasificadosPorGrupo(String(torneo.clasificadosPorGrupo || 2));
    setMostrarFormulario(true);
  }

  function generarGrupos() {
    accion(() =>
      apiFetch(`/torneos/${torneoId}/grupos/generar`, {
        method: 'POST',
        token,
        body: JSON.stringify({
          numeroGrupos: Number(numeroGrupos),
          metodoAsignacion,
          ...(torneo.formato === 'mixto' ? { clasificadosPorGrupo: Number(clasificadosPorGrupo) } : {}),
        }),
      }),
    ).then(() => setMostrarFormulario(false));
  }

  function asignar(usuarioId, grupoId) {
    accion(() => apiFetch(`/torneos/${torneoId}/grupos/${grupoId}`, { method: 'PATCH', token, body: JSON.stringify({ usuarioId }) }));
  }

  function publicar() {
    accion(() => apiFetch(`/torneos/${torneoId}/grupos/publicar`, { method: 'POST', token }));
  }

  if (torneo.formato !== 'grupos' && torneo.formato !== 'mixto') {
    return null;
  }

  if (cargando) {
    return (
      <View style={{ marginTop: 20 }}>
        <ActivityIndicator />
      </View>
    );
  }

  const gruposPorUsuario = new Map();
  grupos.forEach((g) => g.jugadores.forEach((j) => gruposPorUsuario.set(j.usuarioId, g.id)));
  const sinAsignar = inscritos.filter((i) => !gruposPorUsuario.has(i.usuarioId));
  const puedeEditarConfiguracion = esAdmin && !publicado && torneo.estado === 'inscripciones_cerradas';
  const puedePublicar = esAdmin && grupos.length > 0 && !publicado && sinAsignar.length === 0;

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.subtitulo}>Grupos</Text>
      {error && <Text style={estilos.error}>{error}</Text>}

      {grupos.length === 0 && !esAdmin && <Text style={estilos.vacio}>Los grupos todavía no se han generado</Text>}

      {puedeEditarConfiguracion && !mostrarFormulario && (
        <Pressable style={estilos.botonAdmin} onPress={abrirFormulario}>
          <Text style={estilos.botonAdminTexto}>{grupos.length === 0 ? 'Generar grupos' : 'Editar configuración de grupos'}</Text>
        </Pressable>
      )}

      {mostrarFormulario && (
        <View style={{ width: '100%', marginTop: 12 }}>
          {grupos.length > 0 && (
            <Text style={estilos.aviso}>Esto reemplaza los grupos y las asignaciones que ya hiciste.</Text>
          )}
          <Text style={estilos.etiqueta}>Número de grupos</Text>
          <TextInput
            style={estilos.input}
            keyboardType="number-pad"
            value={numeroGrupos}
            onChangeText={(v) => setNumeroGrupos(v.replace(/[^0-9]/g, ''))}
          />
          <SelectorOpciones etiqueta="Método de asignación" opciones={METODOS} valor={metodoAsignacion} onCambiar={setMetodoAsignacion} />
          {torneo.formato === 'mixto' && (
            <>
              <Text style={estilos.etiqueta}>Clasificados por grupo (a la eliminación)</Text>
              <TextInput
                style={estilos.input}
                keyboardType="number-pad"
                value={clasificadosPorGrupo}
                onChangeText={(v) => setClasificadosPorGrupo(v.replace(/[^0-9]/g, ''))}
              />
            </>
          )}
          <View style={estilos.filaBotonesFormulario}>
            <Pressable style={estilos.botonSecundario} onPress={() => setMostrarFormulario(false)} disabled={enviando}>
              <Text style={estilos.botonSecundarioTexto}>Cancelar</Text>
            </Pressable>
            <Pressable style={[estilos.boton, { flex: 1 }]} onPress={generarGrupos} disabled={enviando || !numeroGrupos}>
              {enviando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.botonTexto}>Confirmar</Text>}
            </Pressable>
          </View>
        </View>
      )}

      {grupos.map((g) => (
        <View key={g.id} style={estilos.bloqueGrupo}>
          <Text style={estilos.nombreGrupo}>{g.nombre}</Text>

          {!publicado &&
            g.jugadores.map((j) => (
              <Text key={j.id} style={estilos.jugadorLinea}>
                {j.usuario.nombre}
              </Text>
            ))}
          {!publicado && g.jugadores.length === 0 && <Text style={estilos.vacio}>Sin jugadores todavía</Text>}

          {publicado && tablas[g.id] && (
            <View style={estilos.tabla}>
              <View style={estilos.filaTablaEncabezado}>
                <Text style={[estilos.celda, estilos.celdaNombre]}>Jugador</Text>
                <Text style={estilos.celda}>PJ</Text>
                <Text style={estilos.celda}>PG</Text>
                <Text style={estilos.celda}>PP</Text>
                <Text style={estilos.celda}>Sets</Text>
              </View>
              {tablas[g.id].map((fila) => (
                <View key={fila.usuarioId} style={estilos.filaTabla}>
                  <Text style={[estilos.celda, estilos.celdaNombre]}>{fila.nombre}</Text>
                  <Text style={estilos.celda}>{fila.jugados}</Text>
                  <Text style={estilos.celda}>{fila.ganados}</Text>
                  <Text style={estilos.celda}>{fila.perdidos}</Text>
                  <Text style={estilos.celda}>
                    {fila.setsFavor}-{fila.setsContra}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}

      {grupos.length > 0 && esAdmin && !publicado && (
        <View style={{ width: '100%', marginTop: 16 }}>
          <Text style={estilos.etiqueta}>Asignar / mover jugadores</Text>
          {inscritos.map((i) => {
            const grupoActualId = gruposPorUsuario.get(i.usuarioId);
            return (
              <View key={i.id} style={estilos.filaAsignacion}>
                <Text style={{ flex: 1 }}>{i.usuario.nombre}</Text>
                <View style={estilos.pildoras}>
                  {grupos.map((g) => {
                    const activo = grupoActualId === g.id;
                    return (
                      <Pressable
                        key={g.id}
                        style={[estilos.pildora, activo && estilos.pildoraActiva]}
                        onPress={() => !activo && asignar(i.usuarioId, g.id)}
                        disabled={enviando || activo}
                      >
                        <Text style={[estilos.pildoraTexto, activo && estilos.pildoraTextoActivo]}>{g.nombre.replace('Grupo ', '')}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {puedePublicar && (
        <Pressable style={estilos.boton} onPress={publicar} disabled={enviando}>
          {enviando ? <ActivityIndicator color="#fff" /> : <Text style={estilos.botonTexto}>Publicar grupos</Text>}
        </Pressable>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { width: '100%', marginTop: 12 },
  subtitulo: { fontWeight: '600', marginBottom: 8 },
  error: { color: '#dc2626', marginBottom: 8 },
  vacio: { color: '#888', fontSize: 13 },
  aviso: { color: '#b45309', fontSize: 12, marginBottom: 8 },
  etiqueta: { fontSize: 13, fontWeight: '600', color: '#444', marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, width: 80 },
  boton: { backgroundColor: '#1d4ed8', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 14 },
  botonTexto: { color: '#fff', fontWeight: '700' },
  botonAdmin: { borderWidth: 1, borderColor: '#1d4ed8', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  botonAdminTexto: { color: '#1d4ed8', fontWeight: '600' },
  filaBotonesFormulario: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 14 },
  botonSecundario: { paddingVertical: 12, paddingHorizontal: 8 },
  botonSecundarioTexto: { color: '#666', fontWeight: '600' },
  bloqueGrupo: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, marginTop: 10 },
  nombreGrupo: { fontWeight: '700', color: '#1d4ed8', marginBottom: 6 },
  jugadorLinea: { fontSize: 13, paddingVertical: 2 },
  filaAsignacion: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  pildoras: { flexDirection: 'row', gap: 6 },
  pildora: { backgroundColor: '#e0e7ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pildoraActiva: { backgroundColor: '#1d4ed8' },
  pildoraTexto: { fontSize: 12, color: '#3730a3', fontWeight: '600' },
  pildoraTextoActivo: { color: '#fff' },
  tabla: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 6 },
  filaTablaEncabezado: { flexDirection: 'row', marginBottom: 4 },
  filaTabla: { flexDirection: 'row', paddingVertical: 3 },
  celda: { width: 40, fontSize: 11, color: '#555', textAlign: 'center' },
  celdaNombre: { flex: 1, width: 'auto', textAlign: 'left', fontWeight: '600', color: '#333' },
});

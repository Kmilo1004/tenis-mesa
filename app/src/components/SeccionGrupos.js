import { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { router } from 'expo-router';
import { apiFetch } from '../api/client';
import SelectorOpciones from './SelectorOpciones';

const ETIQUETAS_ESTADO_PARTIDO = {
  por_definir: 'Por definir',
  pendiente: 'Pendiente',
  pendiente_aprobacion: 'Por aprobar',
  confirmado: 'Confirmado',
  en_revision: 'En disputa',
  anulado: 'Anulado',
};

const METODOS = [
  { valor: 'aleatorio', etiqueta: 'Aleatorio' },
  { valor: 'ranking_serpentina', etiqueta: 'Por ranking' },
  { valor: 'manual', etiqueta: 'Manual' },
];

// Arma la cuadrícula de resultados cruzados de un grupo (fila = jugador, columna = número de
// rival): matriz[i][j] = sets que ganó el jugador i contra el jugador j (o null si no jugaron
// entre ellos todavía). Mismo cálculo que usa el reporte en PDF, para que ambos coincidan.
function construirMatrizGrupo(jugadores, partidos) {
  const indice = new Map(jugadores.map((j, i) => [j.usuarioId, i]));
  const matriz = jugadores.map(() => jugadores.map(() => null));

  for (const p of partidos) {
    if (p.estado !== 'confirmado' || !p.jugadorA || !p.jugadorB) continue;
    const i = indice.get(p.jugadorA.id);
    const j = indice.get(p.jugadorB.id);
    if (i === undefined || j === undefined) continue;

    const setsA = p.sets.filter((s) => s.puntosJugadorA > s.puntosJugadorB).length;
    const setsB = p.sets.length - setsA;
    matriz[i][j] = setsA;
    matriz[j][i] = setsB;
  }

  return matriz;
}

export default function SeccionGrupos({ torneoId, torneo, inscritos, esAdmin, token, onCambio }) {
  const [grupos, setGrupos] = useState([]);
  const [tablas, setTablas] = useState({});
  const [partidosPorGrupo, setPartidosPorGrupo] = useState({});
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

        const entradasPartidos = await Promise.all(
          datosGrupos.map(async (g) => [g.id, (await apiFetch(`/torneos/${torneoId}/grupos/${g.id}/partidos`)).partidos]),
        );
        setPartidosPorGrupo(Object.fromEntries(entradasPartidos));
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
          <Text style={estilos.botonAdminTexto}>{grupos.length === 0 ? 'Generar grupos' : 'Regenerar grupos desde cero'}</Text>
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

          {publicado && tablas[g.id] && (() => {
            const jugadoresGrupo = g.jugadores.map((j) => ({ usuarioId: j.usuarioId, nombre: j.usuario.nombre }));
            const matriz = construirMatrizGrupo(jugadoresGrupo, partidosPorGrupo[g.id] || []);
            const posicionPorUsuario = new Map(tablas[g.id].map((t, i) => [t.usuarioId, i + 1]));
            const statsPorUsuario = new Map(tablas[g.id].map((t) => [t.usuarioId, t]));

            return (
              <View style={estilos.tablaCuadricula}>
                <View style={estilos.filaCuadricula}>
                  <View style={[estilos.celdaCuadro, estilos.celdaNombreCuadro]} />
                  {jugadoresGrupo.map((_, i) => (
                    <View key={i} style={[estilos.celdaCuadro, estilos.celdaEncabezado]}>
                      <Text style={estilos.textoEncabezado}>{i + 1}</Text>
                    </View>
                  ))}
                  <View style={[estilos.celdaCuadro, estilos.celdaEncabezado]}>
                    <Text style={estilos.textoEncabezado}>Pts.</Text>
                  </View>
                  <View style={[estilos.celdaCuadro, estilos.celdaEncabezado]}>
                    <Text style={estilos.textoEncabezado}>Pos.</Text>
                  </View>
                </View>

                {jugadoresGrupo.map((jugador, i) => {
                  const stats = statsPorUsuario.get(jugador.usuarioId);
                  return (
                    <View key={jugador.usuarioId} style={estilos.filaCuadricula}>
                      <View style={[estilos.celdaCuadro, estilos.celdaNombreCuadro]}>
                        <Text style={estilos.textoNombreCuadro} numberOfLines={1}>
                          {jugador.nombre}
                        </Text>
                      </View>
                      {jugadoresGrupo.map((_, j) => {
                        const esDiagonal = i === j;
                        const valor = matriz[i][j];
                        return (
                          <View key={j} style={[estilos.celdaCuadro, esDiagonal && estilos.celdaDiagonal]}>
                            {!esDiagonal && valor !== null && <Text style={estilos.textoCuadro}>{valor}</Text>}
                          </View>
                        );
                      })}
                      <View style={estilos.celdaCuadro}>
                        <Text style={estilos.textoPtsPos}>{stats ? stats.ganados : ''}</Text>
                      </View>
                      <View style={estilos.celdaCuadro}>
                        <Text style={estilos.textoPtsPos}>{posicionPorUsuario.get(jugador.usuarioId) || ''}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })()}

          {publicado && partidosPorGrupo[g.id]?.length > 0 && (
            <View style={estilos.listaPartidos}>
              {partidosPorGrupo[g.id].map((p) => (
                <Pressable key={p.id} style={estilos.filaPartido} onPress={() => router.push(`/partidos/${p.id}?desdeTorneo=${torneoId}`)}>
                  <Text style={estilos.filaPartidoTexto}>
                    {p.jugadorA?.nombre || 'Por definir'} vs {p.jugadorB?.nombre || 'Por definir'}
                  </Text>
                  <Text style={estilos.filaPartidoEstado}>{ETIQUETAS_ESTADO_PARTIDO[p.estado] || p.estado}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      ))}

      {grupos.length > 0 && esAdmin && !publicado && (
        <View style={estilos.bloqueMover}>
          <Text style={estilos.tituloMover}>Mover jugadores entre grupos</Text>
          <Text style={estilos.subtituloMover}>
            Ajusta manualmente quién quedó en qué grupo (por ejemplo, si generaste por ranking y quieres afinarlo) sin perder el resto de
            la distribución.
          </Text>
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
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, width: 80, color: '#111827' },
  boton: { backgroundColor: '#0B1E4D', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 14 },
  botonTexto: { color: '#fff', fontWeight: '700' },
  botonAdmin: { borderWidth: 1, borderColor: '#0B1E4D', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  botonAdminTexto: { color: '#0B1E4D', fontWeight: '600' },
  filaBotonesFormulario: { flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 14 },
  botonSecundario: { paddingVertical: 12, paddingHorizontal: 8 },
  botonSecundarioTexto: { color: '#666', fontWeight: '600' },
  bloqueGrupo: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, marginTop: 10 },
  nombreGrupo: { fontWeight: '700', color: '#0B1E4D', marginBottom: 6 },
  bloqueMover: { width: '100%', backgroundColor: '#f9fafb', borderRadius: 8, padding: 12, marginTop: 16 },
  tituloMover: { fontWeight: '700', color: '#0B1E4D', marginBottom: 4 },
  subtituloMover: { fontSize: 12, color: '#666', marginBottom: 10 },
  jugadorLinea: { fontSize: 13, paddingVertical: 2 },
  filaAsignacion: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  pildoras: { flexDirection: 'row', gap: 6 },
  pildora: { backgroundColor: '#e0e7ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pildoraActiva: { backgroundColor: '#0B1E4D' },
  pildoraTexto: { fontSize: 12, color: '#3730a3', fontWeight: '600' },
  pildoraTextoActivo: { color: '#fff' },
  tablaCuadricula: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8 },
  filaCuadricula: { flexDirection: 'row' },
  celdaCuadro: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: '#e5e7eb',
  },
  celdaNombreCuadro: { width: 'auto', flex: 1, borderWidth: 0, alignItems: 'flex-start', paddingRight: 4 },
  celdaEncabezado: { backgroundColor: '#eef0f7' },
  celdaDiagonal: { backgroundColor: '#d1d5db' },
  textoEncabezado: { fontSize: 9.5, fontWeight: '700', color: '#333' },
  textoNombreCuadro: { fontSize: 11, fontWeight: '600', color: '#333' },
  textoCuadro: { fontSize: 10.5, color: '#333' },
  textoPtsPos: { fontSize: 10.5, fontWeight: '700', color: '#0B1E4D' },
  listaPartidos: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8, gap: 6 },
  filaPartido: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  filaPartidoTexto: { fontSize: 12.5, color: '#333', flex: 1, marginRight: 8 },
  filaPartidoEstado: { fontSize: 11, color: '#b45309', fontWeight: '600' },
});

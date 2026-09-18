import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput, StyleSheet, ActivityIndicator, Switch } from 'react-native';
import { Stack, useFocusEffect } from 'expo-router';
import { apiFetch } from '../src/api/client';
import { useAuth } from '../src/auth/AuthContext';
import Avatar from '../src/components/Avatar';
import { avisar, confirmarAccion } from '../src/lib/alertas';
import { NIVELES } from '../src/lib/niveles';
import { colores, radios } from '../src/theme/colores';

const ROLES = [
  { valor: 'arbitro', etiqueta: 'Árbitro' },
  { valor: 'administrador', etiqueta: 'Administrador' },
];

export default function GestionarRoles() {
  const { usuario, token } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [actualizando, setActualizando] = useState(null); // `${usuarioId}:${rol}`
  const [restableciendoId, setRestableciendoId] = useState(null);
  const [cambiandoNivelId, setCambiandoNivelId] = useState(null);
  const [editandoEloId, setEditandoEloId] = useState(null);
  const [eloOficialInput, setEloOficialInput] = useState('');
  const [eloNoOficialInput, setEloNoOficialInput] = useState('');
  const [guardandoEloId, setGuardandoEloId] = useState(null);

  const [mostrarNivelEnRanking, setMostrarNivelEnRanking] = useState(false);
  const [guardandoConfig, setGuardandoConfig] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const q = busqueda.trim();
      const datos = await apiFetch(`/usuarios${q.length >= 2 ? `?q=${encodeURIComponent(q)}` : ''}`, { token });
      setUsuarios(datos);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [busqueda, token]);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar]),
  );

  useEffect(() => {
    if (!token) return;
    apiFetch('/configuracion', { token })
      .then((datos) => setMostrarNivelEnRanking(datos.mostrarNivelEnRanking))
      .catch(() => {
        // no es crítico: si falla, el interruptor simplemente queda apagado
      });
  }, [token]);

  async function alternarMostrarNivel(valor) {
    setMostrarNivelEnRanking(valor);
    setGuardandoConfig(true);
    try {
      await apiFetch('/configuracion', { method: 'PATCH', token, body: JSON.stringify({ mostrarNivelEnRanking: valor }) });
    } catch (err) {
      setMostrarNivelEnRanking(!valor);
      avisar('No se pudo guardar', err.message);
    } finally {
      setGuardandoConfig(false);
    }
  }

  async function togglearRol(item, rol) {
    const clave = `${item.id}:${rol}`;
    setActualizando(clave);
    try {
      const tieneRol = item.roles.includes(rol);
      const datos = await apiFetch(`/usuarios/${item.id}/roles${tieneRol ? `/${rol}` : ''}`, {
        method: tieneRol ? 'DELETE' : 'POST',
        token,
        ...(tieneRol ? {} : { body: JSON.stringify({ rol }) }),
      });
      setUsuarios((actuales) => actuales.map((u) => (u.id === item.id ? { ...u, roles: datos.roles } : u)));
    } catch (err) {
      avisar('No se pudo cambiar el rol', err.message);
    } finally {
      setActualizando(null);
    }
  }

  async function cambiarNivel(item, nivel) {
    if (nivel === item.nivel) return;
    setCambiandoNivelId(item.id);
    try {
      await apiFetch(`/usuarios/${item.id}/nivel`, { method: 'PATCH', token, body: JSON.stringify({ nivel }) });
      setUsuarios((actuales) => actuales.map((u) => (u.id === item.id ? { ...u, nivel } : u)));
    } catch (err) {
      avisar('No se pudo cambiar el nivel', err.message);
    } finally {
      setCambiandoNivelId(null);
    }
  }

  function abrirEdicionElo(item) {
    setEditandoEloId(item.id);
    setEloOficialInput(String(item.eloOficial));
    setEloNoOficialInput(String(item.eloNoOficial));
  }

  function guardarElo(item) {
    const eloOficial = parseInt(eloOficialInput, 10);
    const eloNoOficial = parseInt(eloNoOficialInput, 10);
    if (!Number.isInteger(eloOficial) || !Number.isInteger(eloNoOficial)) {
      avisar('Valor inválido', 'El ELO debe ser un número entero.');
      return;
    }

    confirmarAccion(
      '¿Cambiar el ELO a mano?',
      `Vas a poner el Ranking Interno de ${item.nombre} en ${eloOficial} y el Ranking en ${eloNoOficial} directamente, sin que haya jugado un partido. Esto puede distorsionar el ranking del club — úsalo solo para corregir un error. Queda registrado en la auditoría.`,
      {
        textoConfirmar: 'Cambiar de todas formas',
        destructivo: true,
        onConfirmar: async () => {
          setGuardandoEloId(item.id);
          try {
            await apiFetch(`/usuarios/${item.id}/elo`, {
              method: 'PATCH',
              token,
              body: JSON.stringify({ eloOficial, eloNoOficial }),
            });
            setUsuarios((actuales) => actuales.map((u) => (u.id === item.id ? { ...u, eloOficial, eloNoOficial } : u)));
            setEditandoEloId(null);
          } catch (err) {
            avisar('No se pudo cambiar el ELO', err.message);
          } finally {
            setGuardandoEloId(null);
          }
        },
      },
    );
  }

  function restablecerPassword(item) {
    confirmarAccion(
      '¿Restablecer la contraseña?',
      `Se le va a generar una contraseña temporal nueva a ${item.nombre}. Tendrás que compartírsela tú por otro medio.`,
      {
        textoConfirmar: 'Restablecer',
        onConfirmar: async () => {
          setRestableciendoId(item.id);
          try {
            const { passwordTemporal } = await apiFetch(`/usuarios/${item.id}/restablecer-password`, { method: 'POST', token });
            avisar('Contraseña temporal generada', `${item.nombre}: ${passwordTemporal}\n\nCompártesela para que inicie sesión y la cambie.`);
          } catch (err) {
            avisar('No se pudo restablecer', err.message);
          } finally {
            setRestableciendoId(null);
          }
        },
      },
    );
  }

  return (
    <View style={estilos.contenedor}>
      <Stack.Screen options={{ title: 'Gestionar roles' }} />

      <View style={estilos.tarjetaConfig}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={estilos.configTitulo}>Mostrar nivel en el ranking</Text>
          <Text style={estilos.configSub}>Muestra la etiqueta de nivel de cada jugador junto a su fila en el ranking general.</Text>
        </View>
        <Switch
          value={mostrarNivelEnRanking}
          onValueChange={alternarMostrarNivel}
          disabled={guardandoConfig}
          trackColor={{ true: colores.navy }}
          thumbColor={colores.textoClaro}
        />
      </View>

      <View style={estilos.buscador}>
        <TextInput
          style={estilos.buscadorInput}
          placeholder="Buscar por nombre..."
          placeholderTextColor={colores.textoSecundario}
          value={busqueda}
          onChangeText={setBusqueda}
          onSubmitEditing={cargar}
          returnKeyType="search"
        />
      </View>

      {cargando ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colores.navy} />
      ) : error ? (
        <Text style={estilos.error}>{error}</Text>
      ) : (
        <FlatList
          data={usuarios}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 8 }}
          onRefresh={cargar}
          refreshing={false}
          ListEmptyComponent={<Text style={estilos.vacio}>No se encontraron usuarios</Text>}
          renderItem={({ item }) => {
            const soyYo = item.id === usuario.id;
            return (
              <View style={estilos.tarjeta}>
                <View style={estilos.filaEncabezado}>
                  <Avatar nombre={item.nombre} avatarSeed={item.avatarSeed} tamano={40} />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={estilos.nombre}>{item.nombre}</Text>
                    <Text style={estilos.correo}>{item.correo}</Text>
                  </View>
                </View>

                <View style={estilos.filaChips}>
                  {ROLES.map((r) => {
                    const activo = item.roles.includes(r.valor);
                    const bloqueado = soyYo && r.valor === 'administrador';
                    const clave = `${item.id}:${r.valor}`;
                    return (
                      <Pressable
                        key={r.valor}
                        style={[estilos.chip, activo && estilos.chipActivo, bloqueado && estilos.chipBloqueado]}
                        onPress={() => !bloqueado && togglearRol(item, r.valor)}
                        disabled={bloqueado || actualizando === clave}
                      >
                        {actualizando === clave ? (
                          <ActivityIndicator size="small" color={activo ? colores.textoClaro : colores.navy} />
                        ) : (
                          <Text style={activo ? estilos.chipTextoActivo : estilos.chipTexto}>{r.etiqueta}</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
                {soyYo && <Text style={estilos.notaPropia}>No puedes modificar tu propio rol de administrador</Text>}

                <Text style={estilos.etiquetaNivelSeccion}>Nivel</Text>
                <View style={estilos.filaNiveles}>
                  {NIVELES.map((n) => {
                    const activo = item.nivel === n.valor;
                    return (
                      <Pressable
                        key={n.valor}
                        style={[estilos.chipNivel, activo && { backgroundColor: n.color, borderColor: n.color }]}
                        onPress={() => cambiarNivel(item, n.valor)}
                        disabled={cambiandoNivelId === item.id}
                      >
                        {cambiandoNivelId === item.id && activo ? (
                          <ActivityIndicator size="small" color={colores.textoClaro} />
                        ) : (
                          <Text style={[estilos.chipNivelTexto, activo && { color: colores.textoClaro }]}>{n.etiqueta}</Text>
                        )}
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={estilos.etiquetaNivelSeccion}>ELO</Text>
                {editandoEloId === item.id ? (
                  <View>
                    <Text style={estilos.avisoElo}>
                      Cambiarlo a mano no queda como un partido jugado y puede distorsionar el ranking. Solo para corregir errores.
                    </Text>
                    <View style={estilos.filaCamposElo}>
                      <View style={{ flex: 1 }}>
                        <Text style={estilos.etiquetaCampoElo}>Ranking Interno</Text>
                        <TextInput
                          style={estilos.inputElo}
                          keyboardType="number-pad"
                          value={eloOficialInput}
                          onChangeText={(v) => setEloOficialInput(v.replace(/[^0-9]/g, ''))}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={estilos.etiquetaCampoElo}>Ranking</Text>
                        <TextInput
                          style={estilos.inputElo}
                          keyboardType="number-pad"
                          value={eloNoOficialInput}
                          onChangeText={(v) => setEloNoOficialInput(v.replace(/[^0-9]/g, ''))}
                        />
                      </View>
                    </View>
                    <View style={estilos.filaBotonesElo}>
                      <Pressable onPress={() => setEditandoEloId(null)} disabled={guardandoEloId === item.id}>
                        <Text style={estilos.botonCancelarEloTexto}>Cancelar</Text>
                      </Pressable>
                      <Pressable
                        style={estilos.botonGuardarElo}
                        onPress={() => guardarElo(item)}
                        disabled={guardandoEloId === item.id || !eloOficialInput || !eloNoOficialInput}
                      >
                        {guardandoEloId === item.id ? (
                          <ActivityIndicator size="small" color={colores.textoClaro} />
                        ) : (
                          <Text style={estilos.botonGuardarEloTexto}>Guardar ELO</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable style={estilos.filaEloResumen} onPress={() => abrirEdicionElo(item)}>
                    <Text style={estilos.eloResumenTexto}>
                      Interno {item.eloOficial} · Ranking {item.eloNoOficial}
                    </Text>
                    <Text style={estilos.eloResumenEditar}>Editar</Text>
                  </Pressable>
                )}

                <Pressable
                  style={estilos.enlaceRestablecer}
                  onPress={() => restablecerPassword(item)}
                  disabled={restableciendoId === item.id}
                >
                  {restableciendoId === item.id ? (
                    <ActivityIndicator size="small" color={colores.error} />
                  ) : (
                    <Text style={estilos.textoRestablecer}>Restablecer contraseña</Text>
                  )}
                </Pressable>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, backgroundColor: colores.fondo },
  tarjetaConfig: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colores.tarjeta,
    borderRadius: radios.tarjeta,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  configTitulo: { fontSize: 13.5, fontWeight: '700', color: colores.texto },
  configSub: { fontSize: 11.5, color: colores.textoSecundario, marginTop: 3 },
  buscador: { padding: 16, paddingBottom: 8 },
  buscadorInput: {
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colores.tarjeta,
    color: colores.texto,
  },
  error: { color: colores.error, textAlign: 'center', marginTop: 24 },
  vacio: { textAlign: 'center', color: colores.textoSecundario, marginTop: 24 },
  tarjeta: {
    backgroundColor: colores.tarjeta,
    borderRadius: radios.tarjeta,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  filaEncabezado: { flexDirection: 'row', alignItems: 'center' },
  nombre: { fontSize: 15, fontWeight: '700', color: colores.texto },
  correo: { fontSize: 12, color: colores.textoSecundario, marginTop: 1 },
  filaChips: { flexDirection: 'row', gap: 8, marginTop: 12 },
  chip: {
    flex: 1,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.pildora,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
  },
  chipActivo: { backgroundColor: colores.navy, borderColor: colores.navy },
  chipBloqueado: { opacity: 0.4 },
  chipTexto: { color: colores.texto, fontWeight: '600', fontSize: 13 },
  chipTextoActivo: { color: colores.textoClaro, fontWeight: '600', fontSize: 13 },
  notaPropia: { fontSize: 11, color: colores.textoSecundario, marginTop: 8, fontStyle: 'italic' },
  etiquetaNivelSeccion: { fontSize: 11, fontWeight: '700', color: colores.textoSecundario, marginTop: 12, marginBottom: 6 },
  filaNiveles: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chipNivel: {
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.pildora,
    paddingVertical: 6,
    paddingHorizontal: 11,
    minHeight: 30,
    justifyContent: 'center',
  },
  chipNivelTexto: { color: colores.texto, fontWeight: '600', fontSize: 12 },
  enlaceRestablecer: { marginTop: 12, alignItems: 'center', paddingVertical: 4 },
  textoRestablecer: { fontSize: 12.5, color: colores.error, fontWeight: '600' },
  filaEloResumen: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colores.gris,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  eloResumenTexto: { fontSize: 12.5, fontWeight: '600', color: colores.texto },
  eloResumenEditar: { fontSize: 12, fontWeight: '700', color: colores.acento },
  avisoElo: {
    fontSize: 11.5,
    color: colores.advertencia,
    backgroundColor: colores.advertenciaFondo,
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  filaCamposElo: { flexDirection: 'row', gap: 10 },
  etiquetaCampoElo: { fontSize: 11, color: colores.textoSecundario, marginBottom: 4, fontWeight: '600' },
  inputElo: {
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: colores.texto,
  },
  filaBotonesElo: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 16, marginTop: 10 },
  botonCancelarEloTexto: { fontSize: 13, color: colores.textoSecundario, fontWeight: '600' },
  botonGuardarElo: { backgroundColor: colores.navy, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
  botonGuardarEloTexto: { color: colores.textoClaro, fontWeight: '700', fontSize: 13 },
});

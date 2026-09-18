import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, ScrollView, Switch, Linking } from 'react-native';
import { router, Stack } from 'expo-router';
import Constants from 'expo-constants';
import Ionicons from '@expo/vector-icons/Ionicons';
import { apiFetch } from '../src/api/client';
import { useAuth } from '../src/auth/AuthContext';
import CampoTexto from '../src/components/CampoTexto';
import Avatar from '../src/components/Avatar';
import { avisar } from '../src/lib/alertas';
import { notificacionesActivadas, establecerNotificacionesActivadas } from '../src/lib/pushNotifications';
import { esVersionMasNueva } from '../src/lib/actualizaciones';
import { ESTILOS_AVATAR, ESTILO_AVATAR_POR_DEFECTO } from '../src/lib/avatares';
import { colores, radios } from '../src/theme/colores';

const VERSION_ACTUAL = Constants.expoConfig?.version || '1.0.0';

export default function Configuracion() {
  const { usuario, token, cerrarSesion, refrescarUsuario } = useAuth();

  const [nombre, setNombre] = useState(usuario?.nombre || '');
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const [errorNombre, setErrorNombre] = useState(null);

  const [avatarSeed, setAvatarSeed] = useState(usuario?.avatarSeed || usuario?.nombre || '');
  const [avatarEstilo, setAvatarEstilo] = useState(usuario?.avatarEstilo || ESTILO_AVATAR_POR_DEFECTO);
  const [guardandoAvatar, setGuardandoAvatar] = useState(false);
  const [errorAvatar, setErrorAvatar] = useState(null);

  const [pushActivado, setPushActivado] = useState(true);
  const [cambiandoPush, setCambiandoPush] = useState(false);

  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirmar, setPasswordConfirmar] = useState('');
  const [guardandoPassword, setGuardandoPassword] = useState(false);
  const [errorPassword, setErrorPassword] = useState(null);
  const [passwordActualizada, setPasswordActualizada] = useState(false);

  const [buscandoActualizacion, setBuscandoActualizacion] = useState(false);
  const [actualizacionDisponible, setActualizacionDisponible] = useState(null);

  useEffect(() => {
    notificacionesActivadas().then(setPushActivado);
  }, []);

  // El usuario puede tardar un momento en cargar (ej. si se entra directo a esta pantalla); una
  // vez disponible, precarga el campo con el nombre actual.
  useEffect(() => {
    if (usuario) setNombre(usuario.nombre);
  }, [usuario?.nombre]);

  useEffect(() => {
    if (usuario) setAvatarSeed(usuario.avatarSeed || usuario.nombre);
  }, [usuario?.avatarSeed, usuario?.nombre]);

  useEffect(() => {
    if (usuario) setAvatarEstilo(usuario.avatarEstilo || ESTILO_AVATAR_POR_DEFECTO);
  }, [usuario?.avatarEstilo]);

  useEffect(() => {
    buscarActualizacion({ silencioso: true });
  }, []);

  async function buscarActualizacion({ silencioso = false } = {}) {
    setBuscandoActualizacion(true);
    try {
      const datos = await apiFetch('/version');
      if (esVersionMasNueva(datos.version, VERSION_ACTUAL)) {
        setActualizacionDisponible(datos);
      } else {
        setActualizacionDisponible(null);
        if (!silencioso) {
          avisar('Ya estás al día', 'Tienes instalada la última versión de la app.');
        }
      }
    } catch (err) {
      if (!silencioso) {
        avisar('No se pudo buscar actualizaciones', err.message);
      }
    } finally {
      setBuscandoActualizacion(false);
    }
  }

  async function guardarNombre() {
    setErrorNombre(null);
    setGuardandoNombre(true);
    try {
      await apiFetch('/usuarios/me', { method: 'PATCH', token, body: JSON.stringify({ nombre: nombre.trim() }) });
      await refrescarUsuario();
    } catch (err) {
      setErrorNombre(err.message);
    } finally {
      setGuardandoNombre(false);
    }
  }

  function probarOtroAvatar() {
    setErrorAvatar(null);
    setAvatarSeed(Math.random().toString(36).slice(2, 10));
    setAvatarEstilo(ESTILOS_AVATAR[Math.floor(Math.random() * ESTILOS_AVATAR.length)].valor);
  }

  async function guardarAvatar() {
    setErrorAvatar(null);
    setGuardandoAvatar(true);
    try {
      await apiFetch('/usuarios/me', { method: 'PATCH', token, body: JSON.stringify({ avatarSeed, avatarEstilo }) });
      await refrescarUsuario();
    } catch (err) {
      setErrorAvatar(err.message);
    } finally {
      setGuardandoAvatar(false);
    }
  }

  async function alternarPush(valor) {
    setPushActivado(valor);
    setCambiandoPush(true);
    try {
      await establecerNotificacionesActivadas(valor, token);
    } finally {
      setCambiandoPush(false);
    }
  }

  function cambiarPasswordActual(v) {
    setPasswordActual(v);
    setErrorPassword(null);
    setPasswordActualizada(false);
  }
  function cambiarPasswordNueva(v) {
    setPasswordNueva(v);
    setErrorPassword(null);
    setPasswordActualizada(false);
  }
  function cambiarPasswordConfirmar(v) {
    setPasswordConfirmar(v);
    setErrorPassword(null);
    setPasswordActualizada(false);
  }

  async function guardarPassword() {
    setErrorPassword(null);
    setGuardandoPassword(true);
    try {
      await apiFetch('/usuarios/me/password', {
        method: 'PUT',
        token,
        body: JSON.stringify({ passwordActual, passwordNueva }),
      });
      setPasswordActual('');
      setPasswordNueva('');
      setPasswordConfirmar('');
      setPasswordActualizada(true);
    } catch (err) {
      setErrorPassword(err.message);
    } finally {
      setGuardandoPassword(false);
    }
  }

  async function salir() {
    await cerrarSesion();
    router.replace('/login');
  }

  if (!usuario) {
    return (
      <View style={estilos.centrado}>
        <ActivityIndicator color={colores.navy} />
      </View>
    );
  }

  const nombreListo = nombre.trim().length > 0 && nombre.trim() !== usuario.nombre;
  const avatarListo =
    avatarSeed !== (usuario.avatarSeed || usuario.nombre) || avatarEstilo !== (usuario.avatarEstilo || ESTILO_AVATAR_POR_DEFECTO);
  const passwordListo = passwordActual.length > 0 && passwordNueva.length >= 8 && passwordNueva === passwordConfirmar;
  const passwordNoCoincide = passwordConfirmar.length > 0 && passwordNueva !== passwordConfirmar;

  return (
    <ScrollView contentContainerStyle={estilos.contenedor}>
      <Stack.Screen options={{ title: 'Configuración' }} />

      <Text style={estilos.tarjetaTitulo}>AVATAR</Text>
      <View style={[estilos.tarjeta, estilos.tarjetaAvatar]}>
        <Avatar avatarSeed={avatarSeed} avatarEstilo={avatarEstilo} nombre={usuario.nombre} tamano={84} />
        <View style={estilos.avatarBotones}>
          {errorAvatar && <Text style={estilos.error}>{errorAvatar}</Text>}
          <Pressable style={estilos.botonSecundario} onPress={probarOtroAvatar}>
            <Ionicons name="shuffle-outline" size={16} color={colores.navy} />
            <Text style={estilos.botonSecundarioTexto}>Probar otro</Text>
          </Pressable>
          <Pressable
            style={[estilos.boton, { marginTop: 0 }, (!avatarListo || guardandoAvatar) && estilos.botonDeshabilitado]}
            onPress={guardarAvatar}
            disabled={!avatarListo || guardandoAvatar}
          >
            {guardandoAvatar ? <ActivityIndicator color={colores.textoClaro} /> : <Text style={estilos.botonTexto}>Guardar avatar</Text>}
          </Pressable>
        </View>
      </View>
      <View style={estilos.tarjeta}>
        <Text style={estilos.estilosEtiqueta}>Estilo</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.estilosFila}>
          {ESTILOS_AVATAR.map((e) => (
            <Pressable
              key={e.valor}
              style={[estilos.estiloOpcion, avatarEstilo === e.valor && estilos.estiloOpcionActivo]}
              onPress={() => {
                setErrorAvatar(null);
                setAvatarEstilo(e.valor);
              }}
            >
              <Avatar avatarSeed={avatarSeed} avatarEstilo={e.valor} tamano={48} />
              <Text style={[estilos.estiloEtiquetaTexto, avatarEstilo === e.valor && estilos.estiloEtiquetaTextoActivo]}>
                {e.etiqueta}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <Text style={estilos.tarjetaTitulo}>TU CUENTA</Text>
      <View style={estilos.tarjeta}>
        <CampoTexto
          etiqueta="Nombre"
          value={nombre}
          onChangeText={(v) => {
            setNombre(v);
            setErrorNombre(null);
          }}
        />
        {errorNombre && <Text style={estilos.error}>{errorNombre}</Text>}
        <Pressable
          style={[estilos.boton, (!nombreListo || guardandoNombre) && estilos.botonDeshabilitado]}
          onPress={guardarNombre}
          disabled={!nombreListo || guardandoNombre}
        >
          {guardandoNombre ? <ActivityIndicator color={colores.textoClaro} /> : <Text style={estilos.botonTexto}>Guardar nombre</Text>}
        </Pressable>
      </View>

      <Text style={estilos.tarjetaTitulo}>NOTIFICACIONES</Text>
      <View style={estilos.tarjeta}>
        <View style={estilos.filaSwitch}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={estilos.filaSwitchTitulo}>Notificaciones push</Text>
            <Text style={estilos.filaSwitchSub}>Avisos de partidos, resultados y cambios de ranking en tu celular.</Text>
          </View>
          <Switch
            value={pushActivado}
            onValueChange={alternarPush}
            disabled={cambiandoPush}
            trackColor={{ true: colores.navy }}
            thumbColor={colores.textoClaro}
          />
        </View>
      </View>

      <Text style={estilos.tarjetaTitulo}>SEGURIDAD</Text>
      <View style={estilos.tarjeta}>
        <Text style={estilos.filaSwitchTitulo}>Cambiar contraseña</Text>
        {passwordActualizada && <Text style={estilos.exito}>Tu contraseña quedó actualizada.</Text>}
        <View style={{ marginTop: 10 }}>
          <CampoTexto etiqueta="Contraseña actual" secureTextEntry value={passwordActual} onChangeText={cambiarPasswordActual} />
          <CampoTexto
            etiqueta="Contraseña nueva (mínimo 8 caracteres)"
            secureTextEntry
            value={passwordNueva}
            onChangeText={cambiarPasswordNueva}
          />
          <CampoTexto
            etiqueta="Confirmar contraseña nueva"
            secureTextEntry
            value={passwordConfirmar}
            onChangeText={cambiarPasswordConfirmar}
          />
        </View>
        {passwordNoCoincide && <Text style={estilos.error}>Las contraseñas nuevas no coinciden</Text>}
        {errorPassword && <Text style={estilos.error}>{errorPassword}</Text>}
        <Pressable
          style={[estilos.boton, (!passwordListo || guardandoPassword) && estilos.botonDeshabilitado]}
          onPress={guardarPassword}
          disabled={!passwordListo || guardandoPassword}
        >
          {guardandoPassword ? (
            <ActivityIndicator color={colores.textoClaro} />
          ) : (
            <Text style={estilos.botonTexto}>Cambiar contraseña</Text>
          )}
        </Pressable>
      </View>

      <Text style={estilos.tarjetaTitulo}>APP</Text>
      <View style={estilos.tarjeta}>
        {actualizacionDisponible && (
          <View style={estilos.tarjetaActualizacion}>
            <View style={estilos.filaActualizacion}>
              <Ionicons name="cloud-download-outline" size={22} color={colores.navy} />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={estilos.actualizacionTitulo}>Nueva versión disponible ({actualizacionDisponible.version})</Text>
                {actualizacionDisponible.notas && <Text style={estilos.actualizacionNotas}>{actualizacionDisponible.notas}</Text>}
              </View>
            </View>
            <Pressable style={estilos.botonActualizar} onPress={() => Linking.openURL(actualizacionDisponible.url)}>
              <Text style={estilos.botonActualizarTexto}>Descargar</Text>
            </Pressable>
          </View>
        )}

        <Pressable style={estilos.botonBuscarActualizacion} onPress={() => buscarActualizacion()} disabled={buscandoActualizacion}>
          {buscandoActualizacion ? (
            <ActivityIndicator color={colores.navy} size="small" />
          ) : (
            <Ionicons name="refresh-outline" size={18} color={colores.navy} />
          )}
          <Text style={estilos.botonBuscarActualizacionTexto}>Buscar actualizaciones</Text>
        </Pressable>
        <Text style={estilos.versionTexto}>Versión {VERSION_ACTUAL}</Text>
        <Text style={estilos.creditoTexto}>By Andrés Alvarez</Text>
      </View>

      <Pressable style={estilos.botonSalir} onPress={salir}>
        <Ionicons name="log-out-outline" size={18} color={colores.error} />
        <Text style={estilos.botonSalirTexto}>Cerrar sesión</Text>
      </Pressable>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colores.fondo },
  contenedor: { padding: 20, paddingBottom: 48, backgroundColor: colores.fondo },
  tarjetaTitulo: { fontSize: 11, fontWeight: '700', color: colores.textoSecundario, letterSpacing: 0.5, marginBottom: 8, marginTop: 4 },
  tarjeta: {
    backgroundColor: colores.tarjeta,
    borderRadius: radios.tarjeta,
    padding: 18,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  boton: { backgroundColor: colores.navy, paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 6 },
  tarjetaAvatar: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarBotones: { flex: 1, gap: 10 },
  botonSecundario: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colores.navy,
    borderRadius: 10,
    paddingVertical: 10,
  },
  botonSecundarioTexto: { color: colores.navy, fontWeight: '700', fontSize: 13 },
  estilosEtiqueta: { fontSize: 13, color: colores.textoSecundario, fontWeight: '600', marginBottom: 10 },
  estilosFila: { flexDirection: 'row', gap: 12 },
  estiloOpcion: {
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: radios.tarjeta,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  estiloOpcionActivo: { borderColor: colores.navy, backgroundColor: colores.gris },
  estiloEtiquetaTexto: { fontSize: 11, color: colores.textoSecundario, fontWeight: '600' },
  estiloEtiquetaTextoActivo: { color: colores.navy },
  botonDeshabilitado: { opacity: 0.5 },
  botonTexto: { color: colores.textoClaro, fontWeight: '700' },
  error: { color: colores.error, fontSize: 13, marginBottom: 8 },
  exito: { color: colores.exito, fontSize: 13, marginTop: 6 },
  filaSwitch: { flexDirection: 'row', alignItems: 'center' },
  filaSwitchTitulo: { fontSize: 14, fontWeight: '700', color: colores.texto },
  filaSwitchSub: { fontSize: 12, color: colores.textoSecundario, marginTop: 3 },
  tarjetaActualizacion: { backgroundColor: colores.infoFondo, borderRadius: radios.tarjeta, padding: 16, marginBottom: 16 },
  filaActualizacion: { flexDirection: 'row', alignItems: 'flex-start' },
  actualizacionTitulo: { fontSize: 14, fontWeight: '700', color: colores.texto },
  actualizacionNotas: { fontSize: 12, color: colores.textoSecundario, marginTop: 4 },
  botonActualizar: { backgroundColor: colores.navy, borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 12 },
  botonActualizarTexto: { color: colores.textoClaro, fontWeight: '700' },
  botonBuscarActualizacion: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 10 },
  botonBuscarActualizacionTexto: { color: colores.navy, fontWeight: '600' },
  versionTexto: { textAlign: 'center', color: colores.textoSecundario, fontSize: 11, marginTop: 2 },
  creditoTexto: { textAlign: 'center', color: colores.textoSecundario, fontSize: 11, marginTop: 2 },
  botonSalir: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: 14 },
  botonSalirTexto: { color: colores.error, fontWeight: '700' },
});

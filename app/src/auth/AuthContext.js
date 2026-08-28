import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiFetch } from '../api/client';
import { guardarCache, leerCache } from '../lib/cache';
import { obtenerToken, guardarToken, eliminarToken } from '../lib/almacenToken';
import { registrarNotificacionesPush, borrarTokenPush } from '../lib/pushNotifications';

const CLAVE_TOKEN = 'tenismesa_token';
const CLAVE_CACHE_PERFIL = 'perfil';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [sinConexion, setSinConexion] = useState(false);

  const cargarSesion = useCallback(async () => {
    const tokenGuardado = await obtenerToken(CLAVE_TOKEN);
    if (!tokenGuardado) {
      setCargando(false);
      return;
    }

    try {
      const perfil = await apiFetch('/usuarios/me', { token: tokenGuardado });
      setToken(tokenGuardado);
      setUsuario(perfil);
      setSinConexion(false);
      guardarCache(CLAVE_CACHE_PERFIL, perfil);
      registrarNotificacionesPush(tokenGuardado);
    } catch (error) {
      if (error.esErrorDeRed) {
        // RNF-01: sin conexión — mantenemos la sesión con el último perfil que se cargó, en vez
        // de cerrarla solo porque no pudimos contactar al servidor.
        const perfilCacheado = await leerCache(CLAVE_CACHE_PERFIL);
        if (perfilCacheado) {
          setToken(tokenGuardado);
          setUsuario(perfilCacheado);
          setSinConexion(true);
        }
      } else {
        // el servidor sí respondió: el token está vencido o es inválido
        await eliminarToken(CLAVE_TOKEN);
      }
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarSesion();
  }, [cargarSesion]);

  async function iniciarSesion(correo, password) {
    const datos = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ correo, password }),
    });
    await guardarToken(CLAVE_TOKEN, datos.token);
    setToken(datos.token);
    setUsuario(datos.usuario);
    setSinConexion(false);
    guardarCache(CLAVE_CACHE_PERFIL, datos.usuario);
    registrarNotificacionesPush(datos.token);
  }

  async function registrarse(campos) {
    const datos = await apiFetch('/auth/registro', {
      method: 'POST',
      body: JSON.stringify(campos),
    });
    await guardarToken(CLAVE_TOKEN, datos.token);
    setToken(datos.token);
    setUsuario(datos.usuario);
    setSinConexion(false);
    guardarCache(CLAVE_CACHE_PERFIL, datos.usuario);
    registrarNotificacionesPush(datos.token);
  }

  async function cerrarSesion() {
    if (token) await borrarTokenPush(token);
    await eliminarToken(CLAVE_TOKEN);
    setToken(null);
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ token, usuario, cargando, sinConexion, iniciarSesion, registrarse, cerrarSesion }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return contexto;
}

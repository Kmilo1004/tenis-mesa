import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiFetch } from '../api/client';
import { guardarCache, leerCache } from '../lib/cache';

const CLAVE_TOKEN = 'tenismesa_token';
const CLAVE_CACHE_PERFIL = 'perfil';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [sinConexion, setSinConexion] = useState(false);

  const cargarSesion = useCallback(async () => {
    const tokenGuardado = await SecureStore.getItemAsync(CLAVE_TOKEN);
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
        await SecureStore.deleteItemAsync(CLAVE_TOKEN);
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
    await SecureStore.setItemAsync(CLAVE_TOKEN, datos.token);
    setToken(datos.token);
    setUsuario(datos.usuario);
    setSinConexion(false);
    guardarCache(CLAVE_CACHE_PERFIL, datos.usuario);
  }

  async function registrarse(campos) {
    const datos = await apiFetch('/auth/registro', {
      method: 'POST',
      body: JSON.stringify(campos),
    });
    await SecureStore.setItemAsync(CLAVE_TOKEN, datos.token);
    setToken(datos.token);
    setUsuario(datos.usuario);
    setSinConexion(false);
    guardarCache(CLAVE_CACHE_PERFIL, datos.usuario);
  }

  async function cerrarSesion() {
    await SecureStore.deleteItemAsync(CLAVE_TOKEN);
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

import AsyncStorage from '@react-native-async-storage/async-storage';

// RNF-01: guarda la última respuesta buena de una pantalla para poder mostrarla en modo solo
// lectura cuando no hay conexión. No es sensible (a diferencia del token, que va en SecureStore).
const PREFIJO = 'cache_';

export async function guardarCache(clave, datos) {
  try {
    await AsyncStorage.setItem(PREFIJO + clave, JSON.stringify(datos));
  } catch {
    // si falla el caché no es crítico, seguimos sin él
  }
}

export async function leerCache(clave) {
  try {
    const texto = await AsyncStorage.getItem(PREFIJO + clave);
    return texto ? JSON.parse(texto) : null;
  } catch {
    return null;
  }
}

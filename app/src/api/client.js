import { API_BASE_URL } from './config';

export async function apiFetch(ruta, { token, ...opciones } = {}) {
  let respuesta;
  try {
    respuesta = await fetch(`${API_BASE_URL}${ruta}`, {
      ...opciones,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...opciones.headers,
      },
    });
  } catch {
    // RNF-01: no se pudo ni contactar al servidor (sin conexión), distinto de un error que sí
    // respondió el backend. Quien llama puede usar esto para caer a datos cacheados.
    const errorDeRed = new Error('No se pudo conectar al servidor. Revisa tu conexión.');
    errorDeRed.esErrorDeRed = true;
    throw errorDeRed;
  }

  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const error = new Error(datos?.error || `Error ${respuesta.status}`);
    error.status = respuesta.status;
    throw error;
  }

  return datos;
}

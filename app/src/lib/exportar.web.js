import { API_BASE_URL } from '../api/config';

// En web no existen expo-file-system/expo-sharing (o no sirven para "compartir" un archivo), así
// que en vez de guardar+compartir usamos la descarga normal del navegador.
export async function descargarYCompartir(ruta, nombreArchivo, token) {
  const url = `${API_BASE_URL}${ruta}`;
  const respuesta = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (!respuesta.ok) {
    const datos = await respuesta.json().catch(() => null);
    throw new Error(datos?.error || `No se pudo generar el reporte (error ${respuesta.status})`);
  }

  const blob = await respuesta.blob();
  const urlBlob = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = urlBlob;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(urlBlob);
}

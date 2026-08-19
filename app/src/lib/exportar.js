import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from '../api/config';

// Descarga un reporte (CSV/PDF) del backend con el token del admin y abre el selector nativo
// para compartirlo/guardarlo, ya que el celular no puede simplemente "mostrar" el archivo.
export async function descargarYCompartir(ruta, nombreArchivo, token) {
  const url = `${API_BASE_URL}${ruta}`;
  const respuesta = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (!respuesta.ok) {
    // Sin esto, un 401/403/404/500 se guardaría y compartiría como si fuera el archivo real.
    const datos = await respuesta.json().catch(() => null);
    throw new Error(datos?.error || `No se pudo generar el reporte (error ${respuesta.status})`);
  }

  const bytes = new Uint8Array(await respuesta.arrayBuffer());
  const destino = new File(Paths.document, nombreArchivo);
  destino.write(bytes);

  const disponible = await Sharing.isAvailableAsync();
  if (!disponible) {
    throw new Error('Compartir archivos no está disponible en este dispositivo');
  }
  await Sharing.shareAsync(destino.uri);
}

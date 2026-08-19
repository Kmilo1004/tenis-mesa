import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { API_BASE_URL } from '../api/config';

// Descarga un reporte (CSV/PDF) del backend con el token del admin y abre el selector nativo
// para compartirlo/guardarlo, ya que el celular no puede simplemente "mostrar" el archivo.
export async function descargarYCompartir(ruta, nombreArchivo, token) {
  const url = `${API_BASE_URL}${ruta}`;
  const destino = new File(Paths.document, nombreArchivo);

  const tarea = File.createDownloadTask(url, destino, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const archivo = await tarea.downloadAsync();

  const disponible = await Sharing.isAvailableAsync();
  if (!disponible) {
    throw new Error('Compartir archivos no está disponible en este dispositivo');
  }
  await Sharing.shareAsync(archivo.uri);
}

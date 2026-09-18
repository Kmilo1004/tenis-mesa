import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';

const RUTA_APK = FileSystem.documentDirectory + 'actualizacion.apk';

// Descarga el APK y abre el instalador nativo de Android. El sistema operativo siempre exige que
// la persona confirme la instalación con un toque (y, la primera vez, que autorice "instalar apps
// desconocidas" para esta app) — eso no se puede saltar, ni siquiera con permisos.
export async function descargarEInstalarApk(url, onProgreso) {
  if (Platform.OS !== 'android') {
    throw new Error('La instalación automática solo está disponible en Android.');
  }

  const descarga = FileSystem.createDownloadResumable(url, RUTA_APK, {}, (progreso) => {
    if (progreso.totalBytesExpectedToWrite > 0) {
      onProgreso?.(progreso.totalBytesWritten / progreso.totalBytesExpectedToWrite);
    }
  });

  const resultado = await descarga.downloadAsync();
  if (!resultado?.uri) {
    throw new Error('No se pudo descargar la actualización');
  }

  const uriContenido = await FileSystem.getContentUriAsync(resultado.uri);

  await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
    data: uriContenido,
    flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
    type: 'application/vnd.android.package-archive',
  });
}

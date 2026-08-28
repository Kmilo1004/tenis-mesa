import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { apiFetch } from '../api/client';

// Pide permiso, obtiene el token de push de Expo y lo guarda en el backend contra el usuario
// logueado. No hace nada (silenciosamente) si el usuario niega el permiso o si algo falla — la
// app sigue funcionando con los avisos dentro de la app como respaldo.
export async function registrarNotificacionesPush(token) {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const permisosActuales = await Notifications.getPermissionsAsync();
    let estado = permisosActuales.status;
    if (estado !== 'granted') {
      const solicitados = await Notifications.requestPermissionsAsync();
      estado = solicitados.status;
    }
    if (estado !== 'granted') return;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });

    await apiFetch('/usuarios/me/push-token', { method: 'PUT', token, body: JSON.stringify({ token: pushToken }) });
  } catch {
    // sin permiso, sin conexión, dispositivo sin soporte de push, etc. — no crítico
  }
}

// Desasocia el token de push de este dispositivo del usuario (para no seguirle mandando avisos
// de una cuenta de la que ya cerró sesión).
export async function borrarTokenPush(token) {
  try {
    await apiFetch('/usuarios/me/push-token', { method: 'PUT', token, body: JSON.stringify({ token: null }) });
  } catch {
    // no crítico
  }
}

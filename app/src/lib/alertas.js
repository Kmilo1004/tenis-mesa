import { Alert } from 'react-native';

// Nativo (Android/iOS): Alert.alert funciona tal cual. Ver alertas.web.js para el reemplazo que
// hace falta en la versión web, donde react-native-web no lo implementa (queda como no-op).
export function avisar(titulo, mensaje) {
  Alert.alert(titulo, mensaje);
}

export function confirmarAccion(titulo, mensaje, { textoConfirmar = 'Aceptar', destructivo = false, onConfirmar }) {
  Alert.alert(titulo, mensaje, [
    { text: 'Cancelar', style: 'cancel' },
    { text: textoConfirmar, style: destructivo ? 'destructive' : 'default', onPress: onConfirmar },
  ]);
}

import * as SecureStore from 'expo-secure-store';

export const obtenerToken = (clave) => SecureStore.getItemAsync(clave);
export const guardarToken = (clave, valor) => SecureStore.setItemAsync(clave, valor);
export const eliminarToken = (clave) => SecureStore.deleteItemAsync(clave);

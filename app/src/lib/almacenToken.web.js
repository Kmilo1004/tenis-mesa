import AsyncStorage from '@react-native-async-storage/async-storage';

// expo-secure-store no tiene implementación funcional en web en este SDK (el módulo web queda
// vacío y cualquier llamada tira "is not a function"), así que en el build web se guarda el
// token con AsyncStorage (localStorage) en vez del Keychain/Keystore nativo.
export const obtenerToken = (clave) => AsyncStorage.getItem(clave);
export const guardarToken = (clave, valor) => AsyncStorage.setItem(clave, valor);
export const eliminarToken = (clave) => AsyncStorage.removeItem(clave);

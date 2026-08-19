// URL del backend. Se toma de EXPO_PUBLIC_API_URL (definida en app/.env) para poder cambiar
// entre desarrollo local y el servidor desplegado sin tocar código. Si no está definida, cae
// a la IP local por defecto — el celular con Expo Go debe estar en la misma red WiFi.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.20.31:3000/api/v1';

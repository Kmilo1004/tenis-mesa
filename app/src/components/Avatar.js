import { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colores } from '../theme/colores';

export function urlAvatar(semilla, tamano = 44) {
  return `https://api.dicebear.com/9.x/avataaars/png?seed=${encodeURIComponent(semilla)}&size=${Math.round(tamano * 3)}`;
}

export default function Avatar({ nombre, avatarSeed, tamano = 44 }) {
  const semilla = avatarSeed || nombre || 'jugador';
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    setFallo(false);
  }, [semilla]);

  const estiloCirculo = [estilos.circulo, { width: tamano, height: tamano, borderRadius: tamano / 2 }];

  if (fallo) {
    const inicial = nombre?.trim()?.[0]?.toUpperCase() || '?';
    return (
      <View style={estiloCirculo}>
        <Text style={[estilos.texto, { fontSize: tamano * 0.42 }]}>{inicial}</Text>
      </View>
    );
  }

  return <Image source={{ uri: urlAvatar(semilla, tamano) }} style={estiloCirculo} onError={() => setFallo(true)} />;
}

const estilos = StyleSheet.create({
  circulo: { backgroundColor: colores.navyClaro, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  texto: { color: colores.textoClaro, fontWeight: '700' },
});

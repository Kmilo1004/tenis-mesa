import { useEffect, useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colores } from '../theme/colores';
import { ESTILO_AVATAR_POR_DEFECTO } from '../lib/avatares';

export function urlAvatar(semilla, estilo = ESTILO_AVATAR_POR_DEFECTO, tamano = 44) {
  return `https://api.dicebear.com/10.x/${estilo}/png?seed=${encodeURIComponent(semilla)}&size=${Math.round(tamano * 3)}`;
}

export default function Avatar({ nombre, avatarSeed, avatarEstilo, tamano = 44 }) {
  const semilla = avatarSeed || nombre || 'jugador';
  const estilo = avatarEstilo || ESTILO_AVATAR_POR_DEFECTO;
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    setFallo(false);
  }, [semilla, estilo]);

  const estiloCirculo = [estilos.circulo, { width: tamano, height: tamano, borderRadius: tamano / 2 }];

  if (fallo) {
    const inicial = nombre?.trim()?.[0]?.toUpperCase() || '?';
    return (
      <View style={estiloCirculo}>
        <Text style={[estilos.texto, { fontSize: tamano * 0.42 }]}>{inicial}</Text>
      </View>
    );
  }

  return <Image source={{ uri: urlAvatar(semilla, estilo, tamano) }} style={estiloCirculo} onError={() => setFallo(true)} />;
}

const estilos = StyleSheet.create({
  circulo: { backgroundColor: colores.navyClaro, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  texto: { color: colores.textoClaro, fontWeight: '700' },
});

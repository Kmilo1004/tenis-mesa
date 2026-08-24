import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { apiFetch } from '../api/client';
import Avatar from './Avatar';
import { colores, radios } from '../theme/colores';

// Campo de "buscar y elegir jugador interno", reutilizado dondequiera que haga falta elegir un
// participante de un partido (uno mismo vs. rival, o los dos jugadores cuando un admin/árbitro
// registra un partido ajeno).
export default function SelectorJugador({ etiqueta, valor, onSeleccionar, excluirId, token, placeholder = 'Busca por nombre...' }) {
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    if (valor || busqueda.trim().length < 2) {
      setResultados([]);
      return;
    }
    setBuscando(true);
    const temporizador = setTimeout(async () => {
      try {
        const datos = await apiFetch(`/usuarios/buscar?q=${encodeURIComponent(busqueda.trim())}`, { token });
        setResultados(excluirId ? datos.filter((u) => u.id !== excluirId) : datos);
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 350);
    return () => clearTimeout(temporizador);
  }, [busqueda, valor, token, excluirId]);

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      {valor ? (
        <View style={estilos.seleccionado}>
          <Avatar nombre={valor.nombre} tamano={36} />
          <Text style={estilos.nombreSeleccionado}>{valor.nombre}</Text>
          <Pressable onPress={() => onSeleccionar(null)} hitSlop={8}>
            <Text style={estilos.cambiar}>Cambiar</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <TextInput
            style={estilos.input}
            placeholder={placeholder}
            placeholderTextColor={colores.textoSecundario}
            value={busqueda}
            onChangeText={setBusqueda}
          />
          {buscando && <ActivityIndicator style={{ marginTop: 8 }} color={colores.navy} />}
          {resultados.map((u) => (
            <Pressable key={u.id} style={estilos.resultado} onPress={() => onSeleccionar(u)}>
              <Avatar nombre={u.nombre} tamano={32} />
              <Text style={estilos.resultadoNombre}>{u.nombre}</Text>
            </Pressable>
          ))}
        </>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { width: '100%' },
  etiqueta: { fontSize: 13, color: colores.textoSecundario, marginBottom: 8, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radios.tarjeta,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colores.texto,
    backgroundColor: colores.tarjeta,
  },
  resultado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: colores.gris,
    borderRadius: 10,
    marginTop: 6,
  },
  resultadoNombre: { fontSize: 14, color: colores.texto, fontWeight: '600' },
  seleccionado: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colores.gris,
    padding: 10,
    borderRadius: radios.tarjeta,
  },
  nombreSeleccionado: { flex: 1, fontWeight: '700', color: colores.texto, fontSize: 14 },
  cambiar: { color: colores.navy, fontSize: 12, fontWeight: '700' },
});

import { View, Text, StyleSheet } from 'react-native';

// @react-native-community/datetimepicker no tiene implementación para web (renderiza null con un
// warning). Expo Router elige este archivo automáticamente en el build web en vez de
// CampoFecha.js, así que aquí usamos el selector de fecha nativo del navegador.
function aTextoISO(fecha) {
  if (!fecha) return '';
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function CampoFecha({ etiqueta, valor, onCambiar, minimo }) {
  function manejarCambio(evento) {
    const texto = evento.target.value;
    if (!texto) return;
    const [y, m, d] = texto.split('-').map(Number);
    onCambiar(new Date(y, m - 1, d));
  }

  return (
    <View style={estilos.contenedor}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <input
        type="date"
        value={aTextoISO(valor)}
        min={minimo ? aTextoISO(minimo) : undefined}
        onChange={manejarCambio}
        style={estiloInputWeb}
      />
    </View>
  );
}

const estiloInputWeb = {
  borderWidth: 1,
  borderColor: '#ccc',
  borderRadius: 8,
  padding: 10,
  fontSize: 15,
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
  color: '#111',
};

const estilos = StyleSheet.create({
  contenedor: { width: '100%', marginBottom: 12 },
  etiqueta: { fontSize: 13, color: '#444', marginBottom: 4 },
});

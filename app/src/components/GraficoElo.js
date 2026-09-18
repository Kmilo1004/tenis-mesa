import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Polyline, Stop, Path } from 'react-native-svg';
import { colores } from '../theme/colores';

const ANCHO = 320;
const ALTO = 92;
const RELLENO = 10;

// Línea de evolución del ELO a partir del historial de ranking (ver GET /usuarios/:id/historial-ranking).
// `puntos` es un arreglo de { fecha, elo } en orden cronológico ascendente.
export default function GraficoElo({
  puntos,
  color = colores.acento,
  mensajeVacio = 'Juega más partidos para ver cómo cambia tu ranking en el tiempo',
  sufijoDelta = 'desde tu partido anterior',
}) {
  if (puntos.length < 2) {
    return (
      <View style={estilos.vacio}>
        <Text style={estilos.vacioTexto}>{mensajeVacio}</Text>
      </View>
    );
  }

  const valores = puntos.map((p) => p.elo);
  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const rango = Math.max(maximo - minimo, 1);

  const x = (i) => RELLENO + (i / (puntos.length - 1)) * (ANCHO - RELLENO * 2);
  const y = (v) => ALTO - RELLENO - ((v - minimo) / rango) * (ALTO - RELLENO * 2);

  const coords = puntos.map((p, i) => [x(i), y(p.elo)]);
  const puntosLinea = coords.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const area = `M${coords[0][0].toFixed(1)},${ALTO} L${puntosLinea.replace(/ /g, ' L')} L${coords[coords.length - 1][0].toFixed(1)},${ALTO} Z`;

  const ultimoIndice = puntos.length - 1;
  const actual = puntos[ultimoIndice];
  const anterior = puntos[ultimoIndice - 1];
  const delta = actual.elo - anterior.elo;

  return (
    <View>
      <View style={estilos.cabecera}>
        <Text style={estilos.valorActual}>{actual.elo} pts</Text>
        {delta !== 0 && (
          <Text style={[estilos.delta, { color: delta > 0 ? colores.exito : colores.error }]}>
            {delta > 0 ? '▲' : '▼'}
            {Math.abs(delta)} {sufijoDelta}
          </Text>
        )}
      </View>

      <Svg width="100%" height={ALTO} viewBox={`0 0 ${ANCHO} ${ALTO}`} preserveAspectRatio="none" style={estilos.grafico}>
        <Defs>
          <LinearGradient id="rellenoElo" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.22} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#rellenoElo)" />
        <Polyline points={puntosLinea} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {coords.map(([px, py], i) => {
          const esUltimo = i === ultimoIndice;
          return (
            <Circle
              key={i}
              cx={px}
              cy={py}
              r={esUltimo ? 4.5 : 3}
              fill={esUltimo ? color : colores.tarjeta}
              stroke={color}
              strokeWidth={2}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecera: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' },
  valorActual: { fontSize: 19, fontWeight: '800', color: colores.texto },
  delta: { fontSize: 11.5, fontWeight: '700' },
  grafico: { marginTop: 8 },
  vacio: { paddingVertical: 10 },
  vacioTexto: { fontSize: 12.5, color: colores.textoSecundario },
});

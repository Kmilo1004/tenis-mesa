const PDFDocument = require('pdfkit');
const { dibujarEncabezado, dibujarPiePagina, colores } = require('./pdf');

const { NAVY, TEXTO, TEXTO_SECUNDARIO, BORDE, BLANCO } = colores;
const GRIS_DIAGONAL = '#D1D5DB';

// Para cada grupo arma la cuadrícula de resultados cruzados (fila = jugador, columna = número de
// rival) a partir de los partidos confirmados del grupo: matriz[i][j] = sets que ganó el jugador i
// contra el jugador j (o null si todavía no jugaron entre ellos).
function construirMatrizGrupo(jugadores, partidos) {
  const indice = new Map(jugadores.map((j, i) => [j.usuarioId, i]));
  const matriz = jugadores.map(() => jugadores.map(() => null));

  for (const p of partidos) {
    if (p.estado !== 'confirmado' || !p.jugadorAId || !p.jugadorBId) continue;
    const i = indice.get(p.jugadorAId);
    const j = indice.get(p.jugadorBId);
    if (i === undefined || j === undefined) continue;

    const setsA = p.sets.filter((s) => s.puntosJugadorA > s.puntosJugadorB).length;
    const setsB = p.sets.length - setsA;
    matriz[i][j] = setsA;
    matriz[j][i] = setsB;
  }

  return matriz;
}

// Dibuja la cuadrícula de un grupo (encabezado "GRUPO X" + tabla cruzada de resultados) empezando
// en doc.y, y devuelve la altura total que ocupó.
function dibujarGrupo(doc, { nombre, jugadores, matriz, tabla, anchoNombre, anchoNumero, anchoExtra }) {
  const margenIzq = doc.page.margins.left;
  const n = jugadores.length;
  const alturaFila = 20;
  const yInicio = doc.y;
  let y = yInicio;

  const anchoTotal = anchoNombre + n * anchoNumero + anchoExtra * 2;

  // Barra "GRUPO X"
  doc.rect(margenIzq, y, anchoTotal, alturaFila).fill(NAVY);
  doc
    .fillColor(BLANCO)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(nombre, margenIzq + 8, y + 5, { lineBreak: false });
  y += alturaFila;

  // Encabezado de columnas: nombre en blanco, 1..n, Pts., Pos.
  let x = margenIzq;
  doc.rect(x, y, anchoNombre, alturaFila).fillAndStroke('#EFF1F8', BORDE);
  x += anchoNombre;
  for (let c = 1; c <= n; c++) {
    doc.rect(x, y, anchoNumero, alturaFila).fillAndStroke('#EFF1F8', BORDE);
    doc
      .fillColor(TEXTO)
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(String(c), x, y + 6, { width: anchoNumero, align: 'center', lineBreak: false });
    x += anchoNumero;
  }
  for (const etiqueta of ['Pts.', 'Pos.']) {
    doc.rect(x, y, anchoExtra, alturaFila).fillAndStroke('#EFF1F8', BORDE);
    doc
      .fillColor(TEXTO)
      .font('Helvetica-Bold')
      .fontSize(8)
      .text(etiqueta, x, y + 6, { width: anchoExtra, align: 'center', lineBreak: false });
    x += anchoExtra;
  }
  y += alturaFila;

  const posicionPorUsuario = new Map(tabla.map((t, i) => [t.usuarioId, i + 1]));

  jugadores.forEach((jugador, i) => {
    x = margenIzq;
    doc.rect(x, y, anchoNombre, alturaFila).stroke(BORDE);
    doc
      .fillColor(TEXTO)
      .font('Helvetica')
      .fontSize(9)
      .text(jugador.nombre, x + 6, y + 6, { width: anchoNombre - 10, lineBreak: false, ellipsis: true });
    x += anchoNombre;

    for (let c = 0; c < n; c++) {
      const esDiagonal = c === i;
      doc.rect(x, y, anchoNumero, alturaFila).fillAndStroke(esDiagonal ? GRIS_DIAGONAL : BLANCO, BORDE);
      if (!esDiagonal && matriz[i][c] !== null) {
        doc
          .fillColor(TEXTO)
          .font('Helvetica')
          .fontSize(9)
          .text(String(matriz[i][c]), x, y + 6, { width: anchoNumero, align: 'center', lineBreak: false });
      }
      x += anchoNumero;
    }

    const stats = tabla.find((t) => t.usuarioId === jugador.usuarioId);
    const pts = stats ? String(stats.ganados) : '';
    const pos = posicionPorUsuario.get(jugador.usuarioId) || '';
    for (const valor of [pts, String(pos)]) {
      doc.rect(x, y, anchoExtra, alturaFila).stroke(BORDE);
      doc
        .fillColor(NAVY)
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(valor, x, y + 6, { width: anchoExtra, align: 'center', lineBreak: false });
      x += anchoExtra;
    }

    y += alturaFila;
  });

  doc.y = y + 14;
  return y - yInicio + 14;
}

function dibujarSeccionGrupos(doc, grupos) {
  doc.fillColor(TEXTO).font('Helvetica-Bold').fontSize(13).text('Fase de grupos');
  doc.moveDown(0.6);

  const anchoDisponible = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const maxJugadores = Math.max(...grupos.map((g) => g.jugadores.length), 1);
  const anchoExtra = 34;
  const anchoNombre = 170;
  const anchoNumero = Math.max(20, (anchoDisponible - anchoNombre - anchoExtra * 2) / maxJugadores);

  for (const grupo of grupos) {
    const alturaEstimativa = 40 + grupo.jugadores.length * 20 + 14;
    if (doc.y + alturaEstimativa > doc.page.height - doc.page.margins.bottom) {
      doc.addPage({ size: 'A4', margin: 40 });
    }
    dibujarGrupo(doc, { ...grupo, anchoNombre, anchoNumero, anchoExtra });
  }
}

// Reconstruye el árbol del cuadro de eliminación directa a partir de partidoSiguienteId /
// slotSiguiente (en vez de asumir un árbol binario completo), para que los "bye" (jugador que
// avanza directo sin jugar) no rompan el dibujo.
function construirArbolEliminacion(partidos) {
  const porId = new Map(partidos.map((p) => [p.id, p]));
  const hijosPorPadre = new Map();
  for (const p of partidos) {
    if (!p.partidoSiguienteId) continue;
    if (!hijosPorPadre.has(p.partidoSiguienteId)) hijosPorPadre.set(p.partidoSiguienteId, {});
    hijosPorPadre.get(p.partidoSiguienteId)[p.slotSiguiente] = p;
  }
  const raiz = partidos.find((p) => !p.partidoSiguienteId) || null;
  return { raiz, hijosPorPadre, porId };
}

// Asigna a cada partido del árbol una posición vertical (centro Y), respetando que las ramas con
// "bye" (sin partido hijo real de ese lado) ocupen igual una unidad de altura, para mantener el
// espaciado del árbol.
function asignarPosicionesVerticales(nodo, hijosPorPadre, yInicio, unidad) {
  const hijos = hijosPorPadre.get(nodo.id) || {};
  const hijoA = hijos.A || null;
  const hijoB = hijos.B || null;
  nodo._hijoA = hijoA;
  nodo._hijoB = hijoB;

  let alturaTotal = 0;
  let centroA;
  let centroB;

  if (hijoA) {
    const h = asignarPosicionesVerticales(hijoA, hijosPorPadre, yInicio, unidad);
    centroA = hijoA._centroY;
    alturaTotal += h;
  } else {
    centroA = yInicio + unidad / 2;
    alturaTotal += unidad;
  }

  if (hijoB) {
    const h = asignarPosicionesVerticales(hijoB, hijosPorPadre, yInicio + alturaTotal, unidad);
    centroB = hijoB._centroY;
    alturaTotal += h;
  } else {
    centroB = yInicio + alturaTotal + unidad / 2;
    alturaTotal += unidad;
  }

  nodo._centroY = (centroA + centroB) / 2;
  return alturaTotal;
}

function nombreJugadorEnCaja(jugador) {
  return jugador ? jugador.nombre : 'Por definir';
}

function dibujarCaja(doc, { x, y, ancho, alto, partido }) {
  doc.rect(x, y, ancho, alto).stroke(BORDE);
  doc.moveTo(x, y + alto / 2).lineTo(x + ancho, y + alto / 2).strokeColor(BORDE).stroke();

  const filas = [
    { jugador: partido.jugadorA, esGanador: partido.ganadorId && partido.ganadorId === partido.jugadorAId },
    { jugador: partido.jugadorB, esGanador: partido.ganadorId && partido.ganadorId === partido.jugadorBId },
  ];

  filas.forEach((fila, i) => {
    const yTexto = y + (i === 0 ? 0 : alto / 2) + alto / 4 - 5;
    doc
      .fillColor(fila.esGanador ? NAVY : TEXTO)
      .font(fila.esGanador ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(8.5)
      .text(nombreJugadorEnCaja(fila.jugador), x + 6, yTexto, { width: ancho - 10, lineBreak: false, ellipsis: true });
  });
}

// Dibuja las líneas en "codo" que conectan un partido con sus dos partidos hijos (si existen) y con
// el siguiente partido, siguiendo el estilo clásico de cuadro de eliminación. Las coordenadas Y de
// los nodos (_centroY) son relativas al inicio del árbol, así que se les suma yBase acá.
function dibujarConexiones(doc, nodo, { xDeNivel, anchoCaja, xMedioEntreNiveles, yBase }) {
  const xNodo = xDeNivel(nodo.nivelRonda);
  const xHijos = xDeNivel(nodo.nivelRonda - 1);
  const xMedio = xMedioEntreNiveles(nodo.nivelRonda);
  const yNodo = yBase + nodo._centroY;

  doc.strokeColor(TEXTO_SECUNDARIO).lineWidth(1);

  for (const hijo of [nodo._hijoA, nodo._hijoB]) {
    if (!hijo) continue;
    const yHijo = yBase + hijo._centroY;
    doc.moveTo(xHijos + anchoCaja, yHijo).lineTo(xMedio, yHijo).stroke();
    doc.moveTo(xMedio, yHijo).lineTo(xMedio, yNodo).stroke();
    dibujarConexiones(doc, hijo, { xDeNivel, anchoCaja, xMedioEntreNiveles, yBase });
  }
  if (nodo._hijoA || nodo._hijoB) {
    doc.moveTo(xMedio, yNodo).lineTo(xNodo, yNodo).stroke();
  }
}

function recorrerArbol(nodo, fn) {
  if (!nodo) return;
  fn(nodo);
  recorrerArbol(nodo._hijoA, fn);
  recorrerArbol(nodo._hijoB, fn);
}

function dibujarSeccionEliminacion(doc, partidos, torneo) {
  if (partidos.length === 0) return;

  const { raiz, hijosPorPadre } = construirArbolEliminacion(partidos);
  if (!raiz) return;

  const anchoCaja = 150;
  const altoCaja = 30;
  const gapX = 46;
  const unidad = altoCaja + 12;

  asignarPosicionesVerticales(raiz, hijosPorPadre, 0, unidad);

  let alturaMax = 0;
  recorrerArbol(raiz, (n) => {
    alturaMax = Math.max(alturaMax, n._centroY + unidad / 2);
  });

  const numRondas = raiz.nivelRonda + 1;
  const anchoCampeon = 170;
  const anchoContenido = numRondas * anchoCaja + (numRondas - 1) * gapX + gapX + anchoCampeon;
  // El alto de página debe alcanzar además para el encabezado (banda azul + título) antes de que
  // empiece a dibujarse el árbol; se reserva un espacio generoso para no quedar cortos.
  const alturaEncabezadoYTitulo = 190;
  const margen = 40;
  const alturaContenido = alturaEncabezadoYTitulo + alturaMax + margen;

  doc.addPage({ size: [anchoContenido + margen * 2, Math.max(alturaContenido + margen, 300)], margin: margen });
  // Mientras se dibuja el árbol con coordenadas absolutas, se desactiva el margen inferior: si
  // PDFKit detecta que un texto cae cerca del borde de la página, inserta una página nueva sola
  // (el mismo problema que tuvo el pie de página de los reportes) y rompe todo el layout.
  const margenInferiorOriginal = doc.page.margins.bottom;
  doc.page.margins.bottom = 0;

  dibujarEncabezado(doc, `Cuadro de eliminación directa — ${torneo.nombre}`);

  const yBase = doc.y + 10;
  const margenIzq = doc.page.margins.left;
  const xDeNivel = (nivel) => margenIzq + nivel * (anchoCaja + gapX);
  const xMedioEntreNiveles = (nivel) => xDeNivel(nivel - 1) + anchoCaja + gapX / 2;

  recorrerArbol(raiz, (nodo) => {
    dibujarCaja(doc, {
      x: xDeNivel(nodo.nivelRonda),
      y: yBase + nodo._centroY - altoCaja / 2,
      ancho: anchoCaja,
      alto: altoCaja,
      partido: nodo,
    });
  });

  dibujarConexiones(doc, raiz, { xDeNivel, anchoCaja, xMedioEntreNiveles, yBase });

  // Caja del campeón, conectada a la final.
  const xCampeon = xDeNivel(raiz.nivelRonda) + anchoCaja + gapX;
  const yCampeon = yBase + raiz._centroY - altoCaja / 2;
  doc
    .fillColor(TEXTO_SECUNDARIO)
    .font('Helvetica-Bold')
    .fontSize(8)
    .text('CAMPEÓN', xCampeon, yCampeon - 14, { width: anchoCampeon, lineBreak: false });
  doc.rect(xCampeon, yCampeon, anchoCampeon, altoCaja).fillAndStroke('#EFF1F8', NAVY);
  const nombreCampeon = raiz.ganadorId
    ? raiz.ganadorId === raiz.jugadorAId
      ? nombreJugadorEnCaja(raiz.jugadorA)
      : nombreJugadorEnCaja(raiz.jugadorB)
    : '—';
  doc
    .fillColor(NAVY)
    .font('Helvetica-Bold')
    .fontSize(10)
    .text(nombreCampeon, xCampeon + 8, yCampeon + altoCaja / 2 - 5, { width: anchoCampeon - 16, lineBreak: false, ellipsis: true });

  doc.strokeColor(TEXTO_SECUNDARIO).lineWidth(1);
  doc
    .moveTo(xDeNivel(raiz.nivelRonda) + anchoCaja, yBase + raiz._centroY)
    .lineTo(xCampeon, yCampeon + altoCaja / 2)
    .stroke();

  doc.page.margins.bottom = margenInferiorOriginal;
}

function generarPdfTorneoDetallado(res, { torneo, grupos, partidosEliminacion }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);

  const huboGrupos = grupos && grupos.length > 0;
  const huboEliminacion = partidosEliminacion && partidosEliminacion.length > 0;

  dibujarEncabezado(doc, torneo.nombre);
  if (torneo.formato === 'mixto' && torneo.clasificadosPorGrupo) {
    doc
      .fillColor(TEXTO_SECUNDARIO)
      .font('Helvetica')
      .fontSize(9)
      .text(`Clasifican ${torneo.clasificadosPorGrupo} por grupo a la llave de eliminación directa`);
    doc.moveDown(0.8);
  }

  if (huboGrupos) {
    dibujarSeccionGrupos(doc, grupos);
  } else if (!huboEliminacion) {
    doc.fillColor(TEXTO_SECUNDARIO).font('Helvetica-Oblique').fontSize(10).text('Este torneo todavía no tiene resultados.');
  }

  if (huboEliminacion) {
    dibujarSeccionEliminacion(doc, partidosEliminacion, torneo);
  }

  dibujarPiePagina(doc);
  doc.end();
}

module.exports = { generarPdfTorneoDetallado, construirMatrizGrupo };

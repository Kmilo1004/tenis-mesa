const path = require('path');
const PDFDocument = require('pdfkit');

const NAVY = '#0B1E4D';
const NAVY_TEXTO_CLARO = '#C7D2E8';
const TEXTO = '#111827';
const TEXTO_SECUNDARIO = '#6B7280';
const BORDE = '#E4E6F0';
const FILA_ALTERNA = '#F4F5FA';
const BLANCO = '#FFFFFF';

const LOGO = path.join(__dirname, '../assets/logo.png');
const ALTURA_ENCABEZADO = 92;

function dibujarEncabezado(doc, titulo) {
  const anchoPagina = doc.page.width;
  const margenIzq = doc.page.margins.left;

  doc.rect(0, 0, anchoPagina, ALTURA_ENCABEZADO).fill(NAVY);
  try {
    doc.image(LOGO, margenIzq, 24, { width: 44, height: 44 });
  } catch {
    // si el logo no está disponible en este entorno, seguimos sin él en vez de romper el reporte
  }
  doc
    .fillColor(BLANCO)
    .font('Helvetica-Bold')
    .fontSize(18)
    .text('TM UNIMAG', margenIzq + 56, 28, { lineBreak: false });
  doc
    .fillColor(NAVY_TEXTO_CLARO)
    .font('Helvetica')
    .fontSize(10)
    .text('Club de Tenis de Mesa', margenIzq + 56, 50, { lineBreak: false });

  doc.x = margenIzq;
  doc.y = ALTURA_ENCABEZADO + 20;

  const fecha = new Date().toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' });
  doc.fillColor(TEXTO).font('Helvetica-Bold').fontSize(15).text(titulo);
  doc.moveDown(0.15);
  doc.fillColor(TEXTO_SECUNDARIO).font('Helvetica').fontSize(9).text(`Generado el ${fecha}`);
  doc.moveDown(1);
}

function celdaDeValor(valor) {
  // Si la ruta ya armó una celda con estilo propio (ej. resaltar el 1er lugar del ranking), la
  // respetamos tal cual; si no, la envolvemos como texto plano.
  if (valor && typeof valor === 'object' && 'text' in valor) {
    return valor;
  }
  return { text: valor === null || valor === undefined ? '' : String(valor) };
}

function dibujarTabla(doc, { columnas, filas }) {
  const filaEncabezado = columnas.map((c) => ({
    text: c.titulo,
    backgroundColor: NAVY,
    textColor: BLANCO,
    font: { family: 'Helvetica-Bold' },
    align: { x: c.align || 'left', y: 'center' },
  }));

  const filasCuerpo = filas.map((fila) =>
    columnas.map((c) => ({
      align: { x: c.align || 'left', y: 'center' },
      ...celdaDeValor(fila[c.clave]),
    })),
  );

  doc.table({
    data: [filaEncabezado, ...filasCuerpo],
    defaultStyle: {
      border: 0.5,
      borderColor: BORDE,
      padding: 7,
      font: { family: 'Helvetica', size: 9 },
      textColor: TEXTO,
    },
    rowStyles: (i) => (i > 0 && i % 2 === 0 ? { backgroundColor: FILA_ALTERNA } : {}),
  });

  if (filas.length === 0) {
    doc.moveDown(0.5);
    doc.fillColor(TEXTO_SECUNDARIO).font('Helvetica-Oblique').fontSize(10).text('No hay datos para este reporte.');
  }
}

function dibujarPiePagina(doc) {
  const rango = doc.bufferedPageRange();
  const margenIzq = doc.page.margins.left;
  const margenDer = doc.page.margins.right;
  const margenInferior = doc.page.margins.bottom;

  for (let i = rango.start; i < rango.start + rango.count; i++) {
    doc.switchToPage(i);
    // Escribir dentro del margen inferior "cuenta" como desborde de contenido para PDFKit y crea
    // una página nueva en blanco — se baja el margen a 0 momentáneamente solo para el pie.
    doc.page.margins.bottom = 0;

    const y = doc.page.height - margenInferior + 6;
    const anchoPagina = doc.page.width;

    doc
      .fillColor(TEXTO_SECUNDARIO)
      .font('Helvetica')
      .fontSize(8)
      .text('TM UNIMAG · Tenis de Mesa', margenIzq, y, { width: 250, lineBreak: false });
    doc.text(`Página ${i - rango.start + 1} de ${rango.count}`, anchoPagina - margenDer - 150, y, {
      width: 150,
      align: 'right',
      lineBreak: false,
    });

    doc.page.margins.bottom = margenInferior;
  }
}

// Genera un PDF con marca TM UNIMAG (encabezado azul + logo), una tabla con bordes y filas en
// cebra, y numeración de página en el pie — y lo transmite directo a la respuesta HTTP.
function generarPdfTabla(res, { titulo, columnas, filas }) {
  const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);

  dibujarEncabezado(doc, titulo);
  dibujarTabla(doc, { columnas, filas });
  dibujarPiePagina(doc);

  doc.end();
}

module.exports = { generarPdfTabla };

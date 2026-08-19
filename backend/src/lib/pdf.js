const PDFDocument = require('pdfkit');

// Genera un PDF simple (título + tabla de texto) y lo transmite directo a la respuesta HTTP.
function generarPdfTabla(res, { titulo, columnas, filas }) {
  const doc = new PDFDocument({ margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);

  doc.fontSize(16).text(titulo, { underline: true });
  doc.moveDown();
  doc.fontSize(9);

  const encabezado = columnas.map((c) => c.titulo).join('   |   ');
  doc.font('Helvetica-Bold').text(encabezado);
  doc.font('Helvetica').moveDown(0.3);

  filas.forEach((fila) => {
    const linea = columnas.map((c) => String(fila[c.clave] ?? '')).join('   |   ');
    doc.text(linea);
  });

  if (filas.length === 0) {
    doc.text('(sin datos)');
  }

  doc.end();
}

module.exports = { generarPdfTabla };

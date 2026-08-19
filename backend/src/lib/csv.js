function celdaCsv(valor) {
  let texto = valor === null || valor === undefined ? '' : String(valor);

  // Evita inyección de fórmulas CSV: si Excel/Sheets abre una celda que empieza con
  // = + - @, la interpreta como fórmula y podría ejecutarla (ej. un nombre de jugador externo
  // malicioso como "=CMD(...)"). Anteponer un apóstrofe la neutraliza como texto plano.
  if (/^[=+\-@]/.test(texto)) {
    texto = `'${texto}`;
  }

  if (/[",\n]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

// Genera un CSV simple a partir de columnas [{ clave, titulo }] y un arreglo de filas (objetos).
function generarCsv(columnas, filas) {
  const encabezado = columnas.map((c) => celdaCsv(c.titulo)).join(',');
  const lineas = filas.map((fila) => columnas.map((c) => celdaCsv(fila[c.clave])).join(','));
  return [encabezado, ...lineas].join('\r\n');
}

module.exports = { generarCsv };

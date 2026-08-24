// CampoFecha solo deja elegir día/mes/año, nunca hora — pero el objeto Date resultante sí tiene
// una hora, y de dónde salía antes era inconsistente (la hora exacta en que se abrió el selector
// en el celular, o siempre medianoche en la versión web). Esto fija siempre el mismo horario
// según el rol del campo, sin importar la plataforma ni el momento en que se elija la fecha.
export function normalizarHora(fecha, modo) {
  const normalizada = new Date(fecha);
  if (modo === 'fin') {
    normalizada.setHours(23, 59, 59, 999);
  } else {
    normalizada.setHours(0, 0, 0, 0);
  }
  return normalizada;
}

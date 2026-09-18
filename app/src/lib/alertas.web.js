// react-native-web no implementa Alert.alert (su código es literalmente un método vacío), así que
// acá se usa el confirm/alert nativo del navegador — se ve distinto al diálogo de la app, pero al
// menos funciona: antes, cualquier "¿Anular?"/"¿Promover?"/"¿Eliminar?" en la web no hacía nada.
export function avisar(titulo, mensaje) {
  window.alert(mensaje ? `${titulo}\n\n${mensaje}` : titulo);
}

export function confirmarAccion(titulo, mensaje, { onConfirmar }) {
  if (window.confirm(`${titulo}\n\n${mensaje}`)) {
    onConfirmar();
  }
}

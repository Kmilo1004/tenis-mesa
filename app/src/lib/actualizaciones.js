// Compara dos versiones tipo "1.0.1" campo por campo (no usa localeCompare porque "1.9" no
// debe ganarle a "1.10").
export function esVersionMasNueva(remota, local) {
  const partesRemota = remota.split('.').map(Number);
  const partesLocal = local.split('.').map(Number);
  const longitud = Math.max(partesRemota.length, partesLocal.length);

  for (let i = 0; i < longitud; i++) {
    const r = partesRemota[i] || 0;
    const l = partesLocal[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}
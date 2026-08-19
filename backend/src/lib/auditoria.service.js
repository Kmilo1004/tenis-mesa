// RNF-06: registra quién hizo un cambio administrativo, cuándo, y qué cambió.
// `client` puede ser `prisma` o el `tx` de una transacción en curso.
function registrarAuditoria(client, { usuarioId, accion, entidadTipo, entidadId, detalle }) {
  return client.auditoria.create({
    data: { usuarioId, accion, entidadTipo, entidadId, detalle: detalle ?? undefined },
  });
}

module.exports = { registrarAuditoria };

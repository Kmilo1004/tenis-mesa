// RF-10b/RF-10d: verificación perezosa, igual que la expiración de partidos (RF-06b).
async function cerrarSiVencido(prisma, torneo) {
  if (torneo.estado === 'inscripciones_abiertas' && torneo.fechaLimiteInscripcion < new Date()) {
    return prisma.torneo.update({
      where: { id: torneo.id },
      data: { estado: 'inscripciones_cerradas' },
    });
  }
  return torneo;
}

async function cerrarInscripcionesVencidas(prisma) {
  await prisma.torneo.updateMany({
    where: { estado: 'inscripciones_abiertas', fechaLimiteInscripcion: { lt: new Date() } },
    data: { estado: 'inscripciones_cerradas' },
  });
}

module.exports = { cerrarSiVencido, cerrarInscripcionesVencidas };

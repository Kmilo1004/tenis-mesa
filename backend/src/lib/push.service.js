// Envía una notificación push real vía el servicio de Expo (funciona para Android e iOS una vez
// que el proyecto tenga configuradas sus credenciales de FCM/APNs en EAS). Si el usuario no tiene
// un token guardado, o el envío falla, no rompe nada — la notificación in-app ya quedó guardada
// de todas formas por crearNotificacion.
async function enviarPush(prisma, { usuarioId, titulo, mensaje }) {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId }, select: { pushToken: true } });
    if (!usuario?.pushToken) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: usuario.pushToken,
        title: titulo || 'TM UNIMAG',
        body: mensaje,
        sound: 'default',
      }),
    });
  } catch {
    // sin conexión al servicio de push, token inválido, etc. — no crítico
  }
}

module.exports = { enviarPush };

const { Resend } = require('resend');

const NAVY = '#0B1E4D';
// URL pública de la versión web (GitHub Pages) — el enlace de recuperación se abre ahí, sin
// importar si quien lo recibe tiene la app instalada o no.
const URL_WEB = 'https://kmilo1004.github.io/tenis-mesa';
// Mientras no se configure un dominio propio verificado en Resend, se envía desde su remitente de
// pruebas compartido (funciona igual, sin necesidad de verificar nada).
const REMITENTE = 'TM UNIMAG <onboarding@resend.dev>';

// Envía el correo de recuperación de contraseña con el enlace (con el token) para restablecerla.
// Si RESEND_API_KEY no está configurada, no rompe el flujo — solo queda registrado en el log del
// servidor, igual que el envío de notificaciones push cuando falta la config de Firebase.
async function enviarCorreoRecuperacion(correo, nombre, token) {
  const enlace = `${URL_WEB}/restablecer?token=${token}`;

  if (!process.env.RESEND_API_KEY) {
    // Sin credencial de correo configurada, se deja el enlace en el log del servidor para poder
    // seguir probando/operando manualmente (igual que la app se queda sin push sin FCM).
    console.error(`RESEND_API_KEY no configurada: no se pudo enviar el correo a ${correo}. Enlace: ${enlace}`);
    return;
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: REMITENTE,
      to: correo,
      subject: 'Recupera tu contraseña — TM UNIMAG',
      html: `
        <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <div style="background:${NAVY}; padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color:#fff; font-size: 18px; margin: 0;">TM UNIMAG</h1>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 10px 10px;">
            <p>Hola ${nombre},</p>
            <p>Pediste recuperar tu contraseña. Toca el botón para elegir una nueva (el enlace vence en 1 hora):</p>
            <p style="text-align:center; margin: 28px 0;">
              <a href="${enlace}" style="background:${NAVY}; color:#fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Restablecer contraseña
              </a>
            </p>
            <p style="color:#6B7280; font-size: 13px;">Si no fuiste tú, puedes ignorar este correo — tu contraseña actual sigue funcionando.</p>
          </div>
        </div>
      `,
    });
  } catch (error) {
    console.error('Error enviando correo de recuperación:', error);
  }
}

module.exports = { enviarCorreoRecuperacion };

const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

// Verifica el JWT del header Authorization, que el usuario siga activo, y adjunta su id a la
// request. Rechaza cuentas desactivadas aunque su token todavía sea válido (RNF de seguridad).
async function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: payload.id }, select: { activo: true } });
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Esta cuenta está inactiva' });
    }

    req.usuarioId = payload.id;
    return next();
  } catch (error) {
    return next(error);
  }
}

// Roles de un usuario, como lista de strings. Único lugar que consulta usuario_roles, para que
// requiereRol y cualquier código que necesite los roles como dato (no solo como puerta) queden
// sincronizados si el modelo de roles cambia.
async function obtenerRoles(usuarioId) {
  const roles = await prisma.usuarioRol.findMany({ where: { usuarioId } });
  return roles.map((r) => r.rol);
}

// Restringe el acceso a usuarios que tengan al menos uno de los roles indicados
function requiereRol(...rolesPermitidos) {
  return async (req, res, next) => {
    try {
      const roles = await obtenerRoles(req.usuarioId);
      const tieneAcceso = roles.some((rol) => rolesPermitidos.includes(rol));

      if (!tieneAcceso) {
        return res.status(403).json({ error: 'No tienes permisos para esta acción' });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { verificarToken, requiereRol, obtenerRoles };

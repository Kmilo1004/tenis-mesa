const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

// Verifica el JWT del header Authorization y adjunta el id del usuario a la request
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuarioId = payload.id;
    return next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

// Restringe el acceso a usuarios que tengan al menos uno de los roles indicados
function requiereRol(...rolesPermitidos) {
  return async (req, res, next) => {
    const roles = await prisma.usuarioRol.findMany({ where: { usuarioId: req.usuarioId } });
    const tieneAcceso = roles.some((r) => rolesPermitidos.includes(r.rol));

    if (!tieneAcceso) {
      return res.status(403).json({ error: 'No tienes permisos para esta acción' });
    }

    return next();
  };
}

module.exports = { verificarToken, requiereRol };

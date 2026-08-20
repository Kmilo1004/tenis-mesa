const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const router = express.Router();

const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIPOS_VALIDOS = ['interno', 'externo'];

// Lista fija de universidades/clubes seleccionables al registrarse. Es solo informativo (no
// separa rankings ni torneos): agregar una nueva institución es simplemente sumarla aquí.
const INSTITUCIONES_VALIDAS = ['Universidad del Magdalena', 'Independiente'];

function generarToken(usuarioId) {
  return jwt.sign({ id: usuarioId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
}

function excluirPasswordHash(usuario) {
  const { passwordHash, ...resto } = usuario;
  return resto;
}

// POST /auth/registro
router.post('/auth/registro', async (req, res, next) => {
  try {
    const { nombre, correo, password, tipo, procedencia, institucion, programaFacultad } = req.body;

    if (!nombre || !correo || !password || !tipo) {
      return res.status(400).json({ error: 'nombre, correo, password y tipo son obligatorios' });
    }

    if (!CORREO_REGEX.test(correo)) {
      return res.status(400).json({ error: 'El correo no tiene un formato válido' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
    }

    if (!TIPOS_VALIDOS.includes(tipo)) {
      return res.status(400).json({ error: `tipo debe ser uno de: ${TIPOS_VALIDOS.join(', ')}` });
    }

    if (institucion !== undefined && institucion !== null && !INSTITUCIONES_VALIDAS.includes(institucion)) {
      return res.status(400).json({ error: `institucion debe ser una de: ${INSTITUCIONES_VALIDAS.join(', ')}` });
    }

    const correoExistente = await prisma.usuario.findUnique({ where: { correo } });
    if (correoExistente) {
      return res.status(409).json({ error: 'Ya existe un usuario registrado con ese correo' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const usuario = await prisma.usuario.create({
      data: {
        nombre,
        correo,
        passwordHash,
        tipo,
        procedencia,
        institucion,
        programaFacultad,
        roles: { create: { rol: 'jugador' } },
      },
      include: { roles: true },
    });

    const token = generarToken(usuario.id);

    return res.status(201).json({ usuario: excluirPasswordHash(usuario), token });
  } catch (error) {
    return next(error);
  }
});

// POST /auth/login
router.post('/auth/login', async (req, res, next) => {
  try {
    const { correo, password } = req.body;

    if (!correo || !password) {
      return res.status(400).json({ error: 'correo y password son obligatorios' });
    }

    const usuario = await prisma.usuario.findUnique({ where: { correo }, include: { roles: true } });

    if (!usuario || !usuario.passwordHash) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const passwordValido = await bcrypt.compare(password, usuario.passwordHash);
    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!usuario.activo) {
      return res.status(403).json({ error: 'Este usuario está inactivo' });
    }

    const token = generarToken(usuario.id);

    return res.status(200).json({ usuario: excluirPasswordHash(usuario), token });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;

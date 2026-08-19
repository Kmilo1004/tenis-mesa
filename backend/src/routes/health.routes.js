const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

// GET /health — primera prueba de que backend + base de datos están conectados (Fase 0)
router.get('/health', async (req, res) => {
  const estado = {
    servidor: 'ok',
    hora: new Date().toISOString(),
    baseDeDatos: 'desconocido',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    estado.baseDeDatos = 'ok';
    return res.status(200).json(estado);
  } catch (error) {
    estado.baseDeDatos = 'error';
    estado.detalle = error.message;
    return res.status(503).json(estado);
  }
});

module.exports = router;

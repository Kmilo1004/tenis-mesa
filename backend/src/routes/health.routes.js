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
    // El mensaje de Prisma incluye el host y la cadena de conexión: queda solo en el log.
    console.error('Health check: la base de datos no respondió —', error);
    estado.baseDeDatos = 'error';
    return res.status(503).json(estado);
  }
});

module.exports = router;

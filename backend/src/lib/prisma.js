const { PrismaClient } = require('@prisma/client');

// Una sola instancia reutilizada en toda la app (buena práctica con Prisma)
const prisma = new PrismaClient();

module.exports = prisma;

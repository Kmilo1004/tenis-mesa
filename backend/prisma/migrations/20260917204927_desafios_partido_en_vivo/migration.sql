-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EstadoPartido" ADD VALUE 'desafio_pendiente';
ALTER TYPE "EstadoPartido" ADD VALUE 'desafio_rechazado';
ALTER TYPE "EstadoPartido" ADD VALUE 'en_juego';

-- AlterTable
ALTER TABLE "sets_partido" ADD COLUMN     "analisis_jugador_a" TEXT,
ADD COLUMN     "analisis_jugador_b" TEXT;

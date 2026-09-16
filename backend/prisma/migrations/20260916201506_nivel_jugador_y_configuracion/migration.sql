-- CreateEnum
CREATE TYPE "NivelJugador" AS ENUM ('principiante', 'formativo', 'precompetitivo', 'competitivo');

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "nivel" "NivelJugador" NOT NULL DEFAULT 'competitivo';

-- CreateTable
CREATE TABLE "configuracion" (
    "id" TEXT NOT NULL,
    "mostrar_nivel_en_ranking" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id")
);

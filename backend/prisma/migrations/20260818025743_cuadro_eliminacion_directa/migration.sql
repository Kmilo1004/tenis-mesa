-- CreateEnum
CREATE TYPE "SlotCuadro" AS ENUM ('A', 'B');

-- AlterEnum
ALTER TYPE "EstadoPartido" ADD VALUE 'por_definir';

-- DropForeignKey
ALTER TABLE "partidos" DROP CONSTRAINT "partidos_jugador_a_id_fkey";

-- DropForeignKey
ALTER TABLE "partidos" DROP CONSTRAINT "partidos_jugador_b_id_fkey";

-- AlterTable
ALTER TABLE "partidos" ADD COLUMN     "nivel_ronda" INTEGER,
ADD COLUMN     "partido_siguiente_id" TEXT,
ADD COLUMN     "ronda" TEXT,
ADD COLUMN     "slot_siguiente" "SlotCuadro",
ADD COLUMN     "torneo_id" TEXT,
ALTER COLUMN "jugador_a_id" DROP NOT NULL,
ALTER COLUMN "jugador_b_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_torneo_id_fkey" FOREIGN KEY ("torneo_id") REFERENCES "torneos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_jugador_a_id_fkey" FOREIGN KEY ("jugador_a_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_jugador_b_id_fkey" FOREIGN KEY ("jugador_b_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_partido_siguiente_id_fkey" FOREIGN KEY ("partido_siguiente_id") REFERENCES "partidos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

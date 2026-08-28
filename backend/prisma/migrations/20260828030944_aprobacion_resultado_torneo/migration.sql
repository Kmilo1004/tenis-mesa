-- AlterEnum
ALTER TYPE "EstadoPartido" ADD VALUE 'pendiente_aprobacion';

-- AlterTable
ALTER TABLE "partidos" ADD COLUMN     "reportado_por" TEXT;

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_reportado_por_fkey" FOREIGN KEY ("reportado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

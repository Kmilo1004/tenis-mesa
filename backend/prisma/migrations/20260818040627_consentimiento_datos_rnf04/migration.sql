-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "consentimiento_datos" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "fecha_consentimiento" TIMESTAMP(3);

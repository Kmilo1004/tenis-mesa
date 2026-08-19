-- AlterTable
ALTER TABLE "partidos" ADD COLUMN     "grupo_id" TEXT;

-- CreateTable
CREATE TABLE "grupos" (
    "id" TEXT NOT NULL,
    "torneo_id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "grupos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupo_jugadores" (
    "id" TEXT NOT NULL,
    "grupo_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,

    CONSTRAINT "grupo_jugadores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "grupo_jugadores_grupo_id_usuario_id_key" ON "grupo_jugadores"("grupo_id", "usuario_id");

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupos" ADD CONSTRAINT "grupos_torneo_id_fkey" FOREIGN KEY ("torneo_id") REFERENCES "torneos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupo_jugadores" ADD CONSTRAINT "grupo_jugadores_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "grupos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupo_jugadores" ADD CONSTRAINT "grupo_jugadores_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

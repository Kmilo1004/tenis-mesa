-- CreateTable
CREATE TABLE "notas_partido" (
    "id" TEXT NOT NULL,
    "partido_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notas_partido_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notas_partido_partido_id_usuario_id_key" ON "notas_partido"("partido_id", "usuario_id");

-- AddForeignKey
ALTER TABLE "notas_partido" ADD CONSTRAINT "notas_partido_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "partidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notas_partido" ADD CONSTRAINT "notas_partido_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

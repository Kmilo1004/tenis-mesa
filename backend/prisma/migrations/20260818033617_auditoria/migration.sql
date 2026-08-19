-- CreateTable
CREATE TABLE "auditoria" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad_tipo" TEXT NOT NULL,
    "entidad_id" TEXT NOT NULL,
    "detalle" JSONB,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

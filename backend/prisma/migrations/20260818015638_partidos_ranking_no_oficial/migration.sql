-- CreateEnum
CREATE TYPE "TipoPartido" AS ENUM ('casual', 'amistoso', 'torneo_flash', 'torneo_oficial');

-- CreateEnum
CREATE TYPE "TipoRanking" AS ENUM ('oficial', 'no_oficial');

-- CreateEnum
CREATE TYPE "EstadoPartido" AS ENUM ('pendiente', 'confirmado', 'descartado', 'en_revision', 'anulado');

-- CreateEnum
CREATE TYPE "MotivoDisputa" AS ENUM ('marcador_incorrecto', 'no_jugado', 'rival_equivocado');

-- CreateTable
CREATE TABLE "partidos" (
    "id" TEXT NOT NULL,
    "jugador_a_id" TEXT NOT NULL,
    "jugador_b_id" TEXT NOT NULL,
    "ganador_id" TEXT,
    "tipo_partido" "TipoPartido" NOT NULL,
    "afecta_ranking" "TipoRanking" NOT NULL,
    "promovido_a_oficial" BOOLEAN NOT NULL DEFAULT false,
    "estado" "EstadoPartido" NOT NULL DEFAULT 'pendiente',
    "motivo_disputa" "MotivoDisputa",
    "marcador_propuesto" JSONB,
    "comentario_disputa" TEXT,
    "fecha_limite_confirmacion" TIMESTAMP(3),
    "fecha_partido" TIMESTAMP(3) NOT NULL,
    "registrado_por" TEXT NOT NULL,
    "validado_por" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sets_partido" (
    "id" TEXT NOT NULL,
    "partido_id" TEXT NOT NULL,
    "numero_set" INTEGER NOT NULL,
    "puntos_jugador_a" INTEGER NOT NULL,
    "puntos_jugador_b" INTEGER NOT NULL,

    CONSTRAINT "sets_partido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historial_ranking" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "partido_id" TEXT NOT NULL,
    "tipo_ranking" "TipoRanking" NOT NULL,
    "elo_antes" INTEGER NOT NULL,
    "elo_despues" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historial_ranking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sets_partido_partido_id_numero_set_key" ON "sets_partido"("partido_id", "numero_set");

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_jugador_a_id_fkey" FOREIGN KEY ("jugador_a_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_jugador_b_id_fkey" FOREIGN KEY ("jugador_b_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_ganador_id_fkey" FOREIGN KEY ("ganador_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_registrado_por_fkey" FOREIGN KEY ("registrado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partidos" ADD CONSTRAINT "partidos_validado_por_fkey" FOREIGN KEY ("validado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sets_partido" ADD CONSTRAINT "sets_partido_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "partidos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_ranking" ADD CONSTRAINT "historial_ranking_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historial_ranking" ADD CONSTRAINT "historial_ranking_partido_id_fkey" FOREIGN KEY ("partido_id") REFERENCES "partidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

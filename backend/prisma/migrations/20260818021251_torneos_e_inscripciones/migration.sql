-- CreateEnum
CREATE TYPE "TipoTorneo" AS ENUM ('flash', 'oficial');

-- CreateEnum
CREATE TYPE "AlcanceTorneo" AS ENUM ('interno', 'abierto');

-- CreateEnum
CREATE TYPE "FormatoTorneo" AS ENUM ('eliminacion_directa', 'grupos', 'mixto');

-- CreateEnum
CREATE TYPE "EstadoTorneo" AS ENUM ('inscripciones_abiertas', 'inscripciones_cerradas', 'en_curso', 'finalizado');

-- CreateEnum
CREATE TYPE "MetodoAsignacionGrupos" AS ENUM ('aleatorio', 'ranking_serpentina', 'manual');

-- CreateEnum
CREATE TYPE "OrigenInscripcion" AS ENUM ('autoinscripcion', 'agregado_por_admin');

-- CreateTable
CREATE TABLE "torneos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoTorneo" NOT NULL,
    "alcance" "AlcanceTorneo" NOT NULL,
    "formato" "FormatoTorneo" NOT NULL,
    "fecha_inicio" TIMESTAMP(3) NOT NULL,
    "fecha_fin" TIMESTAMP(3) NOT NULL,
    "fecha_limite_inscripcion" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoTorneo" NOT NULL DEFAULT 'inscripciones_abiertas',
    "numero_grupos" INTEGER,
    "metodo_asignacion_grupos" "MetodoAsignacionGrupos",
    "clasificados_por_grupo" INTEGER,
    "creado_por" TEXT NOT NULL,

    CONSTRAINT "torneos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscripciones" (
    "id" TEXT NOT NULL,
    "torneo_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "fecha_inscripcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origen" "OrigenInscripcion" NOT NULL,
    "semilla" INTEGER,

    CONSTRAINT "inscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inscripciones_torneo_id_usuario_id_key" ON "inscripciones"("torneo_id", "usuario_id");

-- AddForeignKey
ALTER TABLE "torneos" ADD CONSTRAINT "torneos_creado_por_fkey" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_torneo_id_fkey" FOREIGN KEY ("torneo_id") REFERENCES "torneos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

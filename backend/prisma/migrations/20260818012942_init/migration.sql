-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('interno', 'externo');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('jugador', 'arbitro', 'administrador');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT,
    "password_hash" TEXT,
    "tipo" "TipoUsuario" NOT NULL,
    "procedencia" TEXT,
    "programa_facultad" TEXT,
    "elo_oficial" INTEGER NOT NULL DEFAULT 1000,
    "elo_no_oficial" INTEGER NOT NULL DEFAULT 1000,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fecha_registro" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario_roles" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,

    CONSTRAINT "usuario_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_correo_key" ON "usuarios"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_roles_usuario_id_rol_key" ON "usuario_roles"("usuario_id", "rol");

-- AddForeignKey
ALTER TABLE "usuario_roles" ADD CONSTRAINT "usuario_roles_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

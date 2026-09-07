-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "reset_token_expira" TIMESTAMP(3),
ADD COLUMN     "reset_token_hash" TEXT;

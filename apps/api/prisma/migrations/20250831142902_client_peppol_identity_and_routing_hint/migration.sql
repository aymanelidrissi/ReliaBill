-- CreateEnum
CREATE TYPE "public"."DeliveryMode" AS ENUM ('PEPPOL', 'HERMES');

-- AlterTable
ALTER TABLE "public"."Client" ADD COLUMN     "deliveryMode" "public"."DeliveryMode" NOT NULL DEFAULT 'PEPPOL',
ADD COLUMN     "peppolId" TEXT,
ADD COLUMN     "peppolScheme" TEXT DEFAULT 'iso6523-actorid-upis';

-- CreateIndex
CREATE INDEX "Client_companyId_peppolId_idx" ON "public"."Client"("companyId", "peppolId");

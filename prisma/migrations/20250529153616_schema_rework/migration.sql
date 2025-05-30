/*
  Warnings:

  - You are about to drop the column `amount` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `paidAt` on the `Invoice` table. All the data in the column will be lost.
  - The `status` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[orgId,number]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `customerId` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dueAt` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `number` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orgId` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subtotal` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `taxTotal` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `total` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `orgId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'staff', 'accountant');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'sent', 'delivered', 'paid', 'overdue', 'void');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateEnum
CREATE TYPE "DeliveryChan" AS ENUM ('peppol', 'hermes', 'email');

-- CreateEnum
CREATE TYPE "PayMethod" AS ENUM ('stripe', 'cash', 'banktransfer', 'sepa');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('queued', 'sent', 'delivered', 'failed');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'LOGIN');

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "amount",
DROP COLUMN "paidAt",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "currency" CHAR(3) NOT NULL DEFAULT 'EUR',
ADD COLUMN     "customerId" TEXT NOT NULL,
ADD COLUMN     "direction" "Direction" NOT NULL DEFAULT 'OUTBOUND',
ADD COLUMN     "dueAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "fxRate" DECIMAL(18,6),
ADD COLUMN     "number" INTEGER NOT NULL,
ADD COLUMN     "orgId" TEXT NOT NULL,
ADD COLUMN     "pdfUrl" TEXT,
ADD COLUMN     "peppolXmlUrl" TEXT,
ADD COLUMN     "stripeLinkId" TEXT,
ADD COLUMN     "subtotal" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "subtotalEur" DECIMAL(18,2),
ADD COLUMN     "taxTotal" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "total" DECIMAL(18,2) NOT NULL,
ADD COLUMN     "totalEur" DECIMAL(18,2),
DROP COLUMN "status",
ADD COLUMN     "status" "InvoiceStatus" NOT NULL DEFAULT 'draft';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "orgId" TEXT NOT NULL,
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'staff';

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vat" TEXT,
    "country" CHAR(2) NOT NULL,
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "sessionToken" TEXT NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vat" TEXT,
    "email" TEXT,
    "address" TEXT,
    "country" CHAR(2),
    "currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "qty" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "taxRate" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceNote" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "method" "PayMethod" NOT NULL,
    "providerRef" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeppolDelivery" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "msgId" TEXT NOT NULL,
    "channel" "DeliveryChan" NOT NULL,
    "status" "DeliveryStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),

    CONSTRAINT "PeppolDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurrencyFX" (
    "day" DATE NOT NULL,
    "from" CHAR(3) NOT NULL,
    "to" CHAR(3) NOT NULL DEFAULT 'EUR',
    "rate" DECIMAL(18,6) NOT NULL,

    CONSTRAINT "CurrencyFX_pkey" PRIMARY KEY ("day","from","to")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "orgId" TEXT,
    "tableName" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "diff" JSONB,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_vat_key" ON "Organization"("vat");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PeppolDelivery_msgId_key" ON "PeppolDelivery"("msgId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_orgId_number_key" ON "Invoice"("orgId", "number");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceNote" ADD CONSTRAINT "InvoiceNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeppolDelivery" ADD CONSTRAINT "PeppolDelivery_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

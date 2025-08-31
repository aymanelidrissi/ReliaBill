-- CreateTable
CREATE TABLE "public"."InvoiceCounter" (
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InvoiceCounter_pkey" PRIMARY KEY ("companyId","year")
);

-- AddForeignKey
ALTER TABLE "public"."InvoiceCounter" ADD CONSTRAINT "InvoiceCounter_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "public"."Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

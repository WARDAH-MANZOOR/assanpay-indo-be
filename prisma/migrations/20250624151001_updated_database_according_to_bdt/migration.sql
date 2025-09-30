/*
  Warnings:

  - The values [DONAMART] on the enum `PaymentMethodEnum` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethodEnum_new" AS ENUM ('PAYINX', 'DALALMART');
ALTER TABLE "Merchant" ALTER COLUMN "depositMethod" DROP DEFAULT;
ALTER TABLE "Merchant" ALTER COLUMN "withdrawalMethod" DROP DEFAULT;
ALTER TABLE "Merchant" ALTER COLUMN "depositMethod" TYPE "PaymentMethodEnum_new" USING ("depositMethod"::text::"PaymentMethodEnum_new");
ALTER TABLE "Merchant" ALTER COLUMN "withdrawalMethod" TYPE "PaymentMethodEnum_new" USING ("withdrawalMethod"::text::"PaymentMethodEnum_new");
ALTER TYPE "PaymentMethodEnum" RENAME TO "PaymentMethodEnum_old";
ALTER TYPE "PaymentMethodEnum_new" RENAME TO "PaymentMethodEnum";
DROP TYPE "PaymentMethodEnum_old";
ALTER TABLE "Merchant" ALTER COLUMN "depositMethod" SET DEFAULT 'PAYINX';
ALTER TABLE "Merchant" ALTER COLUMN "withdrawalMethod" SET DEFAULT 'PAYINX';
COMMIT;

-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "dalalMartMerchantId" INTEGER;

-- CreateTable
CREATE TABLE "DalalMartMerchant" (
    "id" SERIAL NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "DalalMartMerchant_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_dalalMartMerchantId_fkey" FOREIGN KEY ("dalalMartMerchantId") REFERENCES "DalalMartMerchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

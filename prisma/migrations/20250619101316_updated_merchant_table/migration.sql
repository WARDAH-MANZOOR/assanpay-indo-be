/*
  Warnings:

  - You are about to drop the column `EasyPaisaDisburseAccountId` on the `Merchant` table. All the data in the column will be lost.
  - You are about to drop the column `JazzCashDisburseAccountId` on the `Merchant` table. All the data in the column will be lost.
  - You are about to drop the column `easyPaisaMerchantId` on the `Merchant` table. All the data in the column will be lost.
  - You are about to drop the column `easypaisaInquiryMethod` on the `Merchant` table. All the data in the column will be lost.
  - You are about to drop the column `easypaisaPaymentMethod` on the `Merchant` table. All the data in the column will be lost.
  - You are about to drop the column `jazzCashCardMerchantId` on the `Merchant` table. All the data in the column will be lost.
  - You are about to drop the column `jazzCashDisburseInquiryMethod` on the `Merchant` table. All the data in the column will be lost.
  - You are about to drop the column `jazzCashInquiryMethod` on the `Merchant` table. All the data in the column will be lost.
  - You are about to drop the column `jazzCashMerchantId` on the `Merchant` table. All the data in the column will be lost.
  - You are about to drop the column `payFastMerchantId` on the `Merchant` table. All the data in the column will be lost.
  - You are about to drop the column `payfastInquiryMethod` on the `Merchant` table. All the data in the column will be lost.
  - You are about to drop the column `swichMerchantId` on the `Merchant` table. All the data in the column will be lost.
  - You are about to drop the column `zindigiMerchantId` on the `Merchant` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PaymentMethodEnum" AS ENUM ('PAYINX', 'DONAMART');

-- CreateEnum
CREATE TYPE "InquiryMethod" AS ENUM ('DATABASE', 'WALLET');

-- DropForeignKey
ALTER TABLE "Merchant" DROP CONSTRAINT "Merchant_jazzCashMerchantId_fkey";

-- AlterTable
ALTER TABLE "Merchant" DROP COLUMN "EasyPaisaDisburseAccountId",
DROP COLUMN "JazzCashDisburseAccountId",
DROP COLUMN "easyPaisaMerchantId",
DROP COLUMN "easypaisaInquiryMethod",
DROP COLUMN "easypaisaPaymentMethod",
DROP COLUMN "jazzCashCardMerchantId",
DROP COLUMN "jazzCashDisburseInquiryMethod",
DROP COLUMN "jazzCashInquiryMethod",
DROP COLUMN "jazzCashMerchantId",
DROP COLUMN "payFastMerchantId",
DROP COLUMN "payfastInquiryMethod",
DROP COLUMN "swichMerchantId",
DROP COLUMN "zindigiMerchantId",
ADD COLUMN     "depositInquiryMethod" "InquiryMethod" DEFAULT 'DATABASE',
ADD COLUMN     "depositMethod" "PaymentMethodEnum" DEFAULT 'PAYINX',
ADD COLUMN     "payinxMerchantId" INTEGER,
ADD COLUMN     "withdrawalInquiryMethod" "InquiryMethod" DEFAULT 'DATABASE',
ADD COLUMN     "withdrawalMethod" "PaymentMethodEnum" DEFAULT 'PAYINX';

-- DropEnum
DROP TYPE "EasypaisaInquiryMethod";

-- DropEnum
DROP TYPE "EasypaisaPaymentMethodEnum";

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_payinxMerchantId_fkey" FOREIGN KEY ("payinxMerchantId") REFERENCES "PayinxMerchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

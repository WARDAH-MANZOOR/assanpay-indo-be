/*
  Warnings:

  - You are about to drop the `EasyPaisaDisburseAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EasyPaisaMerchant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JazzCashCardMerchant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JazzCashDisburseAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JazzCashMerchant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PayFastMerchant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SwichMerchant` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ZindigiMerchant` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Merchant" DROP CONSTRAINT "Merchant_EasyPaisaDisburseAccountId_fkey";

-- DropForeignKey
ALTER TABLE "Merchant" DROP CONSTRAINT "Merchant_JazzCashDisburseAccountId_fkey";

-- DropForeignKey
ALTER TABLE "Merchant" DROP CONSTRAINT "Merchant_easyPaisaMerchantId_fkey";

-- DropForeignKey
ALTER TABLE "Merchant" DROP CONSTRAINT "Merchant_jazzCashCardMerchantId_fkey";

-- DropForeignKey
ALTER TABLE "Merchant" DROP CONSTRAINT "Merchant_jazzCashMerchantId_fkey";

-- DropForeignKey
ALTER TABLE "Merchant" DROP CONSTRAINT "Merchant_payFastMerchantId_fkey";

-- DropForeignKey
ALTER TABLE "Merchant" DROP CONSTRAINT "Merchant_swichMerchantId_fkey";

-- DropForeignKey
ALTER TABLE "Merchant" DROP CONSTRAINT "Merchant_zindigiMerchantId_fkey";

-- DropTable
DROP TABLE "EasyPaisaDisburseAccount";

-- DropTable
DROP TABLE "EasyPaisaMerchant";

-- DropTable
DROP TABLE "JazzCashCardMerchant";

-- DropTable
DROP TABLE "JazzCashDisburseAccount";

-- DropTable
DROP TABLE "JazzCashMerchant";

-- DropTable
DROP TABLE "PayFastMerchant";

-- DropTable
DROP TABLE "SwichMerchant";

-- DropTable
DROP TABLE "ZindigiMerchant";

-- CreateTable
CREATE TABLE "PayinxMerchant" (
    "id" SERIAL NOT NULL,
    "secretKey" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "merchant_of" TEXT,
    "merchantId" INTEGER NOT NULL,

    CONSTRAINT "PayinxMerchant_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_jazzCashMerchantId_fkey" FOREIGN KEY ("jazzCashMerchantId") REFERENCES "PayinxMerchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

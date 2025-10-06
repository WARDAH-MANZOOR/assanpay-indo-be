/*
  Warnings:

  - You are about to drop the column `bkashDepositMethod` on the `Merchant` table. All the data in the column will be lost.
  - You are about to drop the column `bkashWithdrawalMethod` on the `Merchant` table. All the data in the column will be lost.
  - You are about to drop the column `nagadDepositMethod` on the `Merchant` table. All the data in the column will be lost.
  - You are about to drop the column `nagadWithdrawalMethod` on the `Merchant` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Merchant" DROP COLUMN "bkashDepositMethod",
DROP COLUMN "bkashWithdrawalMethod",
DROP COLUMN "nagadDepositMethod",
DROP COLUMN "nagadWithdrawalMethod";

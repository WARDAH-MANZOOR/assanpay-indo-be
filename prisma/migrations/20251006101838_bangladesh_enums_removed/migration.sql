/*
  Warnings:

  - The values [PAYINX,DALALMART,SHURJOPAY,BKASHSETUP] on the enum `PaymentMethodEnum` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."PaymentMethodEnum_new" AS ENUM ('STARPAGO', 'LAUNCX');
ALTER TABLE "public"."Merchant" ALTER COLUMN "danaDepositMethod" DROP DEFAULT;
ALTER TABLE "public"."Merchant" ALTER COLUMN "danaWithdrawalMethod" DROP DEFAULT;
ALTER TABLE "public"."Merchant" ALTER COLUMN "depositMethod" DROP DEFAULT;
ALTER TABLE "public"."Merchant" ALTER COLUMN "gopayDepositMethod" DROP DEFAULT;
ALTER TABLE "public"."Merchant" ALTER COLUMN "gopayWithdrawalMethod" DROP DEFAULT;
ALTER TABLE "public"."Merchant" ALTER COLUMN "linkajaDepositMethod" DROP DEFAULT;
ALTER TABLE "public"."Merchant" ALTER COLUMN "linkajaWithdrawalMethod" DROP DEFAULT;
ALTER TABLE "public"."Merchant" ALTER COLUMN "ovoDepositMethod" DROP DEFAULT;
ALTER TABLE "public"."Merchant" ALTER COLUMN "ovoWithdrawalMethod" DROP DEFAULT;
ALTER TABLE "public"."Merchant" ALTER COLUMN "qrisDepositMethod" DROP DEFAULT;
ALTER TABLE "public"."Merchant" ALTER COLUMN "qrisWithdrawalMethod" DROP DEFAULT;
ALTER TABLE "public"."Merchant" ALTER COLUMN "shopeepayDepositMethod" DROP DEFAULT;
ALTER TABLE "public"."Merchant" ALTER COLUMN "shopeepayWithdrawalMethod" DROP DEFAULT;
ALTER TABLE "public"."Merchant" ALTER COLUMN "vaDepositMethod" DROP DEFAULT;
ALTER TABLE "public"."Merchant" ALTER COLUMN "vaWithdrawalMethod" DROP DEFAULT;
ALTER TABLE "public"."Merchant" ALTER COLUMN "withdrawalMethod" DROP DEFAULT;
ALTER TABLE "public"."Merchant" ALTER COLUMN "depositMethod" TYPE "public"."PaymentMethodEnum_new" USING ("depositMethod"::text::"public"."PaymentMethodEnum_new");
ALTER TABLE "public"."Merchant" ALTER COLUMN "withdrawalMethod" TYPE "public"."PaymentMethodEnum_new" USING ("withdrawalMethod"::text::"public"."PaymentMethodEnum_new");
ALTER TABLE "public"."Merchant" ALTER COLUMN "qrisDepositMethod" TYPE "public"."PaymentMethodEnum_new" USING ("qrisDepositMethod"::text::"public"."PaymentMethodEnum_new");
ALTER TABLE "public"."Merchant" ALTER COLUMN "ovoDepositMethod" TYPE "public"."PaymentMethodEnum_new" USING ("ovoDepositMethod"::text::"public"."PaymentMethodEnum_new");
ALTER TABLE "public"."Merchant" ALTER COLUMN "danaDepositMethod" TYPE "public"."PaymentMethodEnum_new" USING ("danaDepositMethod"::text::"public"."PaymentMethodEnum_new");
ALTER TABLE "public"."Merchant" ALTER COLUMN "gopayDepositMethod" TYPE "public"."PaymentMethodEnum_new" USING ("gopayDepositMethod"::text::"public"."PaymentMethodEnum_new");
ALTER TABLE "public"."Merchant" ALTER COLUMN "linkajaDepositMethod" TYPE "public"."PaymentMethodEnum_new" USING ("linkajaDepositMethod"::text::"public"."PaymentMethodEnum_new");
ALTER TABLE "public"."Merchant" ALTER COLUMN "shopeepayDepositMethod" TYPE "public"."PaymentMethodEnum_new" USING ("shopeepayDepositMethod"::text::"public"."PaymentMethodEnum_new");
ALTER TABLE "public"."Merchant" ALTER COLUMN "vaDepositMethod" TYPE "public"."PaymentMethodEnum_new" USING ("vaDepositMethod"::text::"public"."PaymentMethodEnum_new");
ALTER TABLE "public"."Merchant" ALTER COLUMN "qrisWithdrawalMethod" TYPE "public"."PaymentMethodEnum_new" USING ("qrisWithdrawalMethod"::text::"public"."PaymentMethodEnum_new");
ALTER TABLE "public"."Merchant" ALTER COLUMN "ovoWithdrawalMethod" TYPE "public"."PaymentMethodEnum_new" USING ("ovoWithdrawalMethod"::text::"public"."PaymentMethodEnum_new");
ALTER TABLE "public"."Merchant" ALTER COLUMN "danaWithdrawalMethod" TYPE "public"."PaymentMethodEnum_new" USING ("danaWithdrawalMethod"::text::"public"."PaymentMethodEnum_new");
ALTER TABLE "public"."Merchant" ALTER COLUMN "gopayWithdrawalMethod" TYPE "public"."PaymentMethodEnum_new" USING ("gopayWithdrawalMethod"::text::"public"."PaymentMethodEnum_new");
ALTER TABLE "public"."Merchant" ALTER COLUMN "linkajaWithdrawalMethod" TYPE "public"."PaymentMethodEnum_new" USING ("linkajaWithdrawalMethod"::text::"public"."PaymentMethodEnum_new");
ALTER TABLE "public"."Merchant" ALTER COLUMN "shopeepayWithdrawalMethod" TYPE "public"."PaymentMethodEnum_new" USING ("shopeepayWithdrawalMethod"::text::"public"."PaymentMethodEnum_new");
ALTER TABLE "public"."Merchant" ALTER COLUMN "vaWithdrawalMethod" TYPE "public"."PaymentMethodEnum_new" USING ("vaWithdrawalMethod"::text::"public"."PaymentMethodEnum_new");
ALTER TYPE "public"."PaymentMethodEnum" RENAME TO "PaymentMethodEnum_old";
ALTER TYPE "public"."PaymentMethodEnum_new" RENAME TO "PaymentMethodEnum";
DROP TYPE "public"."PaymentMethodEnum_old";
ALTER TABLE "public"."Merchant" ALTER COLUMN "danaDepositMethod" SET DEFAULT 'STARPAGO';
ALTER TABLE "public"."Merchant" ALTER COLUMN "danaWithdrawalMethod" SET DEFAULT 'STARPAGO';
ALTER TABLE "public"."Merchant" ALTER COLUMN "depositMethod" SET DEFAULT 'STARPAGO';
ALTER TABLE "public"."Merchant" ALTER COLUMN "gopayDepositMethod" SET DEFAULT 'STARPAGO';
ALTER TABLE "public"."Merchant" ALTER COLUMN "gopayWithdrawalMethod" SET DEFAULT 'STARPAGO';
ALTER TABLE "public"."Merchant" ALTER COLUMN "linkajaDepositMethod" SET DEFAULT 'STARPAGO';
ALTER TABLE "public"."Merchant" ALTER COLUMN "linkajaWithdrawalMethod" SET DEFAULT 'STARPAGO';
ALTER TABLE "public"."Merchant" ALTER COLUMN "ovoDepositMethod" SET DEFAULT 'STARPAGO';
ALTER TABLE "public"."Merchant" ALTER COLUMN "ovoWithdrawalMethod" SET DEFAULT 'STARPAGO';
ALTER TABLE "public"."Merchant" ALTER COLUMN "qrisDepositMethod" SET DEFAULT 'STARPAGO';
ALTER TABLE "public"."Merchant" ALTER COLUMN "qrisWithdrawalMethod" SET DEFAULT 'STARPAGO';
ALTER TABLE "public"."Merchant" ALTER COLUMN "shopeepayDepositMethod" SET DEFAULT 'STARPAGO';
ALTER TABLE "public"."Merchant" ALTER COLUMN "shopeepayWithdrawalMethod" SET DEFAULT 'STARPAGO';
ALTER TABLE "public"."Merchant" ALTER COLUMN "vaDepositMethod" SET DEFAULT 'STARPAGO';
ALTER TABLE "public"."Merchant" ALTER COLUMN "vaWithdrawalMethod" SET DEFAULT 'STARPAGO';
ALTER TABLE "public"."Merchant" ALTER COLUMN "withdrawalMethod" SET DEFAULT 'STARPAGO';
COMMIT;

-- AlterTable
ALTER TABLE "public"."Merchant" ALTER COLUMN "depositMethod" SET DEFAULT 'STARPAGO',
ALTER COLUMN "withdrawalMethod" SET DEFAULT 'STARPAGO';

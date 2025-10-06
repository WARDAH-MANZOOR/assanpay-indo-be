-- AlterTable
ALTER TABLE "public"."Merchant" ADD COLUMN     "qrisWithdrawalMethod" "public"."PaymentMethodEnum" DEFAULT 'STARPAGO';

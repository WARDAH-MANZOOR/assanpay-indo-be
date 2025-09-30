-- AlterTable
ALTER TABLE "Merchant" ADD COLUMN     "bkashDepositMethod" "PaymentMethodEnum" DEFAULT 'PAYINX',
ADD COLUMN     "bkashWithdrawalMethod" "PaymentMethodEnum" DEFAULT 'PAYINX',
ADD COLUMN     "nagadDepositMethod" "PaymentMethodEnum" DEFAULT 'PAYINX',
ADD COLUMN     "nagadWithdrawalMethod" "PaymentMethodEnum" DEFAULT 'PAYINX';

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('completed', 'pending', 'failed', 'paid');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('wallet', 'card', 'bank');

-- CreateEnum
CREATE TYPE "ProviderEnum" AS ENUM ('JAZZCASH', 'EASYPAISA');

-- CreateEnum
CREATE TYPE "EasypaisaPaymentMethodEnum" AS ENUM ('DIRECT', 'SWITCH', 'PAYFAST');

-- CreateEnum
CREATE TYPE "EasypaisaInquiryMethod" AS ENUM ('DATABASE', 'WALLET');

-- CreateEnum
CREATE TYPE "CallbackMode" AS ENUM ('SINGLE', 'DOUBLE');

-- CreateEnum
CREATE TYPE "CommissionMode" AS ENUM ('SINGLE', 'DOUBLE');

-- CreateTable
CREATE TABLE "Group" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "merchant_id" INTEGER,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGroup" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "groupId" INTEGER NOT NULL,
    "merchantId" INTEGER,

    CONSTRAINT "UserGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupPermission" (
    "groupId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,

    CONSTRAINT "GroupPermission_pkey" PRIMARY KEY ("groupId","permissionId")
);

-- CreateTable
CREATE TABLE "Merchant" (
    "uid" TEXT NOT NULL,
    "merchant_id" SERIAL NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "company_url" TEXT,
    "city" TEXT NOT NULL,
    "payment_volume" TEXT,
    "user_id" INTEGER NOT NULL,
    "webhook_url" TEXT,
    "callback_mode" "CallbackMode" NOT NULL DEFAULT 'SINGLE',
    "payout_callback" TEXT,
    "jazzCashMerchantId" INTEGER,
    "easyPaisaMerchantId" INTEGER,
    "swichMerchantId" INTEGER,
    "zindigiMerchantId" INTEGER,
    "payFastMerchantId" INTEGER,
    "wooMerchantId" INTEGER,
    "jazzCashCardMerchantId" INTEGER,
    "encrypted" TEXT DEFAULT 'false',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "balanceToDisburse" DECIMAL(10,2) DEFAULT 0.00,
    "disburseBalancePercent" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
    "easypaisaPaymentMethod" "EasypaisaPaymentMethodEnum" NOT NULL DEFAULT 'SWITCH',
    "easypaisaInquiryMethod" "EasypaisaInquiryMethod" NOT NULL DEFAULT 'DATABASE',
    "payfastInquiryMethod" "EasypaisaInquiryMethod" NOT NULL DEFAULT 'DATABASE',
    "jazzCashDisburseInquiryMethod" "EasypaisaInquiryMethod" NOT NULL DEFAULT 'DATABASE',
    "jazzCashInquiryMethod" "EasypaisaInquiryMethod" NOT NULL DEFAULT 'DATABASE',
    "EasyPaisaDisburseAccountId" INTEGER,
    "JazzCashDisburseAccountId" INTEGER,
    "easypaisaLimit" DECIMAL(65,30) DEFAULT 0,
    "swichLimit" DECIMAL(65,30) DEFAULT 0,
    "lastSwich" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("merchant_id")
);

-- CreateTable
CREATE TABLE "MerchantProviderCredential" (
    "id" SERIAL NOT NULL,
    "merchant_id" INTEGER NOT NULL,
    "provider" "ProviderEnum" NOT NULL,
    "merchantOrStoreId" TEXT NOT NULL,
    "passwordOrHashKey" TEXT NOT NULL,
    "returnOrPostBackUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantProviderCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantFinancialTerms" (
    "id" SERIAL NOT NULL,
    "merchant_id" INTEGER NOT NULL,
    "commissionMode" "CommissionMode" DEFAULT 'SINGLE',
    "commissionRate" DECIMAL(65,30) NOT NULL,
    "easypaisaRate" DECIMAL(65,30),
    "cardRate" DECIMAL(65,30) DEFAULT 0,
    "commissionWithHoldingTax" DECIMAL(65,30) NOT NULL,
    "commissionGST" DECIMAL(65,30) NOT NULL,
    "disbursementRate" DECIMAL(65,30) NOT NULL,
    "disbursementWithHoldingTax" DECIMAL(65,30) NOT NULL,
    "disbursementGST" DECIMAL(65,30) NOT NULL,
    "settlementDuration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantFinancialTerms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "apiKey" TEXT,
    "decryptionKey" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "transaction_id" TEXT NOT NULL,
    "date_time" TIMESTAMP(3) NOT NULL,
    "original_amount" DECIMAL(65,30),
    "status" "TransactionStatus" NOT NULL,
    "type" "TransactionType" NOT NULL,
    "response_message" TEXT,
    "settlement" BOOLEAN NOT NULL DEFAULT false,
    "settled_amount" DECIMAL(65,30),
    "balance" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "merchant_transaction_id" TEXT,
    "merchant_id" INTEGER NOT NULL,
    "customer_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),
    "providerId" INTEGER,
    "providerDetails" JSONB,
    "callback_sent" BOOLEAN,
    "callback_response" TEXT,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateTable
CREATE TABLE "AdditionalInfo" (
    "id" SERIAL NOT NULL,
    "bank_id" TEXT,
    "bill_reference" TEXT,
    "retrieval_ref" TEXT,
    "sub_merchant_id" TEXT,
    "settlement_expiry" TEXT,
    "custom_field_1" TEXT,
    "custom_field_2" TEXT,
    "custom_field_3" TEXT,
    "custom_field_4" TEXT,
    "custom_field_5" TEXT,
    "transactionTransaction_id" TEXT,

    CONSTRAINT "AdditionalInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Provider" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "txn_type" TEXT,
    "version" TEXT,

    CONSTRAINT "Provider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledTask" (
    "id" SERIAL NOT NULL,
    "transactionId" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "scheduledAt" TIMESTAMPTZ,
    "executedAt" TIMESTAMPTZ,

    CONSTRAINT "ScheduledTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementReport" (
    "id" SERIAL NOT NULL,
    "merchant_id" INTEGER NOT NULL,
    "settlementDate" TIMESTAMP(3) NOT NULL,
    "transactionCount" INTEGER NOT NULL,
    "transactionAmount" DECIMAL(65,30) NOT NULL,
    "commission" DECIMAL(65,30) NOT NULL,
    "gst" DECIMAL(65,30) NOT NULL,
    "withholdingTax" DECIMAL(65,30) NOT NULL,
    "merchantAmount" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usdt_settlements" (
    "id" SERIAL NOT NULL,
    "merchant_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pkr_amount" DOUBLE PRECISION NOT NULL,
    "usdt_amount" DOUBLE PRECISION NOT NULL,
    "usdt_pkr_rate" DOUBLE PRECISION NOT NULL,
    "conversion_charges" TEXT NOT NULL,
    "total_usdt" DOUBLE PRECISION NOT NULL,
    "wallet_address" TEXT NOT NULL,

    CONSTRAINT "usdt_settlements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JazzCashMerchant" (
    "id" SERIAL NOT NULL,
    "jazzMerchantId" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "returnUrl" TEXT NOT NULL,
    "integritySalt" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "merchant_of" TEXT,
    "merchantId" INTEGER NOT NULL,

    CONSTRAINT "JazzCashMerchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JazzCashCardMerchant" (
    "id" SERIAL NOT NULL,
    "jazzMerchantId" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "returnUrl" TEXT NOT NULL,
    "integritySalt" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "merchant_of" TEXT,
    "merchantId" INTEGER NOT NULL,

    CONSTRAINT "JazzCashCardMerchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EasyPaisaMerchant" (
    "id" SERIAL NOT NULL,
    "storeId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "credentials" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "accountNumber" TEXT,
    "merchant_of" TEXT,

    CONSTRAINT "EasyPaisaMerchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SwichMerchant" (
    "id" SERIAL NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT,

    CONSTRAINT "SwichMerchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayFastMerchant" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "securedKey" TEXT NOT NULL,
    "merchantId" TEXT,

    CONSTRAINT "PayFastMerchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZindigiMerchant" (
    "id" SERIAL NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "ZindigiMerchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Disbursement" (
    "id" SERIAL NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "merchant_id" INTEGER NOT NULL,
    "disbursementDate" TIMESTAMP(3) NOT NULL,
    "transactionAmount" DECIMAL(65,30) NOT NULL,
    "merchantAmount" DECIMAL(65,30) NOT NULL,
    "commission" DECIMAL(65,30) NOT NULL,
    "gst" DECIMAL(65,30) NOT NULL,
    "withholdingTax" DECIMAL(65,30) NOT NULL,
    "platform" DECIMAL(65,30),
    "account" TEXT,
    "provider" TEXT,
    "to_provider" TEXT,
    "merchant_custom_order_id" TEXT,
    "system_order_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "response_message" TEXT NOT NULL DEFAULT 'success',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "callback_sent" BOOLEAN,
    "callback_response" TEXT,
    "providerDetails" JSONB DEFAULT '{}',

    CONSTRAINT "Disbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EasyPaisaDisburseAccount" (
    "id" SERIAL NOT NULL,
    "MSISDN" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "xChannel" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "merchant_of" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EasyPaisaDisburseAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JazzCashDisburseAccount" (
    "id" SERIAL NOT NULL,
    "tokenKey" TEXT NOT NULL,
    "initialVector" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "merchant_of" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "JazzCashDisburseAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRequest" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT,
    "email" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "TransactionStatus" NOT NULL DEFAULT 'pending',
    "link" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "provider" TEXT,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "merchant_transaction_id" TEXT,

    CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisbursementRequest" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "requestedAmount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DisbursementRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DisbursementDispute" (
    "id" SERIAL NOT NULL,
    "transactionId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "disbursementDate" TIMESTAMP(3) NOT NULL,
    "sender" TEXT NOT NULL,
    "status" TEXT,
    "message" TEXT,
    "merchant_id" INTEGER NOT NULL,

    CONSTRAINT "DisbursementDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" SERIAL NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "merchant_id" INTEGER NOT NULL,
    "disbursementDate" TIMESTAMP(3) NOT NULL,
    "transactionAmount" DECIMAL(65,30) NOT NULL,
    "merchantAmount" DECIMAL(65,30) NOT NULL,
    "commission" DECIMAL(65,30) NOT NULL,
    "gst" DECIMAL(65,30) NOT NULL,
    "withholdingTax" DECIMAL(65,30) NOT NULL,
    "platform" DECIMAL(65,30),
    "account" TEXT,
    "provider" TEXT,
    "merchant_custom_order_id" TEXT,
    "system_order_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "response_message" TEXT NOT NULL DEFAULT 'success',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "callback_sent" BOOLEAN,
    "callback_response" TEXT,
    "reason" TEXT,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedPhoneNumbers" (
    "id" SERIAL NOT NULL,
    "phoneNumber" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "WoocommerceMerchants" (
    "id" SERIAL NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "Permission"("name");

-- CreateIndex
CREATE INDEX "Merchant_phone_number_idx" ON "Merchant"("phone_number");

-- CreateIndex
CREATE INDEX "MerchantProviderCredential_merchant_id_provider_idx" ON "MerchantProviderCredential"("merchant_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantFinancialTerms_merchant_id_key" ON "MerchantFinancialTerms"("merchant_id");

-- CreateIndex
CREATE INDEX "MerchantFinancialTerms_merchant_id_idx" ON "MerchantFinancialTerms"("merchant_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_apiKey_key" ON "User"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "User_decryptionKey_key" ON "User"("decryptionKey");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_merchant_transaction_id_key" ON "Transaction"("merchant_transaction_id");

-- CreateIndex
CREATE INDEX "Transaction_merchant_transaction_id_idx" ON "Transaction"("merchant_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "Provider_name_txn_type_version_key" ON "Provider"("name", "txn_type", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledTask_transactionId_key" ON "ScheduledTask"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementReport_merchant_id_settlementDate_key" ON "SettlementReport"("merchant_id", "settlementDate");

-- CreateIndex
CREATE UNIQUE INDEX "Disbursement_merchant_custom_order_id_key" ON "Disbursement"("merchant_custom_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_id_key" ON "PaymentRequest"("id");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_transactionId_key" ON "PaymentRequest"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRequest_merchant_transaction_id_key" ON "PaymentRequest"("merchant_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_merchant_custom_order_id_key" ON "Refund"("merchant_custom_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedPhoneNumbers_id_key" ON "BlockedPhoneNumbers"("id");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedPhoneNumbers_phoneNumber_key" ON "BlockedPhoneNumbers"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "WoocommerceMerchants_id_key" ON "WoocommerceMerchants"("id");

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("merchant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGroup" ADD CONSTRAINT "UserGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGroup" ADD CONSTRAINT "UserGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGroup" ADD CONSTRAINT "UserGroup_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("merchant_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPermission" ADD CONSTRAINT "GroupPermission_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupPermission" ADD CONSTRAINT "GroupPermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_EasyPaisaDisburseAccountId_fkey" FOREIGN KEY ("EasyPaisaDisburseAccountId") REFERENCES "EasyPaisaDisburseAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_JazzCashDisburseAccountId_fkey" FOREIGN KEY ("JazzCashDisburseAccountId") REFERENCES "JazzCashDisburseAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_zindigiMerchantId_fkey" FOREIGN KEY ("zindigiMerchantId") REFERENCES "ZindigiMerchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_jazzCashMerchantId_fkey" FOREIGN KEY ("jazzCashMerchantId") REFERENCES "JazzCashMerchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_easyPaisaMerchantId_fkey" FOREIGN KEY ("easyPaisaMerchantId") REFERENCES "EasyPaisaMerchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_swichMerchantId_fkey" FOREIGN KEY ("swichMerchantId") REFERENCES "SwichMerchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_wooMerchantId_fkey" FOREIGN KEY ("wooMerchantId") REFERENCES "WoocommerceMerchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_payFastMerchantId_fkey" FOREIGN KEY ("payFastMerchantId") REFERENCES "PayFastMerchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Merchant" ADD CONSTRAINT "Merchant_jazzCashCardMerchantId_fkey" FOREIGN KEY ("jazzCashCardMerchantId") REFERENCES "JazzCashCardMerchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantProviderCredential" ADD CONSTRAINT "MerchantProviderCredential_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantFinancialTerms" ADD CONSTRAINT "MerchantFinancialTerms_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdditionalInfo" ADD CONSTRAINT "AdditionalInfo_transactionTransaction_id_fkey" FOREIGN KEY ("transactionTransaction_id") REFERENCES "Transaction"("transaction_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledTask" ADD CONSTRAINT "ScheduledTask_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("transaction_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementReport" ADD CONSTRAINT "SettlementReport_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usdt_settlements" ADD CONSTRAINT "usdt_settlements_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Disbursement" ADD CONSTRAINT "Disbursement_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRequest" ADD CONSTRAINT "PaymentRequest_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("transaction_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisbursementRequest" ADD CONSTRAINT "DisbursementRequest_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DisbursementDispute" ADD CONSTRAINT "DisbursementDispute_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_merchant_id_fkey" FOREIGN KEY ("merchant_id") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

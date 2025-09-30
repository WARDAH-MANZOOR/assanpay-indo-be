-- CreateTable
CREATE TABLE "ChargeBack" (
    "id" SERIAL NOT NULL,
    "merchantId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "orderId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChargeBack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Topup" (
    "id" SERIAL NOT NULL,
    "fromMerchantId" INTEGER NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "orderId" TEXT NOT NULL,
    "toMerchantId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "Topup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ChargeBack_orderId_key" ON "ChargeBack"("orderId");

-- AddForeignKey
ALTER TABLE "ChargeBack" ADD CONSTRAINT "ChargeBack_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topup" ADD CONSTRAINT "Topup_fromMerchantId_fkey" FOREIGN KEY ("fromMerchantId") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topup" ADD CONSTRAINT "Topup_toMerchantId_fkey" FOREIGN KEY ("toMerchantId") REFERENCES "Merchant"("merchant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

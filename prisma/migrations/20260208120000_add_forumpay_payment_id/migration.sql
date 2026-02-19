-- AlterTable
ALTER TABLE "Order" ADD COLUMN "forumpayPaymentId" TEXT;

-- CreateIndex
CREATE INDEX "Order_forumpayPaymentId_idx" ON "Order"("forumpayPaymentId");

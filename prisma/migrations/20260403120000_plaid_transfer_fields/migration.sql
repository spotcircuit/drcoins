-- AlterTable
ALTER TABLE "Order" ADD COLUMN "plaidTransferIntentId" TEXT,
ADD COLUMN "plaidTransferId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_plaidTransferId_key" ON "Order"("plaidTransferId");

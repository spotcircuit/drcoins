-- Plaid Transfer webhook sync cursor + optional order ACH lifecycle timestamps
ALTER TABLE "Order" ADD COLUMN "plaidTransferSettledAt" TIMESTAMP(3),
ADD COLUMN "plaidTransferFundsAvailableAt" TIMESTAMP(3),
ADD COLUMN "plaidTransferReturnedAt" TIMESTAMP(3);

CREATE TABLE "PlaidTransferSyncCursor" (
    "id" TEXT NOT NULL,
    "lastEventId" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaidTransferSyncCursor_pkey" PRIMARY KEY ("id")
);

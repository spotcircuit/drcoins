-- Create enums
CREATE TYPE "PricingRateType" AS ENUM ('PERMANENT', 'TEMPORARY');
CREATE TYPE "RateHistoryAction" AS ENUM ('GLOBAL_RATE_CHANGE', 'CUSTOMER_RATE_SET', 'CUSTOMER_RATE_REMOVED');

-- Create pricing config singleton table
CREATE TABLE "PricingConfig" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "globalRate" DECIMAL(10,2) NOT NULL DEFAULT 87,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PricingConfig_pkey" PRIMARY KEY ("id")
);

-- Create customer-specific rates
CREATE TABLE "CustomerRate" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rate" DECIMAL(10,2) NOT NULL,
    "type" "PricingRateType" NOT NULL DEFAULT 'PERMANENT',
    "expiresAt" TIMESTAMP(3),
    "setBy" TEXT NOT NULL,
    "setAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CustomerRate_pkey" PRIMARY KEY ("id")
);

-- Create rate history table
CREATE TABLE "RateHistory" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "RateHistoryAction" NOT NULL,
    "email" TEXT,
    "oldValue" DECIMAL(10,2),
    "newValue" DECIMAL(10,2),
    "setBy" TEXT NOT NULL,
    "note" TEXT,
    CONSTRAINT "RateHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CustomerRate_email_key" ON "CustomerRate"("email");
CREATE INDEX "CustomerRate_email_idx" ON "CustomerRate"("email");
CREATE INDEX "CustomerRate_expiresAt_idx" ON "CustomerRate"("expiresAt");
CREATE INDEX "RateHistory_timestamp_idx" ON "RateHistory"("timestamp");
CREATE INDEX "RateHistory_email_idx" ON "RateHistory"("email");

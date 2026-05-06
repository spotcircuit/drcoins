import { cache } from './cache';
import { prisma } from './prisma';
import { Prisma, PricingRateType, RateHistoryAction } from '@prisma/client';

const CACHE_KEY = 'pricing-rates';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const DEFAULT_GLOBAL_RATE = 87;

export type RateType = 'permanent' | 'temporary';

export interface CustomerRate {
  email: string;
  rate: number;
  type: RateType;
  expiresAt: string | null;
  setBy: string;
  setAt: string;
  note?: string;
}

export interface RateHistoryEntry {
  timestamp: string;
  action: 'global_rate_change' | 'customer_rate_set' | 'customer_rate_removed';
  email?: string;
  oldValue?: number;
  newValue?: number;
  setBy: string;
  note?: string;
}

export interface PricingRates {
  globalRate: number;
  customerRates: Record<string, CustomerRate>;
  history: RateHistoryEntry[];
}

function decimalToNumber(value: Prisma.Decimal | null | undefined): number {
  return value ? value.toNumber() : 0;
}

function toRateType(type: PricingRateType): RateType {
  return type === PricingRateType.TEMPORARY ? 'temporary' : 'permanent';
}

function toPrismaRateType(type: RateType): PricingRateType {
  return type === 'temporary' ? PricingRateType.TEMPORARY : PricingRateType.PERMANENT;
}

function toHistoryAction(action: RateHistoryAction): RateHistoryEntry['action'] {
  switch (action) {
    case RateHistoryAction.GLOBAL_RATE_CHANGE:
      return 'global_rate_change';
    case RateHistoryAction.CUSTOMER_RATE_SET:
      return 'customer_rate_set';
    case RateHistoryAction.CUSTOMER_RATE_REMOVED:
      return 'customer_rate_removed';
  }
}

async function ensurePricingConfig() {
  return prisma.pricingConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      globalRate: DEFAULT_GLOBAL_RATE
    }
  });
}

async function buildPricingRatesPayload(): Promise<PricingRates> {
  const config = await ensurePricingConfig();
  const now = new Date();

  const customerRows = await prisma.customerRate.findMany({
    where: {
      OR: [
        { type: PricingRateType.PERMANENT },
        { expiresAt: { gt: now } }
      ]
    },
    orderBy: { setAt: 'desc' }
  });

  const historyRows = await prisma.rateHistory.findMany({
    orderBy: { timestamp: 'asc' }
  });

  const customerRates = customerRows.reduce<Record<string, CustomerRate>>((acc, row) => {
    acc[row.email] = {
      email: row.email,
      rate: decimalToNumber(row.rate),
      type: toRateType(row.type),
      expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
      setBy: row.setBy,
      setAt: row.setAt.toISOString(),
      note: row.note ?? undefined
    };
    return acc;
  }, {});

  const history = historyRows.map((row) => ({
    timestamp: row.timestamp.toISOString(),
    action: toHistoryAction(row.action),
    email: row.email ?? undefined,
    oldValue: decimalToNumber(row.oldValue ?? undefined) || undefined,
    newValue: decimalToNumber(row.newValue ?? undefined) || undefined,
    setBy: row.setBy,
    note: row.note ?? undefined
  }));

  return {
    globalRate: decimalToNumber(config.globalRate),
    customerRates,
    history
  };
}

// Get all rates (with caching)
export async function getRates(): Promise<PricingRates> {
  const cached = cache.get<PricingRates>(CACHE_KEY, CACHE_TTL);
  if (cached) {
    return cached;
  }

  const rates = await buildPricingRatesPayload();
  cache.set(CACHE_KEY, rates);
  return rates;
}

// Get rate for a specific email
export async function getRateForEmail(email: string | null): Promise<number> {
  const config = await ensurePricingConfig();
  const globalRate = decimalToNumber(config.globalRate);

  if (!email) return globalRate;

  const normalizedEmail = email.toLowerCase().trim();
  const customerRate = await prisma.customerRate.findUnique({
    where: { email: normalizedEmail }
  });

  if (!customerRate) return globalRate;

  if (
    customerRate.type === PricingRateType.TEMPORARY &&
    customerRate.expiresAt &&
    customerRate.expiresAt < new Date()
  ) {
    await removeCustomerRate(normalizedEmail, 'system');
    return globalRate;
  }

  return decimalToNumber(customerRate.rate);
}

// Set global rate
export async function setGlobalRate(newRate: number, setBy: string): Promise<void> {
  const config = await ensurePricingConfig();
  const oldRate = decimalToNumber(config.globalRate);

  await prisma.$transaction([
    prisma.pricingConfig.update({
      where: { id: 'default' },
      data: { globalRate: newRate }
    }),
    prisma.rateHistory.create({
      data: {
        action: RateHistoryAction.GLOBAL_RATE_CHANGE,
        oldValue: oldRate,
        newValue: newRate,
        setBy
      }
    })
  ]);

  cache.invalidate(CACHE_KEY);
}

// Set customer-specific rate
export async function setCustomerRate(
  email: string,
  rate: number,
  type: RateType,
  expiresAt: string | null,
  setBy: string,
  note?: string
): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await prisma.customerRate.findUnique({
    where: { email: normalizedEmail }
  });
  const oldRate = existing ? decimalToNumber(existing.rate) : undefined;

  await prisma.$transaction([
    prisma.customerRate.upsert({
      where: { email: normalizedEmail },
      update: {
        rate,
        type: toPrismaRateType(type),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        setBy,
        setAt: new Date(),
        note: note ?? null
      },
      create: {
        email: normalizedEmail,
        rate,
        type: toPrismaRateType(type),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        setBy,
        note: note ?? null
      }
    }),
    prisma.rateHistory.create({
      data: {
        action: RateHistoryAction.CUSTOMER_RATE_SET,
        email: normalizedEmail,
        oldValue: oldRate,
        newValue: rate,
        setBy,
        note: note ?? null
      }
    })
  ]);

  cache.invalidate(CACHE_KEY);
}

// Remove customer-specific rate
export async function removeCustomerRate(email: string, setBy: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const existing = await prisma.customerRate.findUnique({
    where: { email: normalizedEmail }
  });
  if (!existing) return;

  const oldRate = decimalToNumber(existing.rate);
  await prisma.$transaction([
    prisma.customerRate.delete({
      where: { email: normalizedEmail }
    }),
    prisma.rateHistory.create({
      data: {
        action: RateHistoryAction.CUSTOMER_RATE_REMOVED,
        email: normalizedEmail,
        oldValue: oldRate,
        setBy
      }
    })
  ]);

  cache.invalidate(CACHE_KEY);
}

// Set bulk customer rates
export async function setBulkCustomerRates(
  emails: string[],
  rate: number,
  type: RateType,
  expiresAt: string | null,
  setBy: string,
  note?: string
): Promise<void> {
  const now = new Date();
  for (const email of emails) {
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await prisma.customerRate.findUnique({
      where: { email: normalizedEmail },
    });

    await prisma.$transaction([
      prisma.customerRate.upsert({
        where: { email: normalizedEmail },
        update: {
          rate,
          type: toPrismaRateType(type),
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          setBy,
          setAt: now,
          note: note ?? null
        },
        create: {
          email: normalizedEmail,
          rate,
          type: toPrismaRateType(type),
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          setBy,
          setAt: now,
          note: note ?? null
        }
      }),
      prisma.rateHistory.create({
        data: {
          action: RateHistoryAction.CUSTOMER_RATE_SET,
          email: normalizedEmail,
          oldValue: existing ? decimalToNumber(existing.rate) : undefined,
          newValue: rate,
          setBy,
          note: note ? `[BULK] ${note}` : '[BULK]'
        }
      })
    ]);
  }

  cache.invalidate(CACHE_KEY);
}

// Get rate history (optionally filtered by email)
export async function getRateHistory(email?: string, limit?: number): Promise<RateHistoryEntry[]> {
  const normalizedEmail = email?.toLowerCase().trim();
  const rows = await prisma.rateHistory.findMany({
    where: normalizedEmail ? { email: normalizedEmail } : undefined,
    orderBy: { timestamp: 'desc' },
    take: limit
  });

  return rows.map((row) => ({
    timestamp: row.timestamp.toISOString(),
    action: toHistoryAction(row.action),
    email: row.email ?? undefined,
    oldValue: row.oldValue ? decimalToNumber(row.oldValue) : undefined,
    newValue: row.newValue ? decimalToNumber(row.newValue) : undefined,
    setBy: row.setBy,
    note: row.note ?? undefined
  }));
}

import { promises as fs } from 'fs';
import { join } from 'path';
import { cache } from './cache';
import { put, head, list } from '@vercel/blob';

const RATES_FILE_PATH = join(process.cwd(), 'data', 'pricing-rates.json');
const BLOB_FILENAME = 'pricing-rates.json';
const CACHE_KEY = 'pricing-rates';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Check if we're running on Vercel (production) or locally (development)
const IS_VERCEL = process.env.VERCEL === '1' || process.env.BLOB_READ_WRITE_TOKEN;

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

// Load rates from Vercel Blob
async function loadRatesFromBlob(): Promise<PricingRates> {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN not configured');
    }

    // List blobs and find our rates file
    const { blobs } = await list({
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const ratesBlob = blobs.find(blob => blob.pathname === BLOB_FILENAME);

    if (!ratesBlob) {
      console.log('Rates blob not found, returning defaults');
      return {
        globalRate: 87,
        customerRates: {},
        history: []
      };
    }

    // Fetch the blob content using the URL
    const response = await fetch(ratesBlob.url);

    if (!response.ok) {
      throw new Error(`Blob fetch failed: ${response.status}`);
    }

    const data = await response.text();
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading pricing rates from blob:', error);
    // Return default rates if blob doesn't exist or is corrupted
    return {
      globalRate: 87,
      customerRates: {},
      history: []
    };
  }
}

// Load rates from local file system
async function loadRatesFromFile(): Promise<PricingRates> {
  try {
    const data = await fs.readFile(RATES_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading pricing rates from file:', error);
    // Return default rates if file doesn't exist or is corrupted
    return {
      globalRate: 87,
      customerRates: {},
      history: []
    };
  }
}

// Save rates to Vercel Blob
async function saveRatesToBlob(rates: PricingRates): Promise<void> {
  try {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('BLOB_READ_WRITE_TOKEN not configured');
    }

    const blob = await put(BLOB_FILENAME, JSON.stringify(rates, null, 2), {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    console.log('Rates saved to Vercel Blob:', blob.url);
    // Invalidate cache after saving
    cache.invalidate(CACHE_KEY);
  } catch (error) {
    console.error('Error saving pricing rates to blob:', error);
    throw new Error('Failed to save pricing rates to blob');
  }
}

// Save rates to local file system
async function saveRatesToFile(rates: PricingRates): Promise<void> {
  try {
    await fs.writeFile(RATES_FILE_PATH, JSON.stringify(rates, null, 2));
    // Invalidate cache after saving
    cache.invalidate(CACHE_KEY);
  } catch (error) {
    console.error('Error saving pricing rates to file:', error);
    throw new Error('Failed to save pricing rates to file');
  }
}

// Unified load function - uses Blob on Vercel, file system locally
async function loadRates(): Promise<PricingRates> {
  if (IS_VERCEL) {
    return await loadRatesFromBlob();
  } else {
    return await loadRatesFromFile();
  }
}

// Unified save function - uses Blob on Vercel, file system locally
async function saveRates(rates: PricingRates): Promise<void> {
  if (IS_VERCEL) {
    await saveRatesToBlob(rates);
  } else {
    await saveRatesToFile(rates);
  }
}

// Get all rates (with caching)
export async function getRates(): Promise<PricingRates> {
  const cached = cache.get<PricingRates>(CACHE_KEY, CACHE_TTL);
  if (cached) {
    return cached;
  }

  const rates = await loadRates();
  cache.set(CACHE_KEY, rates);
  return rates;
}

// Get rate for a specific email
export async function getRateForEmail(email: string | null): Promise<number> {
  if (!email) {
    const rates = await getRates();
    return rates.globalRate;
  }

  const normalizedEmail = email.toLowerCase().trim();
  const rates = await getRates();

  const customerRate = rates.customerRates[normalizedEmail];

  if (!customerRate) {
    return rates.globalRate;
  }

  // Check if rate has expired
  if (customerRate.type === 'temporary' && customerRate.expiresAt) {
    const expiryDate = new Date(customerRate.expiresAt);
    if (expiryDate < new Date()) {
      // Rate has expired, remove it and return global rate
      await removeCustomerRate(normalizedEmail, 'system');
      return rates.globalRate;
    }
  }

  return customerRate.rate;
}

// Set global rate
export async function setGlobalRate(newRate: number, setBy: string): Promise<void> {
  const rates = await getRates();
  const oldRate = rates.globalRate;

  rates.globalRate = newRate;
  rates.history.push({
    timestamp: new Date().toISOString(),
    action: 'global_rate_change',
    oldValue: oldRate,
    newValue: newRate,
    setBy
  });

  await saveRates(rates);
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
  const rates = await getRates();

  const oldRate = rates.customerRates[normalizedEmail]?.rate;

  rates.customerRates[normalizedEmail] = {
    email: normalizedEmail,
    rate,
    type,
    expiresAt,
    setBy,
    setAt: new Date().toISOString(),
    note
  };

  rates.history.push({
    timestamp: new Date().toISOString(),
    action: 'customer_rate_set',
    email: normalizedEmail,
    oldValue: oldRate,
    newValue: rate,
    setBy,
    note
  });

  await saveRates(rates);
}

// Remove customer-specific rate
export async function removeCustomerRate(email: string, setBy: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const rates = await getRates();

  const oldRate = rates.customerRates[normalizedEmail]?.rate;

  if (rates.customerRates[normalizedEmail]) {
    delete rates.customerRates[normalizedEmail];

    rates.history.push({
      timestamp: new Date().toISOString(),
      action: 'customer_rate_removed',
      email: normalizedEmail,
      oldValue: oldRate,
      setBy
    });

    await saveRates(rates);
  }
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
  const rates = await getRates();

  for (const email of emails) {
    const normalizedEmail = email.toLowerCase().trim();
    const oldRate = rates.customerRates[normalizedEmail]?.rate;

    rates.customerRates[normalizedEmail] = {
      email: normalizedEmail,
      rate,
      type,
      expiresAt,
      setBy,
      setAt: new Date().toISOString(),
      note
    };

    rates.history.push({
      timestamp: new Date().toISOString(),
      action: 'customer_rate_set',
      email: normalizedEmail,
      oldValue: oldRate,
      newValue: rate,
      setBy,
      note: note ? `[BULK] ${note}` : '[BULK]'
    });
  }

  await saveRates(rates);
}

// Get rate history (optionally filtered by email)
export async function getRateHistory(email?: string, limit?: number): Promise<RateHistoryEntry[]> {
  const rates = await getRates();
  let history = [...rates.history].reverse(); // Most recent first

  if (email) {
    const normalizedEmail = email.toLowerCase().trim();
    history = history.filter(entry => entry.email === normalizedEmail);
  }

  if (limit) {
    history = history.slice(0, limit);
  }

  return history;
}

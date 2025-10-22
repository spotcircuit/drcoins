import { NextRequest, NextResponse } from 'next/server';
import { getRateForEmail, getRates } from '@/lib/pricing-rates';
import { stripe } from '@/lib/stripe';

// Helper function to verify LiveMe ID matches the email
async function verifyLiveMeId(email: string, liveMeId: string): Promise<boolean> {
  try {
    if (!email || !liveMeId) return false;

    // Find customer by email in Stripe
    const customers = await stripe.customers.list({
      email: email.toLowerCase().trim(),
      limit: 1
    });

    if (customers.data.length === 0) {
      // No existing customer - allow it (first-time customer)
      return true;
    }

    const customer = customers.data[0];
    const storedLiveMeId = customer.metadata?.liveMeId;

    // If no LiveMe ID stored yet, allow it
    if (!storedLiveMeId) return true;

    // Verify LiveMe IDs match
    return storedLiveMeId.trim() === liveMeId.trim();
  } catch (error) {
    console.error('Error verifying LiveMe ID:', error);
    // On error, be permissive to avoid blocking customers
    return true;
  }
}

// Public endpoint to check rate for an email
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, liveMeId } = body;

    // Get global rate first
    const rates = await getRates();
    const isCustomRate = email && rates.customerRates[email.toLowerCase().trim()];

    // If there's a custom rate, verify LiveMe ID matches
    if (isCustomRate && liveMeId) {
      const liveMeIdMatches = await verifyLiveMeId(email, liveMeId);

      if (!liveMeIdMatches) {
        // LiveMe ID doesn't match - return global rate
        return NextResponse.json({
          rate: rates.globalRate,
          isCustomRate: false,
          globalRate: rates.globalRate,
          error: 'LiveMe ID does not match the account associated with this email'
        });
      }
    }

    // Get rate for the email (or global rate if no email or ID doesn't match)
    const rate = await getRateForEmail(email);

    return NextResponse.json({
      rate,
      isCustomRate: !!isCustomRate,
      globalRate: rates.globalRate
    });
  } catch (error: any) {
    console.error('Error checking rate:', error);
    return NextResponse.json(
      { error: 'Failed to check rate' },
      { status: 500 }
    );
  }
}

// Also support GET for simple lookups
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const liveMeId = searchParams.get('liveMeId');

    // Get global rate first
    const rates = await getRates();
    const isCustomRate = email && rates.customerRates[email.toLowerCase().trim()];

    // If there's a custom rate, verify LiveMe ID matches
    if (isCustomRate && liveMeId) {
      const liveMeIdMatches = await verifyLiveMeId(email, liveMeId);

      if (!liveMeIdMatches) {
        // LiveMe ID doesn't match - return global rate
        return NextResponse.json({
          rate: rates.globalRate,
          isCustomRate: false,
          globalRate: rates.globalRate,
          error: 'LiveMe ID does not match the account associated with this email'
        });
      }
    }

    const rate = await getRateForEmail(email);

    return NextResponse.json({
      rate,
      isCustomRate: !!isCustomRate,
      globalRate: rates.globalRate
    });
  } catch (error: any) {
    console.error('Error checking rate:', error);
    return NextResponse.json(
      { error: 'Failed to check rate' },
      { status: 500 }
    );
  }
}

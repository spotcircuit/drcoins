import { NextRequest, NextResponse } from 'next/server';
import { getRates, setGlobalRate, getRateHistory } from '@/lib/pricing-rates';

// Simple admin auth check
function isAdminAuthenticated(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return false;
  }

  const [type, password] = authHeader.split(' ');
  return type === 'Bearer' && password === process.env.ADMIN_PASSWORD;
}

// GET - Get all rates and history
export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const rates = await getRates();
    const history = await getRateHistory(undefined, 50); // Last 50 entries

    return NextResponse.json({
      globalRate: rates.globalRate,
      customerRates: Object.values(rates.customerRates),
      history
    });
  } catch (error: any) {
    console.error('Error fetching rates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rates' },
      { status: 500 }
    );
  }
}

// POST - Update global rate
export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { globalRate } = body;

    if (typeof globalRate !== 'number' || globalRate <= 0) {
      return NextResponse.json(
        { error: 'Invalid rate value' },
        { status: 400 }
      );
    }

    await setGlobalRate(globalRate, 'admin');

    return NextResponse.json({
      success: true,
      message: 'Global rate updated',
      globalRate
    });
  } catch (error: any) {
    console.error('Error updating global rate:', error);
    return NextResponse.json(
      { error: 'Failed to update global rate' },
      { status: 500 }
    );
  }
}

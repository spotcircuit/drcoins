import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import crypto from 'crypto';

// Simple password hashing (in production, use bcrypt)
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Find customer by email
    const customers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    if (customers.data.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const customer = customers.data[0];
    const storedPassword = customer.metadata.password;

    if (!storedPassword) {
      return NextResponse.json(
        { error: 'Please set up your password first' },
        { status: 401 }
      );
    }

    // Verify password
    if (hashPassword(password) !== storedPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Get recent orders
    const sessions = await stripe.checkout.sessions.list({
      customer: customer.id,
      limit: 10
    });

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        firstName: customer.metadata.firstName,
        lastName: customer.metadata.lastName,
        liveMeId: customer.metadata.liveMeId,
        phone: customer.phone
      },
      orders: sessions.data.map((session: any) => ({
        id: session.id,
        amount: session.amount_total,
        status: session.payment_status,
        created: session.created,
        metadata: session.metadata
      }))
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
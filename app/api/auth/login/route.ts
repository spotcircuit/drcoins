import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    // Find customer by email in database
    const customer = await prisma.customer.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { items: true }
        }
      }
    });

    if (!customer) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Note: Password authentication would need to be added to Customer model
    // For now, return customer data without password check
    // TODO: Add password field to Customer model if needed

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        liveMeId: customer.liveMeId,
        phone: customer.phone
      },
      orders: customer.orders.map(order => ({
        id: order.id,
        orderId: order.orderId,
        amount: order.amount.toString(),
        status: order.status,
        created: order.createdAt.getTime() / 1000,
        items: order.items
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
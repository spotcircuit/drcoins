import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function isAdminAuthenticated(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return false;

  const [type, password] = authHeader.split(' ');
  return type === 'Bearer' && password === process.env.ADMIN_PASSWORD;
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const customers = await prisma.customer.findMany({
      include: {
        orders: {
          include: {
            items: true
          }
        }
      },
      orderBy: {
        lastOrderDate: 'desc'
      }
    });

    const formattedCustomers = customers.map(customer => {
      const totalOrders = customer.orders.length;
      const totalSpent = customer.orders.reduce((sum, order) =>
        sum + parseFloat(order.amount.toString()), 0
      );
      const firstOrderDate = customer.orders.length > 0
        ? customer.orders.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0].createdAt.toISOString()
        : customer.createdAt.toISOString();

      return {
        email: customer.email,
        name: customer.firstName && customer.lastName
          ? `${customer.firstName} ${customer.lastName}`
          : '',
        phone: customer.phone || '',
        liveMeId: customer.liveMeId || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        zip: customer.zip || '',
        country: customer.country || '',
        totalOrders,
        totalSpent,
        lastOrderDate: customer.lastOrderDate?.toISOString() || customer.createdAt.toISOString(),
        firstOrderDate,
        orderIds: customer.orders.map(o => o.id)
      };
    });

    return NextResponse.json({ customers: formattedCustomers, cached: false });
  } catch (error: any) {
    console.error('Admin customers error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

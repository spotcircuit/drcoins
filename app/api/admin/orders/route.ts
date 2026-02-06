import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import { getSenderEmail } from '@/lib/email-config';

const resend = new Resend(process.env.RESEND_API_KEY || '');

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
    const orders = await prisma.order.findMany({
      include: {
        customer: true,
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });

    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderId: order.orderId,
      customerEmail: order.customer.email,
      customerName: order.customer.firstName && order.customer.lastName
        ? `${order.customer.firstName} ${order.customer.lastName}`
        : '',
      liveMeId: order.liveMeId,
      firstName: order.customer.firstName || '',
      lastName: order.customer.lastName || '',
      phone: order.customer.phone || '',
      amount: parseFloat(order.amount.toString()),
      status: order.status.toLowerCase(),
      paymentMethod: order.paymentMethod || 'Card',
      fulfillmentStatus: order.fulfillmentStatus.toLowerCase(),
      items: order.items.map(item => ({
        name: item.name,
        price: parseFloat(item.price.toString()),
        quantity: item.quantity,
        amount: item.amount,
        description: item.description
      })),
      created: order.createdAt.toISOString()
    }));

    return NextResponse.json({ orders: formattedOrders, cached: false });
  } catch (error: any) {
    console.error('Admin orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { orderId, status, sendEmail = true } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID required' },
        { status: 400 }
      );
    }

    const order = await prisma.order.findUnique({
      where: { orderId },
      include: {
        customer: true,
        items: true
      }
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Update fulfillment status
    await prisma.order.update({
      where: { id: order.id },
      data: {
        fulfillmentStatus: status?.toUpperCase() || 'FULFILLED',
        fulfilledAt: new Date(),
        fulfilledBy: 'admin'
      }
    });

    // Send fulfillment email if requested
    if (sendEmail && order.customer.email) {
      try {
        const totalCoins = order.items.reduce((sum, item) =>
          sum + (item.amount ? item.quantity * item.amount : 0), 0
        );

        const emailData = await resend.emails.send({
          from: getSenderEmail(),
          to: order.customer.email,
          subject: 'Your Dr. Coins Order Has Been Delivered! 🎉',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #7c3aed;">Order Fulfilled!</h2>
              <p>Great news! Your Dr. Coins have been delivered to your LiveMe account.</p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin-top: 0;">Order Details:</h3>
                <p><strong>LiveMe ID:</strong> ${order.liveMeId || 'Not provided'}</p>
                <p><strong>Amount:</strong> $${order.amount}</p>
                ${totalCoins > 0 ? `<p><strong>Total Coins:</strong> ${totalCoins.toLocaleString()}</p>` : ''}
                <h4 style="color: #1f2937;">Items Delivered:</h4>
                <ul>
                  ${order.items.map(item => {
                    let itemText = `${item.quantity}x ${item.name}`;
                    if (item.amount) {
                      const itemCoins = item.quantity * item.amount;
                      itemText += ` (${itemCoins.toLocaleString()} coins)`;
                    }
                    return `<li>${itemText}</li>`;
                  }).join('')}
                </ul>
              </div>
              <p>Your coins should now be available in your LiveMe account. If you have any issues, please contact support.</p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Thank you for your purchase!<br>
                - The Dr. Coins Team
              </p>
            </div>
          `,
          text: `Your Dr. Coins order has been delivered to LiveMe ID: ${order.liveMeId}. Amount: $${order.amount}${totalCoins > 0 ? `. Total Coins: ${totalCoins.toLocaleString()}` : ''}`
        });

        await prisma.emailLog.create({
          data: {
            orderId: order.id,
            email: order.customer.email,
            type: 'FULFILLMENT',
            subject: 'Your Dr. Coins Order Has Been Delivered!',
            success: true,
            resendId: emailData.data?.id || null
          }
        });
      } catch (emailError: any) {
        console.error('Failed to send fulfillment email:', emailError);

        await prisma.emailLog.create({
          data: {
            orderId: order.id,
            email: order.customer.email,
            type: 'FULFILLMENT',
            subject: 'Your Dr. Coins Order Has Been Delivered!',
            success: false,
            error: emailError.message
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Order ${status || 'fulfilled'}`,
      customerEmail: order.customer.email,
      emailSent: sendEmail && !!order.customer.email
    });

  } catch (error: any) {
    console.error('Order update error:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}

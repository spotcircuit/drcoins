import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { cache } from '@/lib/cache';

// Simple admin auth check
function isAdminAuthenticated(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return false;
  }

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
    // Check cache first
    const cachedCustomers = cache.get<any[]>('admin-customers');
    if (cachedCustomers) {
      return NextResponse.json({ customers: cachedCustomers, cached: true });
    }

    console.log('Cache MISS for admin-customers - fetching from Stripe');

    // Fetch ALL checkout sessions with pagination
    const allSessions: any[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const response = await stripe.checkout.sessions.list({
        limit: 100,
        expand: ['data.customer'],
        ...(startingAfter && { starting_after: startingAfter })
      });

      allSessions.push(...response.data);
      hasMore = response.has_more;

      if (hasMore && response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1].id;
      }
    }

    console.log(`Fetched ${allSessions.length} total checkout sessions`);

    // Aggregate customers by email (case-insensitive)
    const customerMap = new Map<string, {
      email: string;
      name: string;
      phone: string;
      liveMeId: string;
      totalOrders: number;
      totalSpent: number;
      lastOrderDate: string;
      firstOrderDate: string;
      orderIds: string[];
    }>();

    for (const session of allSessions) {
      // Get customer details
      let customerName = '';
      let customerPhone = '';
      let customerEmail = session.customer_email || '';
      let liveMeId = '';

      // Extract LiveMe ID from session metadata
      if (session.metadata?.liveMeId) {
        liveMeId = session.metadata.liveMeId;
      }

      if (typeof session.customer === 'object' && session.customer) {
        customerName = session.customer.name || '';
        customerPhone = session.customer.phone || '';
        customerEmail = session.customer.email || customerEmail;

        // Also check customer metadata for LiveMe ID
        if (session.customer.metadata?.liveMeId) {
          liveMeId = session.customer.metadata.liveMeId;
        }
      }

      if (session.customer_details) {
        customerName = session.customer_details.name || customerName;
        customerPhone = session.customer_details.phone || customerPhone;
        customerEmail = session.customer_details.email || customerEmail;
      }

      if (session.shipping_details?.name) {
        customerName = session.shipping_details.name;
        customerPhone = session.shipping_details.phone || customerPhone;
      }

      // Skip if no email
      if (!customerEmail) continue;

      // Normalize email to lowercase for deduplication (case-insensitive)
      const normalizedEmail = customerEmail.toLowerCase();

      const orderAmount = (session.amount_total || 0) / 100;
      const orderDate = new Date(session.created * 1000).toISOString();

      if (customerMap.has(normalizedEmail)) {
        const customer = customerMap.get(normalizedEmail)!;
        customer.totalOrders += 1;
        customer.totalSpent += orderAmount;
        customer.orderIds.push(session.id);

        // Update last order date if this order is more recent
        if (new Date(orderDate) > new Date(customer.lastOrderDate)) {
          customer.lastOrderDate = orderDate;
          // Update LiveMe ID to the most recent one
          if (liveMeId) {
            customer.liveMeId = liveMeId;
          }
        }

        // Update first order date if this order is older
        if (new Date(orderDate) < new Date(customer.firstOrderDate)) {
          customer.firstOrderDate = orderDate;
        }

        // Update name and phone if they weren't set before
        if (!customer.name && customerName) {
          customer.name = customerName;
        }
        if (!customer.phone && customerPhone) {
          customer.phone = customerPhone;
        }
        // Update LiveMe ID if we didn't have one before
        if (!customer.liveMeId && liveMeId) {
          customer.liveMeId = liveMeId;
        }

        // Update email to preserve original casing if current one has better casing
        // (prefer the one with @ sign properly formatted)
        if (customerEmail && customerEmail.includes('@')) {
          customer.email = customerEmail;
        }
      } else {
        customerMap.set(normalizedEmail, {
          email: customerEmail, // Store original casing for display
          name: customerName,
          phone: customerPhone,
          liveMeId: liveMeId,
          totalOrders: 1,
          totalSpent: orderAmount,
          lastOrderDate: orderDate,
          firstOrderDate: orderDate,
          orderIds: [session.id]
        });
      }
    }

    // Convert map to array and sort by last order date (most recent first)
    const customers = Array.from(customerMap.values()).sort(
      (a, b) => new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime()
    );

    console.log(`Aggregated ${customers.length} unique customers (case-insensitive deduplication)`);

    // Store in cache
    cache.set('admin-customers', customers);

    return NextResponse.json({ customers, cached: false });
  } catch (error: any) {
    console.error('Admin customers error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    );
  }
}

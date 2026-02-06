import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

const prisma = new PrismaClient();

async function migrateStripeData() {
  console.log('🚀 Starting Stripe to PostgreSQL migration...\n');

  try {
    // Step 1: Migrate customers
    console.log('📦 Step 1: Migrating customers from Stripe...');
    let customerCount = 0;
    let hasMoreCustomers = true;
    let startingAfterCustomer: string | undefined;

    while (hasMoreCustomers) {
      const customers = await stripe.customers.list({
        limit: 100,
        ...(startingAfterCustomer && { starting_after: startingAfterCustomer })
      });

      for (const stripeCustomer of customers.data) {
        if (!stripeCustomer.email) {
          console.log(`⚠️  Skipping customer ${stripeCustomer.id} - no email`);
          continue;
        }

        try {
          await prisma.customer.upsert({
            where: { email: stripeCustomer.email.toLowerCase() },
            create: {
              email: stripeCustomer.email.toLowerCase(),
              firstName: stripeCustomer.metadata?.firstName || null,
              lastName: stripeCustomer.metadata?.lastName || null,
              phone: stripeCustomer.phone || null,
              liveMeId: stripeCustomer.metadata?.liveMeId || null,
              createdAt: new Date(stripeCustomer.created * 1000),
              lastOrderDate: stripeCustomer.metadata?.lastOrderDate
                ? new Date(stripeCustomer.metadata.lastOrderDate)
                : null
            },
            update: {
              firstName: stripeCustomer.metadata?.firstName || undefined,
              lastName: stripeCustomer.metadata?.lastName || undefined,
              phone: stripeCustomer.phone || undefined,
              liveMeId: stripeCustomer.metadata?.liveMeId || undefined
            }
          });
          customerCount++;
          process.stdout.write(`\r   Migrated ${customerCount} customers...`);
        } catch (error) {
          console.error(`\n❌ Failed to migrate customer ${stripeCustomer.email}:`, error);
        }
      }

      hasMoreCustomers = customers.has_more;
      if (hasMoreCustomers && customers.data.length > 0) {
        startingAfterCustomer = customers.data[customers.data.length - 1].id;
      }
    }

    console.log(`\n✅ Migrated ${customerCount} customers\n`);

    // Step 2: Migrate checkout sessions (orders)
    console.log('📦 Step 2: Migrating orders from Stripe...');
    let orderCount = 0;
    let skippedCount = 0;
    let hasMoreSessions = true;
    let startingAfterSession: string | undefined;

    while (hasMoreSessions) {
      const sessions = await stripe.checkout.sessions.list({
        limit: 100,
        ...(startingAfterSession && { starting_after: startingAfterSession })
      });

      for (const session of sessions.data) {
        // Only migrate paid sessions
        if (session.payment_status !== 'paid') {
          skippedCount++;
          continue;
        }

        const customerEmail = session.customer_details?.email || session.customer_email;
        if (!customerEmail) {
          console.log(`\n⚠️  Skipping session ${session.id} - no customer email`);
          skippedCount++;
          continue;
        }

        try {
          // Find customer in our database
          const customer = await prisma.customer.findUnique({
            where: { email: customerEmail.toLowerCase() }
          });

          if (!customer) {
            console.log(`\n⚠️  Customer not found for ${customerEmail}, creating...`);
            const newCustomer = await prisma.customer.create({
              data: {
                email: customerEmail.toLowerCase(),
                firstName: session.customer_details?.name?.split(' ')[0] || null,
                lastName: session.customer_details?.name?.split(' ').slice(1).join(' ') || null,
                phone: session.customer_details?.phone || null,
                liveMeId: session.metadata?.liveMeId || null,
              }
            });

            // Create order with new customer
            await createOrder(session, newCustomer.id);
          } else {
            // Create order with existing customer
            await createOrder(session, customer.id);
          }

          orderCount++;
          process.stdout.write(`\r   Migrated ${orderCount} orders (skipped ${skippedCount} incomplete)...`);
        } catch (error: any) {
          console.error(`\n❌ Failed to migrate session ${session.id}:`, error.message);
        }
      }

      hasMoreSessions = sessions.has_more;
      if (hasMoreSessions && sessions.data.length > 0) {
        startingAfterSession = sessions.data[sessions.data.length - 1].id;
      }
    }

    console.log(`\n✅ Migrated ${orderCount} orders (skipped ${skippedCount} incomplete orders)\n`);

    console.log('🎉 Migration completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Customers: ${customerCount}`);
    console.log(`   - Orders: ${orderCount}`);
    console.log(`   - Skipped: ${skippedCount}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function createOrder(session: Stripe.Checkout.Session, customerId: string) {
  // Parse items from metadata
  const items = session.metadata?.items ? JSON.parse(session.metadata.items) : [];
  const appliedRate = session.metadata?.appliedRate
    ? parseFloat(session.metadata.appliedRate)
    : 87;

  // Get payment method info
  let paymentMethod = 'Card';
  if (session.payment_intent && typeof session.payment_intent === 'string') {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        session.payment_intent,
        { expand: ['payment_method'] }
      );

      if (paymentIntent.payment_method && typeof paymentIntent.payment_method === 'object') {
        const pm = paymentIntent.payment_method as any;
        if (pm.type === 'cashapp' || pm.type === 'cash_app_pay') {
          paymentMethod = 'Cash App';
        } else if (pm.type === 'link') {
          paymentMethod = 'Link';
        } else if (pm.type === 'card' && pm.card?.wallet?.type) {
          paymentMethod = pm.card.wallet.type === 'apple_pay' ? 'Apple Pay' :
                         pm.card.wallet.type === 'google_pay' ? 'Google Pay' :
                         pm.card.wallet.type === 'link' ? 'Link' : 'Card';
        }
      }
    } catch (err) {
      // If we can't fetch payment intent, stick with 'Card'
    }
  }

  // Create order
  await prisma.order.create({
    data: {
      orderId: session.metadata?.orderId || session.id,
      customerId: customerId,
      amount: (session.amount_total || 0) / 100,
      currency: session.currency?.toUpperCase() || 'USD',
      status: 'PAID',
      paymentMethod: paymentMethod,
      liveMeId: session.metadata?.liveMeId || '',
      appliedRate: appliedRate,
      fulfillmentStatus: 'PENDING', // Default to pending
      createdAt: new Date(session.created * 1000),
      items: {
        create: items.map((item: any) => ({
          name: item.name,
          description: item.description || '',
          price: item.price,
          quantity: item.quantity || 1,
          amount: item.amount || null,
          type: item.type || 'coins'
        }))
      }
    }
  });
}

// Run the migration
migrateStripeData()
  .then(() => {
    console.log('\n✨ All done! Your data has been migrated to PostgreSQL.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });

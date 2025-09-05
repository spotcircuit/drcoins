import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || '');
console.log('Resend initialized with key starting:', process.env.RESEND_API_KEY?.substring(0, 10));

// Simple admin auth check
function isAdminAuthenticated(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    console.log('No auth header provided');
    return false;
  }
  
  const [type, password] = authHeader.split(' ');
  const isValid = type === 'Bearer' && password === process.env.ADMIN_PASSWORD;
  
  if (!isValid) {
    console.log('Auth failed - provided:', password, 'expected:', process.env.ADMIN_PASSWORD ? '[SET]' : '[NOT SET]');
  }
  
  return isValid;
}

export async function GET(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Get recent checkout sessions with full details
    const sessions = await stripe.checkout.sessions.list({
      limit: 100,
      expand: ['data.customer']
    });

    const orders = await Promise.all(sessions.data.map(async (session: any) => {
      // Get customer details from various sources
      let customerName = '';
      let customerPhone = '';
      let customerEmail = session.customer_email || '';
      
      // Try to get from customer object
      if (typeof session.customer === 'object' && session.customer) {
        customerName = session.customer.name || '';
        customerPhone = session.customer.phone || '';
        customerEmail = session.customer.email || customerEmail;
      }
      
      // Override with customer_details if available (this is what Stripe collects at checkout)
      if (session.customer_details) {
        customerName = session.customer_details.name || customerName;
        customerPhone = session.customer_details.phone || customerPhone;
        customerEmail = session.customer_details.email || customerEmail;
      }
      
      // Get from shipping if available
      if (session.shipping_details?.name) {
        customerName = session.shipping_details.name;
        customerPhone = session.shipping_details.phone || customerPhone;
      }
      
      // Parse name into first and last
      const nameParts = customerName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Get payment method and fulfillment status
      let paymentMethod = 'Card';
      let fulfillmentStatus = 'pending';
      
      // First check if this was a Cash App payment from the session
      if (session.payment_method_types && session.payment_method_types.includes('cashapp')) {
        // If cashapp was available and it's the only non-card option, likely used
        if (!session.payment_intent) {
          // No payment intent means likely Cash App
          paymentMethod = 'Cash App';
        }
      }
      
      if (session.payment_intent && typeof session.payment_intent === 'string') {
        try {
          // Fetch the payment intent with expanded payment method
          const paymentIntent = await stripe.paymentIntents.retrieve(
            session.payment_intent,
            { expand: ['payment_method'] }
          );
          
          // Get fulfillment status from payment intent metadata
          if (paymentIntent.metadata?.fulfillmentStatus) {
            fulfillmentStatus = paymentIntent.metadata.fulfillmentStatus;
          }
          
          // Check payment method
          if (paymentIntent.payment_method && typeof paymentIntent.payment_method === 'object') {
            const pm = paymentIntent.payment_method as any;
            
            if (pm.type === 'card') {
              // Check for wallet payments (Link can show as card with wallet)
              if (pm.card?.wallet?.type === 'apple_pay') {
                paymentMethod = 'Apple Pay';
              } else if (pm.card?.wallet?.type === 'google_pay') {
                paymentMethod = 'Google Pay';
              } else if (pm.card?.wallet?.type === 'link') {
                paymentMethod = 'Link';
              } else {
                paymentMethod = 'Card';
              }
            } else if (pm.type === 'cashapp' || pm.type === 'cash_app_pay') {
              paymentMethod = 'Cash App';
            } else if (pm.type === 'link') {
              paymentMethod = 'Link';
            } else {
              paymentMethod = pm.type.charAt(0).toUpperCase() + pm.type.slice(1);
            }
          }
        } catch (err) {
          // If we can't fetch payment intent but cashapp was available, assume it was used
          if (session.payment_method_types && session.payment_method_types.includes('cashapp')) {
            paymentMethod = 'Cash App';
          }
          console.log('Error fetching payment intent:', err);
        }
      } else if (!session.payment_intent && session.payment_method_types && session.payment_method_types.includes('cashapp')) {
        // No payment intent but cashapp was available - likely a Cash App payment
        paymentMethod = 'Cash App';
      }
      
      return {
        id: session.id,
        orderId: session.metadata?.orderId,
        customerEmail: customerEmail,
        customerName: customerName,
        liveMeId: session.metadata?.liveMeId || '',
        firstName: firstName,
        lastName: lastName,
        phone: customerPhone,
        amount: (session.amount_total || 0) / 100,
        status: session.payment_status,
        paymentMethod: paymentMethod,
        fulfillmentStatus: fulfillmentStatus,
        items: session.metadata?.items ? JSON.parse(session.metadata.items) : [],
        created: new Date(session.created * 1000).toISOString()
      };
    }));

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error('Admin orders error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// Mark order as fulfilled
export async function POST(req: NextRequest) {
  if (!isAdminAuthenticated(req)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { sessionId, status } = body;
    // Explicitly default sendEmail to true if not provided
    const sendEmail = body.sendEmail !== false; // This way it defaults to true
    
    console.log('POST body received:', body);
    console.log('sendEmail value:', sendEmail, 'type:', typeof sendEmail);

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID required' },
        { status: 400 }
      );
    }

    // Get the session with expanded customer
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'customer_details']
    });
    
    // Get email from various sources
    let customerEmail = session.customer_email;
    
    // If no email in session, check customer details
    if (!customerEmail && session.customer_details) {
      customerEmail = session.customer_details.email;
    }
    
    // If still no email, check customer object
    if (!customerEmail && session.customer) {
      if (typeof session.customer === 'string') {
        const customer = await stripe.customers.retrieve(session.customer);
        customerEmail = customer.email;
      } else {
        customerEmail = session.customer.email;
      }
    }
    
    console.log('Email sources checked:');
    console.log('- session.customer_email:', session.customer_email);
    console.log('- session.customer_details?.email:', session.customer_details?.email);
    console.log('- Final customerEmail:', customerEmail);

    // We need to store fulfillment status in payment intent metadata
    // since we can't update checkout session metadata after creation
    if (session.payment_intent && typeof session.payment_intent === 'string') {
      const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
      
      await stripe.paymentIntents.update(session.payment_intent, {
        metadata: {
          ...(paymentIntent.metadata || {}),
          fulfillmentStatus: status || 'fulfilled',
          fulfilledAt: new Date().toISOString(),
          fulfilledBy: 'admin'
        }
      });
    }

    // If customer exists, update their metadata
    if (session.customer) {
      const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id;
      const customer = await stripe.customers.retrieve(customerId);
      await stripe.customers.update(customerId, {
        metadata: {
          ...(typeof customer === 'object' ? customer.metadata : {}),
          lastFulfilledOrder: sessionId,
          lastFulfilledDate: new Date().toISOString()
        }
      });
    }

    console.log('About to check email conditions:');
    console.log('- sendEmail:', sendEmail);
    console.log('- customerEmail:', customerEmail);
    console.log('- condition result:', !!(sendEmail && customerEmail));
    
    if (sendEmail && customerEmail) {
      // Send fulfillment email directly using Resend
      console.log('INSIDE EMAIL BLOCK - Attempting to send email to:', customerEmail);
      console.log('Resend API key exists:', !!process.env.RESEND_API_KEY);
      
      try {
        const items = session.metadata?.items ? JSON.parse(session.metadata.items) : [];
        
        const emailData = await resend.emails.send({
          from: 'Dr. Coins <noreply@dr-coins.com>',
          to: customerEmail,
          subject: 'Your Dr. Coins Order Has Been Delivered! 🎉',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #7c3aed;">Order Fulfilled!</h2>
              <p>Great news! Your Dr. Coins have been delivered to your LiveMe account.</p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin-top: 0;">Order Details:</h3>
                <p><strong>LiveMe ID:</strong> ${session.metadata?.liveMeId || 'Not provided'}</p>
                <p><strong>Amount:</strong> $${((session.amount_total || 0) / 100).toFixed(2)}</p>
                <h4 style="color: #1f2937;">Items Delivered:</h4>
                <ul>
                  ${items.map((item: any) => `<li>${item.quantity}x ${item.name}</li>`).join('')}
                </ul>
              </div>
              
              <p>Your coins should now be available in your LiveMe account. If you have any issues, please contact support.</p>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Thank you for your purchase!<br>
                - The Dr. Coins Team
              </p>
            </div>
          `,
          text: `Your Dr. Coins order has been delivered to LiveMe ID: ${session.metadata?.liveMeId}. Amount: $${((session.amount_total || 0) / 100).toFixed(2)}`
        });
        
        console.log('Fulfillment email sent to:', customerEmail, 'Email ID:', emailData.data?.id);
        console.log('Full email response:', emailData);
      } catch (emailError: any) {
        console.error('Failed to send fulfillment email - Full error:', emailError);
        console.error('Error message:', emailError?.message);
        console.error('Error response:', emailError?.response);
        // Don't fail the whole operation if email fails but log it clearly
      }
    }

    return NextResponse.json({ 
      success: true,
      message: `Order ${status || 'fulfilled'}`,
      customerEmail: customerEmail,
      emailSent: sendEmail && !!customerEmail
    });

  } catch (error: any) {
    console.error('Order update error:', error);
    return NextResponse.json(
      { error: 'Failed to update order' },
      { status: 500 }
    );
  }
}
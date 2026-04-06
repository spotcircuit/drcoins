import { getRateForEmail } from '@/lib/pricing-rates';
import { prisma } from '@/lib/prisma';
import type { CreateCryptoOrderBody } from '@/lib/order-crypto';

type CustomerWithAddress = { address?: string | null; city?: string | null; state?: string | null; zip?: string | null; country?: string | null };

/** PENDING order for ACH via Plaid Transfer UI; OTP verified before Link opens. */
export async function createPlaidOrderAndCustomer(body: CreateCryptoOrderBody) {
  const { items, liveMeId, email, firstName, lastName, phone, address, city, state, zip, country } = body;
  let customer = await prisma.customer.findUnique({
    where: { email: email.toLowerCase() }
  });
  const existing = customer as (typeof customer) & CustomerWithAddress | null;

  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        email: email.toLowerCase(),
        firstName: firstName ?? null,
        lastName: lastName ?? null,
        phone: phone ?? null,
        liveMeId: liveMeId ?? null,
        ...(address != null || city != null || state != null || zip != null || country != null
          ? { address: address ?? null, city: city ?? null, state: state ?? null, zip: zip ?? null, country: country ?? null }
          : {}),
      } as Parameters<typeof prisma.customer.create>[0]['data'],
    });
  } else {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: {
        firstName: firstName ?? customer.firstName,
        lastName: lastName ?? customer.lastName,
        phone: phone ?? customer.phone,
        liveMeId: liveMeId ?? customer.liveMeId,
        address: address ?? existing?.address ?? undefined,
        city: city ?? existing?.city ?? undefined,
        state: state ?? existing?.state ?? undefined,
        zip: zip ?? existing?.zip ?? undefined,
        country: country ?? existing?.country ?? undefined,
      } as Parameters<typeof prisma.customer.update>[0]['data'],
    });
  }

  let appliedRate = 87;
  try {
    appliedRate = await getRateForEmail(email);
  } catch (err) {
    console.error('Failed to get rate for email, using default:', err);
  }

  const totalAmount = items.reduce((sum: number, item: any) =>
    sum + (item.price * (item.quantity || 1)), 0
  );
  const orderId = Date.now().toString();

  const order = await prisma.order.create({
    data: {
      orderId,
      customerId: customer.id,
      amount: totalAmount,
      currency: 'USD',
      status: 'PENDING',
      paymentMethod: 'Bank (ACH)',
      liveMeId,
      appliedRate,
      items: {
        create: items.map((item: any) => ({
          name: item.name,
          description: item.description || `Instant delivery to LiveMe ID: ${liveMeId}`,
          price: item.price,
          quantity: item.quantity || 1,
          amount: item.amount || null,
          type: item.type || 'coins'
        }))
      }
    },
    include: { items: true }
  });

  return { customer, order };
}

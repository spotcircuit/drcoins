import type { PlaidApi, TransferEvent } from 'plaid';
import { Prisma } from '@prisma/client';
import { TransferEventType } from 'plaid';
import { prisma } from '@/lib/prisma';
import { logPlaid } from '@/lib/plaid-log';
import { sendPlaidAchSettledCompletionEmails } from '@/lib/plaid-ach-completion-emails';

const CURSOR_ID = 'default';

function parsePlaidTimestamp(ts: string | undefined): Date | null {
  if (!ts) return null;
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function findOrderForEvent(ev: TransferEvent) {
  const tid = ev.transfer_id?.trim();
  if (tid) {
    const byTransfer = await prisma.order.findFirst({ where: { plaidTransferId: tid } });
    if (byTransfer) return byTransfer;
  }
  const intent = typeof ev.intent_id === 'string' ? ev.intent_id.trim() : '';
  if (intent) {
    return prisma.order.findFirst({ where: { plaidTransferIntentId: intent } });
  }
  return null;
}

/** Ignore ledger sweeps, refunds, and non-debit rails we do not originate. */
function shouldApplyToCheckoutOrder(ev: TransferEvent): boolean {
  if (ev.refund_id) return false;
  const typeStr = String(ev.event_type);
  if (typeStr.startsWith('sweep.') || typeStr.startsWith('refund.')) return false;
  if (!ev.transfer_id?.trim()) return false;
  if (ev.transfer_type === 'credit') return false;
  return true;
}

async function applyTransferEvent(ev: TransferEvent) {
  if (!shouldApplyToCheckoutOrder(ev)) return;

  const order = await findOrderForEvent(ev);
  if (!order) return;

  const eventType = ev.event_type;
  const at = parsePlaidTimestamp(ev.timestamp) ?? new Date();

  // Raw SQL keeps this module valid even if the IDE's Prisma client types lag after `prisma generate`.
  if (eventType === TransferEventType.Settled) {
    const n = await prisma.$executeRaw(
      Prisma.sql`
        UPDATE "Order"
        SET "plaidTransferSettledAt" = ${at}, "updatedAt" = NOW()
        WHERE id = ${order.id} AND "plaidTransferSettledAt" IS NULL`
    );
    if (Number(n) > 0) {
      logPlaid('webhook_transfer_order_settled', { orderId: order.orderId, transferId: ev.transfer_id });
    }

    const tid = ev.transfer_id?.trim() ?? '';
    const promoted = await prisma.$executeRaw(
      Prisma.sql`
        UPDATE "Order"
        SET "status" = CAST('COMPLETED' AS "OrderStatus"), "updatedAt" = NOW()
        WHERE id = ${order.id}
          AND "status" = CAST('PROCESSING' AS "OrderStatus")
          AND "plaidTransferId" = ${tid}`
    );
    if (Number(promoted) > 0) {
      await prisma.customer.update({
        where: { id: order.customerId },
        data: { lastOrderDate: new Date() },
      });
      await sendPlaidAchSettledCompletionEmails(order.id);
      logPlaid('webhook_transfer_order_completed_after_settle', { orderId: order.orderId, transferId: tid });
    }
    return;
  }

  if (eventType === TransferEventType.FundsAvailable) {
    const n = await prisma.$executeRaw(
      Prisma.sql`
        UPDATE "Order"
        SET "plaidTransferFundsAvailableAt" = ${at}, "updatedAt" = NOW()
        WHERE id = ${order.id} AND "plaidTransferFundsAvailableAt" IS NULL`
    );
    if (Number(n) > 0) {
      logPlaid('webhook_transfer_order_funds_available', { orderId: order.orderId, transferId: ev.transfer_id });
    }
    return;
  }

  if (eventType === TransferEventType.Returned) {
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE "Order"
        SET
          "plaidTransferReturnedAt" = COALESCE("plaidTransferReturnedAt", ${at}),
          "status" = CASE
            WHEN "status" = CAST('COMPLETED' AS "OrderStatus") OR "status" = CAST('PROCESSING' AS "OrderStatus")
              THEN CAST('FAILED' AS "OrderStatus")
            ELSE "status"
          END,
          "fulfillmentStatus" = CASE
            WHEN "status" = CAST('COMPLETED' AS "OrderStatus") THEN CAST('FAILED' AS "FulfillmentStatus")
            ELSE "fulfillmentStatus"
          END,
          "updatedAt" = NOW()
        WHERE id = ${order.id}`
    );
    logPlaid('webhook_transfer_order_returned', { orderId: order.orderId, transferId: ev.transfer_id });
    return;
  }

  if (eventType === TransferEventType.Failed || eventType === TransferEventType.Cancelled) {
    if (order.status === 'PENDING') {
      const next =
        eventType === TransferEventType.Cancelled
          ? Prisma.sql`CAST('CANCELLED' AS "OrderStatus")`
          : Prisma.sql`CAST('FAILED' AS "OrderStatus")`;
      await prisma.$executeRaw(
        Prisma.sql`UPDATE "Order" SET "status" = ${next}, "updatedAt" = NOW() WHERE id = ${order.id} AND "status" = CAST('PENDING' AS "OrderStatus")`
      );
    } else if (order.status === 'PROCESSING') {
      const next =
        eventType === TransferEventType.Cancelled
          ? Prisma.sql`CAST('CANCELLED' AS "OrderStatus")`
          : Prisma.sql`CAST('FAILED' AS "OrderStatus")`;
      await prisma.$executeRaw(
        Prisma.sql`UPDATE "Order" SET "status" = ${next}, "updatedAt" = NOW() WHERE id = ${order.id} AND "status" = CAST('PROCESSING' AS "OrderStatus")`
      );
    } else if (order.status === 'COMPLETED') {
      await prisma.$executeRaw(
        Prisma.sql`
          UPDATE "Order"
          SET
            "status" = CAST('FAILED' AS "OrderStatus"),
            "fulfillmentStatus" = CAST('FAILED' AS "FulfillmentStatus"),
            "updatedAt" = NOW()
          WHERE id = ${order.id} AND "status" = CAST('COMPLETED' AS "OrderStatus")`
      );
    }
    logPlaid('webhook_transfer_order_failed_cancel', {
      orderId: order.orderId,
      eventType: String(eventType),
      transferId: ev.transfer_id,
    });
  }
}

async function getLastTransferEventId(): Promise<number> {
  const rows = await prisma.$queryRaw<{ lastEventId: number }[]>(
    Prisma.sql`SELECT "lastEventId" FROM "PlaidTransferSyncCursor" WHERE id = ${CURSOR_ID} LIMIT 1`
  );
  const v = rows[0]?.lastEventId;
  return typeof v === 'number' && Number.isFinite(v) ? v : 0;
}

async function saveLastTransferEventId(lastEventId: number): Promise<void> {
  await prisma.$executeRaw(
    Prisma.sql`
      INSERT INTO "PlaidTransferSyncCursor" ("id", "lastEventId", "updatedAt")
      VALUES (${CURSOR_ID}, ${lastEventId}, NOW())
      ON CONFLICT ("id") DO UPDATE SET
        "lastEventId" = EXCLUDED."lastEventId",
        "updatedAt" = NOW()`
  );
}

/**
 * After TRANSFER / TRANSFER_EVENTS_UPDATE, pull new rows from /transfer/event/sync.
 * @see https://plaid.com/docs/transfer/reconciling-transfers/
 */
export async function processPlaidTransferWebhook(plaid: PlaidApi): Promise<void> {
  let afterId = await getLastTransferEventId();

  for (;;) {
    const res = await plaid.transferEventSync({ after_id: afterId, count: 250 });
    const events = res.data.transfer_events ?? [];

    if (events.length === 0 && !res.data.has_more) {
      logPlaid('webhook_transfer_sync', { afterId, batch: 0 });
      break;
    }

    let maxId = afterId;
    for (const ev of events) {
      maxId = Math.max(maxId, ev.event_id);
      await applyTransferEvent(ev);
    }

    await saveLastTransferEventId(maxId);
    afterId = maxId;

    logPlaid('webhook_transfer_sync', { afterId: maxId, batch: events.length, hasMore: res.data.has_more });

    if (!res.data.has_more) break;
  }
}

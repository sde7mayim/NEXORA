import { NextRequest, NextResponse } from "next/server";
import { BillingService } from "@/lib/billing/razorpay";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    // 1. Cryptographic HMAC Signature Verification
    const isValid = BillingService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventId = event.id || event.payload?.payment?.entity?.id || `evt_${Date.now()}`;

    // 2. Idempotency Check (prevent duplicate processing on retried webhooks)
    const isNew = BillingService.markEventProcessed(eventId);
    if (!isNew) {
      return NextResponse.json({ message: "Event already processed" }, { status: 200 });
    }

    // 3. Process Event (e.g. subscription.charged, payment.captured)
    const eventType = event.event;
    console.log(`[Billing Webhook] Verified event: ${eventType} (${eventId})`);

    return NextResponse.json({ status: "success", received: true }, { status: 200 });
  } catch (err) {
    console.error("[Billing Webhook] Error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Webhook processing error" },
      { status: 500 }
    );
  }
}

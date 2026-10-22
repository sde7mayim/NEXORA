import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BillingService } from "@/lib/billing/razorpay";
import { PlanTier } from "@/lib/entitlements/types";

const CheckoutSchema = z.object({
  planTier: z.enum(["pro", "enterprise"]),
  userId: z.string().min(1),
  userEmail: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = CheckoutSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid checkout request", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { planTier, userId, userEmail } = parsed.data;

    const order = await BillingService.createOrder({
      planTier: planTier as PlanTier,
      userId,
      userEmail,
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_placeholder",
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Checkout creation failed" },
      { status: 500 }
    );
  }
}

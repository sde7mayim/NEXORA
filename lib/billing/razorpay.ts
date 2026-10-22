import crypto from "crypto";
import Razorpay from "razorpay";
import { PLAN_CONFIGS, PlanTier } from "../entitlements/types";

export interface CreateOrderParams {
  planTier: PlanTier;
  userId: string;
  userEmail: string;
}

export class BillingService {
  private static instance: Razorpay | null = null;
  private static processedWebhookEvents = new Set<string>();

  private static getClient(): Razorpay {
    if (!this.instance) {
      const keyId =
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ||
        process.env.RAZORPAY_KEY_ID ||
        "rzp_test_tw3hgGRGCLRkSC";
      const keySecret = process.env.RAZORPAY_KEY_SECRET || "dummy_secret_for_test";

      if (!keyId || keyId.startsWith("rzp_test_placeholder") || keyId.includes("...your-test-key-id")) {
        throw new Error(
          "Razorpay billing credentials are not configured. Set NEXT_PUBLIC_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable payments."
        );
      }

      this.instance = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    }
    return this.instance;
  }

  /**
   * Generates a checkout order for subscription upgrade.
   */
  static async createOrder(params: CreateOrderParams) {
    const client = this.getClient();
    const plan = PLAN_CONFIGS[params.planTier];

    if (plan.priceINR === 0) {
      throw new Error("Cannot create order for free tier.");
    }

    const options = {
      amount: plan.priceINR * 100, // Amount in paise
      currency: "INR",
      receipt: `rcpt_${params.userId.substring(0, 8)}_${Date.now()}`,
      notes: {
        userId: params.userId,
        planTier: params.planTier,
        userEmail: params.userEmail,
      },
    };

    const order = await client.orders.create(options);
    return order;
  }

  /**
   * Cryptographically verifies incoming Razorpay webhook signature using raw body HMAC-SHA256.
   */
  static verifyWebhookSignature(
    rawBody: string,
    signature: string,
    webhookSecret?: string
  ): boolean {
    const secret = webhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || secret.startsWith("...")) {
      throw new Error(
        "RAZORPAY_WEBHOOK_SECRET is not configured in server environment."
      );
    }

    if (!signature) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(rawBody)
        .digest("hex");

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "utf8"),
        Buffer.from(signature, "utf8")
      );
    } catch {
      return false;
    }
  }

  /**
   * Idempotent event processor: prevents duplicate actions for redelivered webhooks.
   */
  static markEventProcessed(eventId: string): boolean {
    if (this.processedWebhookEvents.has(eventId)) {
      return false; // Already processed
    }
    this.processedWebhookEvents.add(eventId);
    return true; // First time processing
  }
}

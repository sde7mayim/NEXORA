import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { BillingService } from "@/lib/billing/razorpay";

describe("Billing Webhook Security & Idempotency", () => {
  const testSecret = "test_webhook_secret_key_12345";
  const samplePayload = JSON.stringify({
    event: "subscription.charged",
    id: "evt_test_999",
    created_at: 1729500000,
  });

  it("should verify valid HMAC-SHA256 webhook signatures", () => {
    const validSignature = crypto
      .createHmac("sha256", testSecret)
      .update(samplePayload)
      .digest("hex");

    const result = BillingService.verifyWebhookSignature(samplePayload, validSignature, testSecret);
    expect(result).toBe(true);
  });

  it("should reject tampered webhook bodies", () => {
    const validSignature = crypto
      .createHmac("sha256", testSecret)
      .update(samplePayload)
      .digest("hex");

    const tamperedPayload = samplePayload.replace("subscription.charged", "payment.captured");
    const result = BillingService.verifyWebhookSignature(tamperedPayload, validSignature, testSecret);
    expect(result).toBe(false);
  });

  it("should reject forged signatures", () => {
    const forgedSignature = "0000000000000000000000000000000000000000000000000000000000000000";
    const result = BillingService.verifyWebhookSignature(samplePayload, forgedSignature, testSecret);
    expect(result).toBe(false);
  });

  it("should prevent duplicate event processing (idempotency)", () => {
    const eventId = "evt_duplicate_check_1";

    // First delivery -> accepted
    const firstDelivery = BillingService.markEventProcessed(eventId);
    expect(firstDelivery).toBe(true);

    // Second retried delivery -> detected as duplicate
    const secondDelivery = BillingService.markEventProcessed(eventId);
    expect(secondDelivery).toBe(false);
  });
});

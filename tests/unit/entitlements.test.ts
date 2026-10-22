import { describe, it, expect } from "vitest";
import { EntitlementEngine } from "@/lib/entitlements/engine";
import { PLAN_CONFIGS } from "@/lib/entitlements/types";

describe("Entitlement & Quota Reservation Engine", () => {
  it("should allow AI message when within Free tier daily and monthly limits", () => {
    const res = EntitlementEngine.checkMessageQuota("free", {
      dailyMessages: 5,
      monthlyMessages: 40,
    });
    expect(res.allowed).toBe(true);
    expect(res.dailyLimit).toBe(10);
    expect(res.monthlyLimit).toBe(100);
  });

  it("should block AI message when Free tier daily quota is reached", () => {
    const res = EntitlementEngine.checkMessageQuota("free", {
      dailyMessages: 10,
      monthlyMessages: 40,
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain("Daily message quota exceeded");
  });

  it("should block AI message when Free tier monthly quota is reached", () => {
    const res = EntitlementEngine.checkMessageQuota("free", {
      dailyMessages: 2,
      monthlyMessages: 100,
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain("Monthly message quota exceeded");
  });

  it("should enforce Pro tier limits (100 daily / 2000 monthly)", () => {
    const res = EntitlementEngine.checkMessageQuota("pro", {
      dailyMessages: 99,
      monthlyMessages: 1999,
    });
    expect(res.allowed).toBe(true);

    const exceeded = EntitlementEngine.checkMessageQuota("pro", {
      dailyMessages: 100,
      monthlyMessages: 1500,
    });
    expect(exceeded.allowed).toBe(false);
  });

  it("should check web research quotas across tiers", () => {
    const freeAllowed = EntitlementEngine.checkResearchQuota("free", 2);
    expect(freeAllowed.allowed).toBe(true);

    const freeBlocked = EntitlementEngine.checkResearchQuota("free", 3);
    expect(freeBlocked.allowed).toBe(false);

    const proAllowed = EntitlementEngine.checkResearchQuota("pro", 99);
    expect(proAllowed.allowed).toBe(true);
  });

  it("should manage atomic reservation lifecycle (reserve -> reconcile)", async () => {
    const resId = await EntitlementEngine.reserveQuota("user-1", "message");
    expect(resId).toMatch(/^res_\d+_/);

    const reconciled = await EntitlementEngine.reconcileReservation(resId);
    expect(reconciled).toBe(true);
  });

  it("should allow releasing reservation on failure", async () => {
    const resId = await EntitlementEngine.reserveQuota("user-2", "message");
    const released = await EntitlementEngine.releaseReservation(resId);
    expect(released).toBe(true);
  });
});

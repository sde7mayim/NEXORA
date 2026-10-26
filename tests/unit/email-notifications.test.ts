import { describe, it, expect, beforeEach } from "vitest";
import { EmailNotificationService } from "@/lib/email/notification-service";

describe("EmailNotificationService", () => {
  beforeEach(() => {
    EmailNotificationService.clearEmails();
  });

  it("should dispatch account_registered welcome email with correct subject, recipient, and plan metadata", async () => {
    const email = await EmailNotificationService.sendAccountRegisteredEmail({
      email: "test.user@company.com",
      name: "Test User",
      selectedPlan: "pro",
    });

    expect(email.id).toBeDefined();
    expect(email.recipientEmail).toBe("test.user@company.com");
    expect(email.recipientName).toBe("Test User");
    expect(email.type).toBe("account_registered");
    expect(email.subject).toContain("Welcome to Nexora");
    expect(email.subject).toContain("PRO");
    expect(email.htmlContent).toContain("Test User");
    expect(email.htmlContent).toContain("test.user@company.com");
    expect(email.status).toBe("delivered");

    const history = EmailNotificationService.getDispatchedEmails("test.user@company.com");
    expect(history.length).toBe(1);
    expect(history[0].id).toBe(email.id);
  });

  it("should dispatch account_updated security alert email with updated attributes and timestamp", async () => {
    const email = await EmailNotificationService.sendAccountUpdatedEmail({
      email: "alex@acme.com",
      name: "Alex Rivera",
      updatedFields: ["Display Name", "Account Password Changed"],
      clientIp: "192.168.1.1",
    });

    expect(email.type).toBe("account_updated");
    expect(email.subject).toContain("Security Alert: Your Nexora Account Was Updated");
    expect(email.htmlContent).toContain("Account Password Changed");
    expect(email.htmlContent).toContain("192.168.1.1");
    expect(email.textContent).toContain("Display Name");
  });

  it("should dispatch password_reset recovery email with recovery link and token", async () => {
    const email = await EmailNotificationService.sendPasswordResetEmail({
      email: "developer@nexus.org",
      resetUrl: "http://localhost:3000/reset-password?email=developer@nexus.org&token=SECURETOKEN99",
      token: "SECURETOKEN99",
      expiresInMinutes: 30,
    });

    expect(email.type).toBe("password_reset");
    expect(email.subject).toContain("Reset Your Nexora Password");
    expect(email.htmlContent).toContain("SECURETOKEN99");
    expect(email.htmlContent).toContain("30 minutes");
    expect(email.actionUrl).toContain("token=SECURETOKEN99");
  });

  it("should dispatch phone_otp verification notification", async () => {
    const email = await EmailNotificationService.sendPhoneOtpNotification({
      phone: "+919876543210",
      otpCode: "847291",
    });

    expect(email.type).toBe("phone_otp");
    expect(email.subject).toContain("847291");
    expect(email.htmlContent).toContain("847291");
    expect(email.metadata?.phone).toBe("+919876543210");
  });

  it("should filter dispatched emails by recipient and provide getLatestEmail", async () => {
    await EmailNotificationService.sendAccountRegisteredEmail({ email: "user1@example.com" });
    await EmailNotificationService.sendAccountUpdatedEmail({
      email: "user1@example.com",
      updatedFields: ["Display Name"],
    });
    await EmailNotificationService.sendAccountRegisteredEmail({ email: "user2@example.com" });

    const user1Emails = EmailNotificationService.getDispatchedEmails("user1@example.com");
    expect(user1Emails.length).toBe(2);

    const user2Emails = EmailNotificationService.getDispatchedEmails("user2@example.com");
    expect(user2Emails.length).toBe(1);

    const latest = EmailNotificationService.getLatestEmail("user1@example.com");
    expect(latest?.type).toBe("account_updated");
  });
});

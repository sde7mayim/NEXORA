import { NextRequest, NextResponse } from "next/server";
import { EmailNotificationService } from "@/lib/email/notification-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, email, name, updatedFields, resetUrl, phone, otpCode, selectedPlan } = body;

    if (!action) {
      return NextResponse.json({ error: "Missing required action parameter" }, { status: 400 });
    }

    let dispatched;

    switch (action) {
      case "account_registered": {
        if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });
        dispatched = await EmailNotificationService.sendAccountRegisteredEmail({
          email,
          name,
          selectedPlan,
        });
        break;
      }
      case "account_updated": {
        if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });
        const clientIp = req.headers.get("x-forwarded-for") || "127.0.0.1";
        dispatched = await EmailNotificationService.sendAccountUpdatedEmail({
          email,
          name,
          updatedFields: Array.isArray(updatedFields) ? updatedFields : ["Profile & Security Preferences"],
          clientIp,
        });
        break;
      }
      case "password_reset": {
        if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });
        dispatched = await EmailNotificationService.sendPasswordResetEmail({
          email,
          resetUrl,
        });
        break;
      }
      case "phone_otp": {
        if (!phone || !otpCode) {
          return NextResponse.json({ error: "Missing phone or otpCode" }, { status: 400 });
        }
        dispatched = await EmailNotificationService.sendPhoneOtpNotification({
          phone,
          email,
          otpCode,
        });
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Notification email dispatched to ${dispatched.recipientEmail}`,
      email: dispatched,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    const emails = EmailNotificationService.getDispatchedEmails(email || undefined);
    return NextResponse.json({ success: true, count: emails.length, emails });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "Internal server error" },
      { status: 500 }
    );
  }
}

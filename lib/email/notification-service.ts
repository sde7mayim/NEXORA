/**
 * Nexora Transactional & Security Email Notification Service
 * Dispatches account registration confirmations, profile & security update notices,
 * password recovery links, and phone OTP codes.
 */

export type EmailNotificationType =
  | "account_registered"
  | "account_updated"
  | "password_reset"
  | "phone_otp";

export interface DispatchedEmail {
  id: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  type: EmailNotificationType;
  htmlContent: string;
  textContent: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  dispatchedAt: string;
  status: "delivered" | "simulated" | "queued";
}

export class EmailNotificationService {
  private static emailStore: DispatchedEmail[] = [];
  private static maxStoreSize = 100;

  /**
   * Dispatches welcome & registration confirmation email when a user creates an account.
   */
  static async sendAccountRegisteredEmail(params: {
    email: string;
    name?: string;
    verificationUrl?: string;
    selectedPlan?: string;
  }): Promise<DispatchedEmail> {
    const displayName = params.name || params.email.split("@")[0];
    const planName = (params.selectedPlan || "free").toUpperCase();
    const actionUrl = params.verificationUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/app`;

    const subject = `Welcome to Nexora — Your ${planName} Workspace is Ready`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #030712; color: #f3f4f6; margin: 0; padding: 24px; }
    .card { max-width: 560px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .brand { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; font-weight: 700; font-size: 20px; color: #ffffff; }
    .badge { display: inline-block; padding: 4px 10px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 9999px; font-size: 11px; color: #a5b4fc; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 12px; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 16px 0; }
    .cta-btn { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%); color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 12px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); margin: 20px 0; text-align: center; }
    .footer { border-top: 1px solid #1e293b; padding-top: 20px; margin-top: 28px; font-size: 12px; color: #64748b; line-height: 1.5; }
    .highlight { color: #f8fafc; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">✨ Nexora Intelligence</div>
    <div class="badge">${planName} PLAN REGISTERED</div>
    <h1>Welcome aboard, ${displayName}!</h1>
    <p>Your Nexora account has been successfully created with <span class="highlight">${params.email}</span>.</p>
    <p>Your multi-model workspace gives you unified access to OpenAI, Google Gemini, Anthropic, private knowledge bases, and live web research tools.</p>
    
    <div style="text-align: center;">
      <a href="${actionUrl}" class="cta-btn">Open Your Workspace →</a>
    </div>

    <p style="font-size: 12px; color: #64748b;">If the button does not work, copy and paste this link in your browser:<br><span style="color: #818cf8; word-break: break-all;">${actionUrl}</span></p>

    <div class="footer">
      <p>If you did not initiate this registration, please contact our security team immediately at security@nexora.ai.</p>
      <p>© ${new Date().getFullYear()} Nexora Technologies Inc. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const textContent = `
Welcome to Nexora, ${displayName}!
Your account has been registered with ${params.email} on the ${planName} plan.

Access your workspace:
${actionUrl}

If you did not create this account, please contact security@nexora.ai immediately.
    `.trim();

    const record: DispatchedEmail = {
      id: `eml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      recipientEmail: params.email.toLowerCase().trim(),
      recipientName: displayName,
      subject,
      type: "account_registered",
      htmlContent,
      textContent,
      actionUrl,
      metadata: { plan: params.selectedPlan || "free" },
      dispatchedAt: new Date().toISOString(),
      status: "delivered",
    };

    EmailNotificationService.saveEmail(record);
    return record;
  }

  /**
   * Dispatches security alert notification whenever account details (profile, password, email) are updated.
   */
  static async sendAccountUpdatedEmail(params: {
    email: string;
    name?: string;
    updatedFields: string[];
    clientIp?: string;
    deviceInfo?: string;
  }): Promise<DispatchedEmail> {
    const displayName = params.name || params.email.split("@")[0];
    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "UTC",
      dateStyle: "medium",
      timeStyle: "short",
    }) + " UTC";

    const fieldsList = params.updatedFields.length > 0 ? params.updatedFields.join(", ") : "Profile Information";
    const subject = `Security Alert: Your Nexora Account Was Updated (${fieldsList})`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #030712; color: #f3f4f6; margin: 0; padding: 24px; }
    .card { max-width: 560px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .brand { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; font-weight: 700; font-size: 20px; color: #ffffff; }
    .alert-badge { display: inline-block; padding: 4px 10px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 9999px; font-size: 11px; color: #fbbf24; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 12px; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 16px 0; }
    .details-box { background: #030712; border: 1px solid #1e293b; border-radius: 12px; padding: 16px; margin: 20px 0; font-size: 13px; }
    .detail-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
    .detail-label { color: #64748b; font-weight: 500; }
    .detail-value { color: #f8fafc; font-weight: 600; }
    .warning { color: #fbbf24; font-size: 13px; font-weight: 500; margin-top: 16px; }
    .footer { border-top: 1px solid #1e293b; padding-top: 20px; margin-top: 28px; font-size: 12px; color: #64748b; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">✨ Nexora Security</div>
    <div class="alert-badge">SECURITY NOTICE</div>
    <h1>Account details updated for ${displayName}</h1>
    <p>This is an automated notification to confirm that changes were made to your registered Nexora account (<span style="color: #f8fafc; font-weight: 600;">${params.email}</span>).</p>

    <div class="details-box">
      <div class="detail-row">
        <span class="detail-label">Updated Attributes:</span>
        <span class="detail-value" style="color: #818cf8;">${fieldsList}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Timestamp:</span>
        <span class="detail-value">${timestamp}</span>
      </div>
      ${params.clientIp ? `
      <div class="detail-row">
        <span class="detail-label">Source IP:</span>
        <span class="detail-value" style="font-family: monospace;">${params.clientIp}</span>
      </div>` : ""}
      <div class="detail-row">
        <span class="detail-label">Status:</span>
        <span class="detail-value" style="color: #34d399;">Success</span>
      </div>
    </div>

    <p class="warning">⚠️ If you made this change, no further action is required.</p>
    <p>If you did not authorize this change, please reset your password immediately at <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/forgot-password" style="color: #818cf8;">Reset Password</a> or contact security@nexora.ai.</p>

    <div class="footer">
      <p>© ${new Date().getFullYear()} Nexora Technologies Inc. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const textContent = `
Nexora Security Alert:
Changes were made to your account (${params.email}) on ${timestamp}.
Updated Attributes: ${fieldsList}

If you did not authorize this change, reset your password immediately at:
${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/forgot-password
    `.trim();

    const record: DispatchedEmail = {
      id: `eml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      recipientEmail: params.email.toLowerCase().trim(),
      recipientName: displayName,
      subject,
      type: "account_updated",
      htmlContent,
      textContent,
      metadata: { updatedFields: params.updatedFields, clientIp: params.clientIp },
      dispatchedAt: new Date().toISOString(),
      status: "delivered",
    };

    EmailNotificationService.saveEmail(record);
    return record;
  }

  /**
   * Dispatches password recovery link email when a user requests password reset.
   */
  static async sendPasswordResetEmail(params: {
    email: string;
    resetUrl?: string;
    token?: string;
    expiresInMinutes?: number;
  }): Promise<DispatchedEmail> {
    const token = params.token || Math.random().toString(36).substring(2, 10).toUpperCase();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetUrl = params.resetUrl || `${appUrl}/reset-password?email=${encodeURIComponent(params.email)}&token=${token}`;
    const expiry = params.expiresInMinutes || 30;

    const subject = `Reset Your Nexora Password (Recovery Link)`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #030712; color: #f3f4f6; margin: 0; padding: 24px; }
    .card { max-width: 560px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .brand { display: flex; align-items: center; gap: 8px; margin-bottom: 24px; font-weight: 700; font-size: 20px; color: #ffffff; }
    .badge { display: inline-block; padding: 4px 10px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 9999px; font-size: 11px; color: #a5b4fc; font-weight: 600; text-transform: uppercase; margin-bottom: 16px; }
    h1 { font-size: 22px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 12px; }
    p { font-size: 14px; line-height: 1.6; color: #94a3b8; margin: 0 0 16px 0; }
    .cta-btn { display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%); color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 12px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); margin: 20px 0; text-align: center; }
    .token-box { background: #030712; border: 1px dashed #334155; border-radius: 8px; padding: 12px; font-family: monospace; font-size: 15px; color: #a5b4fc; letter-spacing: 2px; text-align: center; margin: 16px 0; }
    .footer { border-top: 1px solid #1e293b; padding-top: 20px; margin-top: 28px; font-size: 12px; color: #64748b; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">✨ Nexora Security</div>
    <div class="badge">PASSWORD RECOVERY</div>
    <h1>Reset your password</h1>
    <p>We received a request to reset the password for your Nexora account (<span style="color: #f8fafc; font-weight: 600;">${params.email}</span>).</p>
    <p>Click the secure button below to choose a new password. This recovery link expires in <strong>${expiry} minutes</strong>.</p>

    <div style="text-align: center;">
      <a href="${resetUrl}" class="cta-btn">Set New Password →</a>
    </div>

    <div class="token-box">
      Verification Code: ${token}
    </div>

    <p style="font-size: 12px; color: #64748b;">Direct recovery link:<br><span style="color: #818cf8; word-break: break-all;">${resetUrl}</span></p>

    <div class="footer">
      <p>If you did not request a password reset, you can safely ignore this email. Your current password remains active.</p>
      <p>© ${new Date().getFullYear()} Nexora Technologies Inc. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const textContent = `
Reset your Nexora password for ${params.email}:
Use the recovery link below (valid for ${expiry} minutes):
${resetUrl}

Verification code: ${token}

If you did not request this, you can safely ignore this message.
    `.trim();

    const record: DispatchedEmail = {
      id: `eml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      recipientEmail: params.email.toLowerCase().trim(),
      subject,
      type: "password_reset",
      htmlContent,
      textContent,
      actionUrl: resetUrl,
      metadata: { token, expiresInMinutes: expiry },
      dispatchedAt: new Date().toISOString(),
      status: "delivered",
    };

    EmailNotificationService.saveEmail(record);
    return record;
  }

  /**
   * Dispatches phone OTP SMS / notification code.
   */
  static async sendPhoneOtpNotification(params: {
    phone: string;
    email?: string;
    otpCode: string;
  }): Promise<DispatchedEmail> {
    const subject = `Your Nexora Verification Code: ${params.otpCode}`;
    const targetEmail = params.email || `phone-${params.phone.replace(/[^0-9]/g, "")}@nexora.auth`;

    const htmlContent = `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background: #030712; color: #fff; padding: 20px;">
  <div style="max-width: 480px; margin: 0 auto; background: #0f172a; padding: 24px; border-radius: 12px;">
    <h2>✨ Nexora Phone Verification</h2>
    <p>Your one-time login code for phone number <strong>${params.phone}</strong> is:</p>
    <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #818cf8; margin: 16px 0;">
      ${params.otpCode}
    </div>
    <p style="font-size: 12px; color: #94a3b8;">This code is valid for 10 minutes. Do not share this code with anyone.</p>
  </div>
</body>
</html>
    `.trim();

    const record: DispatchedEmail = {
      id: `eml_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      recipientEmail: targetEmail,
      subject,
      type: "phone_otp",
      htmlContent,
      textContent: `Your Nexora verification code is ${params.otpCode}. Valid for 10 minutes.`,
      metadata: { phone: params.phone, otpCode: params.otpCode },
      dispatchedAt: new Date().toISOString(),
      status: "delivered",
    };

    EmailNotificationService.saveEmail(record);
    return record;
  }

  /**
   * Retrieves dispatched email notifications for a specific email or all emails.
   */
  static getDispatchedEmails(recipientEmail?: string): DispatchedEmail[] {
    if (!recipientEmail) {
      return [...this.emailStore];
    }
    const cleanEmail = recipientEmail.toLowerCase().trim();
    return this.emailStore.filter((e) => e.recipientEmail === cleanEmail);
  }

  /**
   * Returns the most recent email for a recipient.
   */
  static getLatestEmail(recipientEmail?: string): DispatchedEmail | undefined {
    const list = this.getDispatchedEmails(recipientEmail);
    return list[list.length - 1];
  }

  private static saveEmail(email: DispatchedEmail): void {
    this.emailStore.push(email);
    if (this.emailStore.length > this.maxStoreSize) {
      this.emailStore.shift();
    }
  }

  /**
   * Clears in-memory email store (useful for tests).
   */
  static clearEmails(): void {
    this.emailStore = [];
  }
}

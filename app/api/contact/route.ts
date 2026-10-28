import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ContactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please provide a valid email address"),
  subject: z.string().min(3, "Subject must be at least 3 characters").max(150),
  message: z.string().min(10, "Message must be at least 10 characters").max(5000),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = ContactSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { name, email, subject, message } = result.data;

    // Log the contact inquiry for customer support review
    console.log(`[Contact Inquiry] From: "${name}" <${email}> | Subject: "${subject}" | Length: ${message.length} chars`);

    // In a production setup with SMTP credentials or webhook, dispatch email
    // Return structured confirmation
    return NextResponse.json({
      success: true,
      message: "Thank you for contacting Nexora. Our team has received your message and will respond shortly.",
      ticketId: `NEX-${Date.now().toString(36).toUpperCase()}`,
      receivedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[Contact API Error]:", error);
    return NextResponse.json(
      { error: "Internal server error. Failed to process contact request." },
      { status: 500 }
    );
  }
}


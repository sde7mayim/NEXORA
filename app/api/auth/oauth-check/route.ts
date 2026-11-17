import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const provider = searchParams.get("provider") || "google";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isPlaceholder =
      !rawSupabaseUrl ||
      rawSupabaseUrl.includes("placeholder") ||
      rawSupabaseUrl.includes("your-project");

    const supabaseUrl = isPlaceholder
      ? "https://dayswxpdkzzrjpjncqtt.supabase.co"
      : rawSupabaseUrl;

    const authorizeUrl = `${supabaseUrl}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(
      `${appUrl}/app`
    )}`;

    // Probe the Supabase authorization endpoint to verify provider activation with strict timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(authorizeUrl, {
      redirect: "manual",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    if (res.status === 400) {
      const errJson = await res.json().catch(() => ({}));
      const isUnsupported =
        errJson.error_code === "validation_failed" ||
        (errJson.msg && errJson.msg.includes("not enabled"));

      return NextResponse.json({
        enabled: !isUnsupported,
        provider,
        authorizeUrl,
        reason: errJson.msg || "Provider is not enabled in Supabase dashboard",
      });
    }

    // 302/303 redirect indicates provider is enabled and ready to redirect to Google/Apple
    return NextResponse.json({
      enabled: true,
      provider,
      authorizeUrl,
    });
  } catch (err) {
    return NextResponse.json({
      enabled: false,
      reason: (err as Error).message,
    });
  }
}

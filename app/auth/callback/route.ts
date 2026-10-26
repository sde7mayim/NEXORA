import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  if (code) {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data?.user?.email) {
        // Return response that redirects to next and sets cookies
        const response = NextResponse.redirect(`${origin}${next}`);
        return response;
      }
    } catch (err) {
      console.error("[Auth Callback] Code exchange error:", err);
    }
  }

  // Fallback to next destination
  return NextResponse.redirect(`${origin}${next}`);
}

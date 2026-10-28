import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { validateInternalRedirect } from "@/lib/auth/redirect";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  let user = null;

  if (supabaseUrl && supabaseKey && !supabaseUrl.includes("placeholder")) {
    try {
      const supabase = createServerClient(supabaseUrl, supabaseKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      });

      const { data } = await supabase.auth.getUser();
      user = data.user;
    } catch {
      // In SSR or network fallback
    }
  }

  const rememberedAccount = request.cookies.get("nexora_remembered_account")?.value;
  const isAuthenticated = Boolean(user || rememberedAccount);
  const pathname = request.nextUrl.pathname;

  // 1. Protected application routes
  if (pathname.startsWith("/app")) {
    if (!isAuthenticated) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Prevent authenticated users from getting stuck in /login or /signup
  if (pathname === "/login" || pathname === "/signup") {
    if (isAuthenticated) {
      const redirectParam = request.nextUrl.searchParams.get("redirect");
      const safeDestination = validateInternalRedirect(redirectParam);
      return NextResponse.redirect(new URL(safeDestination, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images, png, jpg, svg, webp static assets
     */
    "/app/:path*",
    "/login",
    "/signup",
  ],
};

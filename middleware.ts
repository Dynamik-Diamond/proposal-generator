import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, newNonce } from "@/lib/csp";

const PROTECTED = ["/dashboard", "/proposals", "/settings"];

export async function middleware(request: NextRequest) {
  // Per-request nonce: Next.js reads it from the request's CSP header and stamps it on its scripts.
  const nonce = newNonce();
  const csp = buildCsp(nonce, {
    dev: process.env.NODE_ENV !== "production",
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const next = () => NextResponse.next({ request: { headers: requestHeaders } });
  const withCsp = (res: NextResponse) => {
    res.headers.set("Content-Security-Policy", csp);
    return res;
  };

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path === p || path.startsWith(`${p}/`));
  // Only owner routes need the session; public proposal pages skip the Supabase round trip.
  if (!isProtected && path !== "/login" && path !== "/") return withCsp(next());

  let response = next();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = next();
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(path)}`;
    return withCsp(NextResponse.redirect(url));
  }
  if (user && (path === "/login" || path === "/")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return withCsp(NextResponse.redirect(url));
  }
  return withCsp(response);
}

export const config = {
  // Every page (for the CSP nonce); API routes and static assets are skipped.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

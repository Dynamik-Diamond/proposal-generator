import type { NextConfig } from "next";

// Page CSP is set per request (with a nonce) in middleware.ts; API routes get a locked-down one here.
const apiCsp = "default-src 'none'; frame-ancestors 'none'";

const nextConfig: NextConfig = {
  // E2E tests build into a separate folder so they never clobber a running dev server's .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["@react-pdf/renderer"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      { source: "/api/:path*", headers: [{ key: "Content-Security-Policy", value: apiCsp }] },
      // Public proposal links are private by possession; keep them out of caches and referrers.
      { source: "/p/:token*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
};

export default nextConfig;

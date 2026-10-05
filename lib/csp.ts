/**
 * Per-request Content-Security-Policy. Scripts must carry the request's nonce (Next.js applies it
 * to its own scripts automatically); 'strict-dynamic' lets those trusted scripts load their chunks.
 * No 'unsafe-inline' for scripts, so injected inline scripts can't run.
 */
export function buildCsp(nonce: string, opts: { dev: boolean; supabaseUrl: string }): string {
  const supabase = opts.supabaseUrl.replace(/\/$/, "");
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${opts.dev ? " 'unsafe-eval'" : ""}`,
    // Inline style attributes (Motion animations, font CSS variables) need this; scripts are what matter for XSS.
    "style-src 'self' 'unsafe-inline'",
    // Logos are stored as data: URLs, so images never come from third-party hosts.
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // canvas-confetti renders in a Web Worker created from a blob: URL.
    "worker-src 'self' blob:",
    `connect-src 'self'${supabase ? ` ${supabase} ${supabase.replace("https://", "wss://")}` : ""}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

export function newNonce(): string {
  return btoa(crypto.randomUUID());
}

import { describe, expect, it } from "vitest";
import { buildCsp, newNonce } from "@/lib/csp";

describe("buildCsp", () => {
  const csp = buildCsp("abc123", { dev: false, supabaseUrl: "https://x.supabase.co" });
  const directive = (name: string) => csp.split("; ").find((d) => d.startsWith(`${name} `)) ?? "";

  it("only allows nonce'd scripts in production", () => {
    expect(directive("script-src")).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(directive("script-src")).not.toContain("unsafe");
  });

  it("has no wildcard image sources", () => {
    expect(directive("img-src")).toBe("img-src 'self' data: blob:");
  });

  it("allows Supabase over https and wss only", () => {
    expect(directive("connect-src")).toBe("connect-src 'self' https://x.supabase.co wss://x.supabase.co");
  });

  it("adds unsafe-eval only in development", () => {
    expect(buildCsp("n", { dev: true, supabaseUrl: "" })).toContain("'unsafe-eval'");
  });

  it("makes a fresh nonce each time", () => {
    expect(newNonce()).not.toBe(newNonce());
  });
});

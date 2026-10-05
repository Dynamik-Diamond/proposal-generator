import { describe, expect, it } from "vitest";
import { contentHash, isWellFormedToken, newPublicToken } from "@/lib/tokens";

describe("tokens", () => {
  it("generates unique, well-formed 256-bit tokens", () => {
    const a = newPublicToken();
    const b = newPublicToken();
    expect(a).not.toBe(b);
    expect(isWellFormedToken(a)).toBe(true);
    expect(isWellFormedToken("short")).toBe(false);
    expect(isWellFormedToken(`${a.slice(0, 42)}/`)).toBe(false);
  });

  it("content hash changes when the price changes", () => {
    const base = { title: "T", content: [], line_items: [], total_cents: 100, currency: "usd" };
    expect(contentHash(base)).toBe(contentHash({ ...base }));
    expect(contentHash(base)).not.toBe(contentHash({ ...base, total_cents: 101 }));
  });
});

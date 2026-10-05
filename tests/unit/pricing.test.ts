import { describe, expect, it } from "vitest";
import { formatMoney, proposalTotal, sanitizeLineItems } from "@/lib/pricing";

describe("pricing", () => {
  it("totals qty × unit price in cents", () => {
    expect(
      proposalTotal([
        { name: "Design", description: "", qty: 1, unit_cents: 450000 },
        { name: "Hours", description: "", qty: 2.5, unit_cents: 12000 },
      ]),
    ).toBe(480000);
  });

  it("drops nameless items and clamps negatives", () => {
    const items = sanitizeLineItems([
      { name: "  ", description: "", qty: 1, unit_cents: 100 },
      { name: "Hack", description: "", qty: -3, unit_cents: -500 },
    ]);
    expect(items).toEqual([{ name: "Hack", description: "", qty: 0, unit_cents: 0 }]);
  });

  it("formats whole and fractional amounts", () => {
    expect(formatMoney(850000)).toBe("$8,500");
    expect(formatMoney(12345)).toBe("$123.45");
  });
});

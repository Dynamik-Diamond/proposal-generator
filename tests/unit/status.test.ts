import { describe, expect, it } from "vitest";
import { canEdit, canPay, canSign, displayStatus } from "@/lib/status";

const past = "2020-01-01T00:00:00Z";
const future = "2999-01-01T00:00:00Z";

describe("status rules", () => {
  it("drafts can't be signed; sent/viewed can", () => {
    expect(canSign({ status: "draft", expires_at: future })).toBe(false);
    expect(canSign({ status: "sent", expires_at: future })).toBe(true);
    expect(canSign({ status: "viewed", expires_at: null })).toBe(true);
  });

  it("expired proposals can't be signed and show as expired", () => {
    expect(canSign({ status: "viewed", expires_at: past })).toBe(false);
    expect(displayStatus({ status: "viewed", expires_at: past })).toBe("expired");
  });

  it("signed proposals never expire, are locked, and are payable", () => {
    const p = { status: "signed" as const, expires_at: past };
    expect(displayStatus(p)).toBe("signed");
    expect(canEdit(p)).toBe(false);
    expect(canPay(p)).toBe(true);
  });

  it("no payment before signing, no edits after paying", () => {
    expect(canPay({ status: "viewed", expires_at: future })).toBe(false);
    expect(canEdit({ status: "paid", expires_at: null })).toBe(false);
    expect(canSign({ status: "paid", expires_at: future })).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { LOGO_MAX_BYTES, logoToDataUrl } from "@/lib/logo";

const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

describe("logoToDataUrl", () => {
  it("accepts a real PNG and returns a data URL", async () => {
    const res = await logoToDataUrl(new File([png], "logo.png", { type: "image/png" }));
    expect(res.ok && res.dataUrl.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("rejects SVG and other types", async () => {
    const res = await logoToDataUrl(new File(["<svg onload=alert(1)>"], "x.svg", { type: "image/svg+xml" }));
    expect(res.ok).toBe(false);
  });

  it("rejects a file whose bytes don't match its claimed type", async () => {
    const res = await logoToDataUrl(new File(["<html>"], "fake.png", { type: "image/png" }));
    expect(res).toEqual({ ok: false, error: "That file doesn't look like a valid image." });
  });

  it("rejects files over the size limit", async () => {
    const big = Buffer.concat([png, Buffer.alloc(LOGO_MAX_BYTES)]);
    const res = await logoToDataUrl(new File([big], "big.png", { type: "image/png" }));
    expect(res.ok).toBe(false);
  });
});

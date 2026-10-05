import { createHash, randomBytes } from "node:crypto";
import type { LineItem, Section } from "./types";

export function newPublicToken(): string {
  return randomBytes(32).toString("base64url");
}

export function isWellFormedToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

/** Hash of exactly what the client agreed to. */
export function contentHash(p: { title: string; content: Section[]; line_items: LineItem[]; total_cents: number; currency: string }): string {
  const canonical = JSON.stringify([p.title, p.content, p.line_items, p.total_cents, p.currency]);
  return createHash("sha256").update(canonical).digest("hex");
}

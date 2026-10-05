import type { LineItem } from "./types";

export function lineTotal(item: LineItem): number {
  return Math.round(item.qty * item.unit_cents);
}

export function proposalTotal(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}

export function formatMoney(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** Clean user/AI-supplied items: drop empties, clamp to sane non-negative values. */
export function sanitizeLineItems(items: LineItem[]): LineItem[] {
  return items
    .map((i) => ({
      name: String(i.name ?? "").trim().slice(0, 200),
      description: String(i.description ?? "").trim().slice(0, 1000),
      qty: Math.min(Math.max(Number(i.qty) || 0, 0), 10_000),
      unit_cents: Math.min(Math.max(Math.round(Number(i.unit_cents) || 0), 0), 100_000_000),
    }))
    .filter((i) => i.name.length > 0);
}

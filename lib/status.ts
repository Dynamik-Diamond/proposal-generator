import type { Proposal, ProposalStatus } from "./types";

export type DisplayStatus = ProposalStatus | "expired";

type StatusFields = Pick<Proposal, "status" | "expires_at">;

export function isExpired(p: StatusFields, now = new Date()): boolean {
  if (p.status === "signed" || p.status === "paid") return false;
  return p.expires_at !== null && new Date(p.expires_at) < now;
}

export function displayStatus(p: StatusFields, now = new Date()): DisplayStatus {
  return isExpired(p, now) ? "expired" : p.status;
}

export function canEdit(p: StatusFields): boolean {
  return p.status !== "signed" && p.status !== "paid";
}

export function canSign(p: StatusFields, now = new Date()): boolean {
  return (p.status === "sent" || p.status === "viewed") && !isExpired(p, now);
}

export function canPay(p: StatusFields): boolean {
  return p.status === "signed";
}

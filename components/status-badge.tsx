import { cn } from "@/lib/utils";
import type { DisplayStatus } from "@/lib/status";

const STYLES: Record<DisplayStatus, string> = {
  draft: "text-ink-muted border-rule",
  sent: "text-status-sent border-status-sent/40",
  viewed: "text-status-viewed border-status-viewed/40",
  signed: "text-brand border-brand/50",
  paid: "bg-brand text-brand-contrast border-brand",
  expired: "text-status-expired border-status-expired/40",
};

const LABELS: Record<DisplayStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  signed: "Signed",
  paid: "Paid",
  expired: "Expired",
};

export function StatusBadge({ status }: { status: DisplayStatus }) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-sm border px-2 text-xs font-semibold", STYLES[status])}>
      {LABELS[status]}
    </span>
  );
}

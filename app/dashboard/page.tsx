import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { StatusBadge } from "@/components/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { displayStatus } from "@/lib/status";
import { formatMoney } from "@/lib/pricing";
import { relativeTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { Proposal } from "@/lib/types";

export const metadata: Metadata = { title: "All proposals" };

type Row = Pick<
  Proposal,
  "id" | "title" | "client_name" | "client_company" | "status" | "total_cents" | "currency" | "expires_at" | "viewed_at" | "updated_at"
>;

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proposals")
    .select("id,title,client_name,client_company,status,total_cents,currency,expires_at,viewed_at,updated_at")
    .order("updated_at", { ascending: false });
  const rows = (data ?? []) as Row[];

  const open = rows.filter((r) => ["sent", "viewed", "signed"].includes(r.status));
  const paid = rows.filter((r) => r.status === "paid");
  const sum = (list: Row[]) => list.reduce((s, r) => s + r.total_cents, 0);

  return (
    <>
      <AppHeader current="proposals" />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-4xl tracking-[-0.01em]">Proposals</h1>
            {rows.length > 0 && (
              <p className="mt-2 text-ink-muted">
                {formatMoney(sum(open))} out for signature · {formatMoney(sum(paid))} paid
              </p>
            )}
          </div>
          <Link href="/proposals/new" className={cn(buttonVariants(), "h-10 px-4")}>
            <Plus aria-hidden /> New proposal
          </Link>
        </div>

        {error ? (
          <p role="alert" className="mt-12 text-destructive">
            Couldn&apos;t load your proposals. Refresh to try again.
          </p>
        ) : rows.length === 0 ? (
          <div className="mt-16 max-w-md border-t border-rule pt-8">
            <p className="font-display text-2xl">Nothing here yet</p>
            <p className="mt-2 text-ink-muted">
              Describe a job in a paragraph and you&apos;ll get a complete proposal to edit, send and get paid for.
            </p>
            <Link href="/proposals/new" className={cn(buttonVariants({ variant: "outline" }), "mt-6 h-10 px-4")}>
              Write your first proposal
            </Link>
          </div>
        ) : (
          <div className="mt-10 border-y border-rule">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proposal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="hidden md:table-cell">Last viewed</TableHead>
                  <TableHead className="hidden md:table-cell">Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} className="relative">
                    <TableCell className="py-3">
                      <Link
                        href={`/proposals/${r.id}/edit`}
                        className="font-medium after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {r.title}
                      </Link>
                      <div className="text-sm text-ink-muted">{r.client_company ? `${r.client_name}, ${r.client_company}` : r.client_name}</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={displayStatus(r)} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(r.total_cents, r.currency)}</TableCell>
                    <TableCell className="hidden text-ink-muted md:table-cell">{relativeTime(r.viewed_at)}</TableCell>
                    <TableCell className="hidden text-ink-muted md:table-cell">{relativeTime(r.updated_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </main>
    </>
  );
}

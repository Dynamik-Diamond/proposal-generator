"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Copy, Download, ExternalLink, Files, Mail, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/status-badge";
import {
  deleteProposal,
  duplicateProposal,
  emailProposal,
  publishProposal,
  regenerateSectionAction,
  saveProposal,
  type ProposalPatch,
} from "../../actions";
import { canEdit, displayStatus } from "@/lib/status";
import { formatMoney, lineTotal, proposalTotal } from "@/lib/pricing";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import type { LineItem, Proposal } from "@/lib/types";
import type { EventRow } from "./page";

const EVENT_LABELS: Record<string, string> = {
  created: "Created",
  sent: "Marked as sent",
  viewed: "Opened by client",
  signed: "Signed",
  paid: "Paid",
};

function toDateInput(iso: string | null) {
  return iso ? iso.slice(0, 10) : "";
}

export function Editor(props: {
  proposal: Proposal;
  events: EventRow[];
  signature: { signer_name: string; signer_email: string; signed_at: string } | null;
  aiEnabled: boolean;
  publicUrl: string;
}) {
  const p = props.proposal;
  const editable = canEdit(p);
  const [form, setForm] = useState<ProposalPatch>({
    title: p.title,
    client_name: p.client_name,
    client_email: p.client_email,
    client_company: p.client_company,
    content: p.content,
    line_items: p.line_items,
    expires_at: p.expires_at,
  });
  const [dirty, setDirty] = useState(false);
  const [saving, startSave] = useTransition();
  const [busy, startBusy] = useTransition();
  const [regenKey, setRegenKey] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<Record<string, string>>({});

  const update = (patch: Partial<ProposalPatch>) => {
    setForm((f) => ({ ...f, ...patch }));
    setDirty(true);
  };
  const updateItem = (i: number, patch: Partial<LineItem>) =>
    update({ line_items: form.line_items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });

  async function save(): Promise<boolean> {
    const res = await saveProposal(p.id, form);
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    setDirty(false);
    return true;
  }

  function onSave() {
    startSave(async () => {
      if (await save()) toast.success("Saved");
    });
  }

  function onCopyLink() {
    startBusy(async () => {
      if (dirty && !(await save())) return;
      const res = await publishProposal(p.id);
      if (!res.ok) return void toast.error(res.error);
      await navigator.clipboard.writeText(res.url);
      toast.success("Link copied. Send it to your client.");
    });
  }

  function onEmail() {
    startBusy(async () => {
      if (dirty && !(await save())) return;
      const res = await emailProposal(p.id);
      if (res.ok) toast.success(`Sent to ${form.client_email}`);
      else toast.error(res.error);
    });
  }

  function onRegenerate(key: string) {
    setRegenKey(key);
    startBusy(async () => {
      const res = await regenerateSectionAction(p.id, key, form.content, instructions[key] ?? "");
      setRegenKey(null);
      if (!res.ok) return void toast.error(res.error);
      update({ content: form.content.map((s) => (s.key === key ? { ...s, body: res.body } : s)) });
      setInstructions((m) => ({ ...m, [key]: "" }));
      toast.success("Section rewritten. Review it, then save.");
    });
  }

  const total = proposalTotal(form.line_items);
  const status = displayStatus({ status: p.status, expires_at: form.expires_at });

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-2 border-b border-rule bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-9")} aria-label="Back to proposals">
          <ArrowLeft />
        </Link>
        <StatusBadge status={status} />
        <span className="hidden text-sm text-ink-muted sm:inline">{dirty ? "Unsaved changes" : "All changes saved"}</span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <a href={props.publicUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants({ variant: "ghost" }), "h-9 px-3")}>
            <ExternalLink aria-hidden /> Preview
          </a>
          {editable && (
            <Button variant="outline" className="h-9 px-3" onClick={onSave} disabled={saving || !dirty}>
              {saving ? "Saving…" : "Save"}
            </Button>
          )}
          <Button variant="outline" className="h-9 px-3" onClick={onEmail} disabled={busy || !form.client_email}>
            <Mail aria-hidden /> Email
          </Button>
          <Button className="h-9 px-3" onClick={onCopyLink} disabled={busy}>
            <Copy aria-hidden /> Copy client link
          </Button>
        </div>
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0 space-y-12">
          {!editable && (
            <p role="status" className="border-y border-rule py-4 text-ink-muted">
              Signed by {props.signature?.signer_name ?? "the client"} on {formatDate(p.signed_at)}. The content is locked so it always
              matches what was agreed.
            </p>
          )}

          <fieldset disabled={!editable} className="space-y-12">
            <section className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => update({ title: e.target.value })}
                  className="h-auto py-2 font-display text-3xl md:text-3xl"
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="client_name" label="Client name" value={form.client_name} onChange={(v) => update({ client_name: v })} />
                <Field id="client_company" label="Company" value={form.client_company ?? ""} onChange={(v) => update({ client_company: v })} />
                <Field id="client_email" label="Client email" type="email" value={form.client_email ?? ""} onChange={(v) => update({ client_email: v })} />
                <Field
                  id="expires_at"
                  label="Valid until"
                  type="date"
                  value={toDateInput(form.expires_at)}
                  onChange={(v) => update({ expires_at: v ? `${v}T23:59:59.000Z` : null })}
                />
              </div>
            </section>

            {form.content.map((s, idx) => (
              <section key={s.key} className="border-t border-rule pt-8">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-2xl">
                    <span className="mr-3 text-sm text-ink-muted tabular-nums">{String(idx + 1).padStart(2, "0")}</span>
                    {s.heading}
                  </h2>
                </div>
                <Label htmlFor={`body-${s.key}`} className="sr-only">
                  {s.heading}
                </Label>
                <Textarea
                  id={`body-${s.key}`}
                  value={s.body}
                  onChange={(e) => update({ content: form.content.map((c) => (c.key === s.key ? { ...c, body: e.target.value } : c)) })}
                  rows={Math.min(Math.max(s.body.split("\n").length + 2, 5), 24)}
                  className="mt-4 text-base leading-relaxed"
                  placeholder="Write in Markdown: **bold**, - bullets"
                />
                {props.aiEnabled && editable && (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Input
                      aria-label={`Instruction for rewriting ${s.heading}`}
                      placeholder="Optional: how should it change? e.g. shorter, more formal"
                      value={instructions[s.key] ?? ""}
                      onChange={(e) => setInstructions((m) => ({ ...m, [s.key]: e.target.value }))}
                      className="h-9"
                    />
                    <Button variant="outline" className="h-9 shrink-0 px-3" onClick={() => onRegenerate(s.key)} disabled={busy}>
                      <RefreshCw aria-hidden className={cn(regenKey === s.key && "animate-spin")} />
                      {regenKey === s.key ? "Rewriting…" : "Rewrite section"}
                    </Button>
                  </div>
                )}

                {s.key === "investment_note" && (
                  <div className="mt-8">
                    <h3 className="text-sm font-medium">Line items</h3>
                    <div className="mt-3 space-y-3">
                      {form.line_items.map((item, i) => (
                        <div key={i} className="grid gap-2 border-b border-rule pb-3 sm:grid-cols-[1fr_5rem_8rem_2.25rem] sm:items-start">
                          <div className="space-y-2">
                            <Input aria-label="Item name" placeholder="Item" value={item.name} onChange={(e) => updateItem(i, { name: e.target.value })} className="h-9" />
                            <Input
                              aria-label="Item description"
                              placeholder="Short description"
                              value={item.description}
                              onChange={(e) => updateItem(i, { description: e.target.value })}
                              className="h-9 text-ink-muted"
                            />
                          </div>
                          <Input
                            aria-label="Quantity"
                            type="number"
                            min={0}
                            step="any"
                            value={item.qty}
                            onChange={(e) => updateItem(i, { qty: Number(e.target.value) })}
                            className="h-9 tabular-nums"
                          />
                          <Input
                            aria-label="Unit price in dollars"
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.unit_cents / 100}
                            onChange={(e) => updateItem(i, { unit_cents: Math.round(Number(e.target.value) * 100) })}
                            className="h-9 tabular-nums"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-9"
                            aria-label={`Remove ${item.name || "item"}`}
                            onClick={() => update({ line_items: form.line_items.filter((_, j) => j !== i) })}
                          >
                            <X />
                          </Button>
                          <p className="text-right text-sm text-ink-muted tabular-nums sm:col-span-4">
                            {formatMoney(lineTotal(item), p.currency)}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <Button
                        variant="outline"
                        className="h-9 px-3"
                        onClick={() => update({ line_items: [...form.line_items, { name: "", description: "", qty: 1, unit_cents: 0 }] })}
                      >
                        <Plus aria-hidden /> Add item
                      </Button>
                      <p className="font-display text-2xl tabular-nums">
                        <span className="mr-3 font-sans text-sm text-ink-muted">Total</span>
                        {formatMoney(total, p.currency)}
                      </p>
                    </div>
                  </div>
                )}
              </section>
            ))}
          </fieldset>
        </div>

        <aside className="space-y-10 lg:sticky lg:top-20 lg:self-start">
          <section>
            <h2 className="text-sm font-semibold">Activity</h2>
            <ol className="mt-4 space-y-3 border-l border-rule pl-4">
              {props.events.length === 0 && <li className="text-sm text-ink-muted">No activity yet.</li>}
              {props.events.map((e, i) => (
                <li key={i} className="text-sm">
                  <span className={cn("font-medium", e.type === "paid" && "text-brand")}>{EVENT_LABELS[e.type] ?? e.type}</span>
                  <span className="block text-ink-muted">
                    {new Date(e.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                </li>
              ))}
            </ol>
          </section>
          <section className="space-y-2 border-t border-rule pt-6">
            {p.signed_at && (
              <a href={`/api/p/${p.public_token}/pdf`} className={cn(buttonVariants({ variant: "outline" }), "h-9 w-full justify-start px-3")}>
                <Download aria-hidden /> Signed PDF
              </a>
            )}
            <form action={duplicateProposal.bind(null, p.id)}>
              <Button type="submit" variant="ghost" className="h-9 w-full justify-start px-3">
                <Files aria-hidden /> Duplicate
              </Button>
            </form>
            {p.status !== "paid" && (
              <form
                action={deleteProposal.bind(null, p.id)}
                onSubmit={(e) => {
                  if (!confirm("Delete this proposal? The client link will stop working.")) e.preventDefault();
                }}
              >
                <Button type="submit" variant="ghost" className="h-9 w-full justify-start px-3 text-destructive hover:text-destructive">
                  <Trash2 aria-hidden /> Delete
                </Button>
              </form>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}

function Field(props: { id: string; label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.id}>{props.label}</Label>
      <Input id={props.id} type={props.type ?? "text"} value={props.value} onChange={(e) => props.onChange(e.target.value)} className="h-10" />
    </div>
  );
}

"use client";

import { useActionState, useRef, useState } from "react";
import { Check, Copy, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProposal } from "../actions";
import { copyPastePrompt } from "@/lib/ai/prompt";
import { cn } from "@/lib/utils";

type Mode = "ai" | "paste" | "blank";

export function NewProposalForm(props: { aiEnabled: boolean; businessName: string; defaultTerms: string }) {
  const [mode, setMode] = useState<Mode>(props.aiEnabled ? "ai" : "paste");
  const [state, action, pending] = useActionState(createProposal, null);
  const [copied, setCopied] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const modes: { value: Mode; label: string; hint: string }[] = [
    ...(props.aiEnabled ? [{ value: "ai" as const, label: "Write it for me", hint: "AI drafts every section and the pricing." }] : []),
    { value: "paste", label: "Draft with Claude", hint: "Copy a prompt into the Claude app, paste the reply back." },
    { value: "blank", label: "Blank template", hint: "Start from the empty sections and write it yourself." },
  ];

  async function copyPrompt() {
    const form = new FormData(formRef.current!);
    const prompt = copyPastePrompt({
      brief: String(form.get("brief") ?? ""),
      clientName: String(form.get("client_name") ?? "the client"),
      clientCompany: String(form.get("client_company") ?? "") || null,
      businessName: props.businessName,
      defaultTerms: props.defaultTerms,
    });
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <form ref={formRef} action={action} className="mt-10 space-y-10">
      <input type="hidden" name="mode" value={mode} />

      <fieldset className="grid gap-5 sm:grid-cols-2" disabled={pending}>
        <legend className="sr-only">Client</legend>
        <div className="space-y-2">
          <Label htmlFor="client_name">Client name</Label>
          <Input id="client_name" name="client_name" required className="h-10" placeholder="Jordan Lee" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client_company">Company (optional)</Label>
          <Input id="client_company" name="client_company" className="h-10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="client_email">Client email (optional)</Label>
          <Input id="client_email" name="client_email" type="email" className="h-10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expires_days">Valid for</Label>
          <select
            id="expires_days"
            name="expires_days"
            defaultValue="30"
            className="h-10 w-full rounded-sm border border-input bg-transparent px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring"
          >
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
          </select>
        </div>
      </fieldset>

      <div className="space-y-2">
        <Label htmlFor="brief">The job, in a paragraph</Label>
        <Textarea
          id="brief"
          name="brief"
          rows={7}
          disabled={pending}
          className="text-base leading-relaxed"
          placeholder="Northwind is a 12-person bakery chain whose website can't take online orders. They want pre-orders for pickup, live in 6 weeks. We'll design and build it on Shopify, migrate their menu, and train two staff. Budget is $8,500."
        />
      </div>

      <fieldset className="space-y-3" disabled={pending}>
        <legend className="text-sm font-medium">How should we start?</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {modes.map((m) => (
            <label
              key={m.value}
              className="cursor-pointer rounded-sm border border-rule p-4 transition-colors duration-150 hover:border-ink-muted has-checked:border-ink has-checked:bg-surface has-focus-visible:outline-2 has-focus-visible:outline-ring"
            >
              <input type="radio" name="_mode" value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)} className="sr-only" />
              <span className="block font-medium">{m.label}</span>
              <span className="mt-1 block text-sm text-ink-muted">{m.hint}</span>
            </label>
          ))}
        </div>
        {!props.aiEnabled && (
          <p className="text-sm text-ink-muted">One-click writing turns on once an AI key is added (see the README).</p>
        )}
      </fieldset>

      {mode === "paste" && (
        <div className="space-y-4 border-t border-rule pt-8">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" className="h-10 px-4" onClick={copyPrompt}>
              {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
              {copied ? "Prompt copied" : "Copy prompt"}
            </Button>
            <a
              href="https://claude.ai/new"
              target="_blank"
              rel="noreferrer"
              className="text-sm underline underline-offset-4 hover:text-brand focus-visible:outline-2 focus-visible:outline-ring"
            >
              Open Claude in a new tab
            </a>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pasted">Paste Claude&apos;s reply</Label>
            <Textarea id="pasted" name="pasted" rows={8} disabled={pending} className="font-mono text-xs" placeholder={"```json\n{ \"title\": … }\n```"} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-rule pt-6">
        <Button type="submit" className={cn("h-11 px-5")} disabled={pending}>
          {mode === "ai" && <Sparkles aria-hidden />}
          {pending ? (mode === "ai" ? "Writing your proposal…" : "Creating…") : mode === "ai" ? "Write the proposal" : "Create proposal"}
        </Button>
        {pending && mode === "ai" && (
          <p role="status" className="text-sm text-ink-muted">
            This usually takes 20–60 seconds.
          </p>
        )}
        {state && !state.ok && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
      </div>
    </form>
  );
}

"use client";

import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { cn } from "@/lib/utils";

type Props = {
  token: string;
  contentHash: string;
  defaultName: string;
  defaultEmail: string;
  onSigned: (name: string, signedAt: string) => void;
};

const input =
  "h-12 w-full rounded-sm border border-input bg-surface px-3 text-base text-ink transition-colors duration-150 placeholder:text-ink-muted/70 hover:border-ink-muted focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-ring/40 aria-invalid:border-destructive";

export function SignForm({ token, contentHash, defaultName, defaultEmail, onSigned }: Props) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [method, setMethod] = useState<"typed" | "drawn">("typed");
  const [agree, setAgree] = useState(false);
  const [drawn, setDrawn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const pad = useRef<SignatureCanvas>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("Please type your full name.");
    if (method === "drawn" && (!pad.current || pad.current.isEmpty())) return setError("Please draw your signature, or switch to typing it.");
    if (!agree) return setError("Please tick the box to confirm you agree.");

    setSubmitting(true);
    try {
      const res = await fetch(`/api/p/${token}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          method,
          image_data: method === "drawn" ? pad.current!.getTrimmedCanvas().toDataURL("image/png") : null,
          agree,
          content_hash: contentHash,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't record your signature.");
      onSigned(name.trim(), data.signed_at);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't record your signature.");
      setSubmitting(false);
    }
  }

  const tab = (value: "typed" | "drawn", label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={method === value}
      onClick={() => setMethod(value)}
      className="h-11 border-b-2 border-transparent px-1 text-sm text-ink-muted transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-ring aria-selected:border-brand aria-selected:font-semibold aria-selected:text-ink"
    >
      {label}
    </button>
  );

  return (
    <form onSubmit={submit} className="mt-8 max-w-xl space-y-6" noValidate>
      <p className="max-w-[60ch] text-lg leading-relaxed">
        If this looks right, sign below. You&apos;ll pay on the next step, and you can download a signed copy any time.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-sm font-medium">Full name</span>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-medium">Email</span>
          <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        </label>
      </div>

      <div>
        <div role="tablist" aria-label="Signature method" className="flex gap-6 border-b border-rule">
          {tab("typed", "Type")}
          {tab("drawn", "Draw")}
        </div>
        <div className="mt-4">
          {method === "typed" ? (
            <div className="flex h-36 items-end border-b border-ink px-2 pb-3" aria-label="Signature preview">
              <span className={cn("font-display text-5xl italic font-light leading-none", !name.trim() && "text-ink-muted/50")}>
                {name.trim() || "Your name"}
              </span>
            </div>
          ) : (
            <div className="relative">
              <SignatureCanvas
                ref={pad}
                penColor="#1c1a17"
                onEnd={() => setDrawn(true)}
                canvasProps={{
                  className: "h-36 w-full touch-none rounded-sm border border-input bg-surface",
                  "aria-label": "Draw your signature",
                }}
              />
              {drawn && (
                <button
                  type="button"
                  onClick={() => {
                    pad.current?.clear();
                    setDrawn(false);
                  }}
                  className="absolute top-2 right-2 rounded-sm px-2 py-1 text-sm text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-ring"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-1 size-5 shrink-0 accent-[var(--accent-brand)]"
        />
        <span className="text-sm leading-relaxed text-ink-muted">
          I agree to this proposal and its terms, and I understand my typed or drawn signature is legally binding, the same as
          a handwritten one.
        </span>
      </label>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex h-12 w-full items-center justify-center rounded-sm bg-brand px-6 font-semibold text-brand-contrast transition-[transform,background-color] duration-150 hover:bg-brand/90 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:w-auto"
      >
        {submitting ? "Signing…" : "Sign proposal"}
      </button>
    </form>
  );
}

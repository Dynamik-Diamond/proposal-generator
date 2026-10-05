"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Download, Lock } from "lucide-react";
import { SignForm } from "./sign-form";

const Celebration = dynamic(() => import("./celebration").then((m) => m.Celebration), { ssr: false });

export type Stage = "draft" | "expired" | "sign" | "pay" | "paid";

type Props = {
  token: string;
  contentHash: string;
  initialStage: Stage;
  isOwner: boolean;
  clientName: string;
  clientEmail: string;
  businessName: string;
  totalLabel: string;
  signature: { name: string; signedAt: string } | null;
  returnedFromPayment: boolean;
  sessionId: string | null;
};

const btnBase =
  "inline-flex h-12 items-center justify-center gap-2 rounded-sm px-6 font-semibold transition-[transform,background-color] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const btn = `${btnBase} bg-brand text-brand-contrast hover:bg-brand/90`;
const btnOutline = `${btnBase} border border-ink text-ink hover:bg-ink/5`;

export function ClientFlow(props: Props) {
  const [stage, setStage] = useState<Stage>(props.initialStage);
  const [signature, setSignature] = useState(props.signature);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(props.returnedFromPayment && props.initialStage === "pay");
  const [celebrate, setCelebrate] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Record a client view (the server ignores the owner and drafts).
  useEffect(() => {
    if (!props.isOwner) fetch(`/api/p/${props.token}/view`, { method: "POST" }).catch(() => {});
  }, [props.isOwner, props.token]);

  // Back from Stripe: wait for the payment to be confirmed, then celebrate.
  useEffect(() => {
    if (!props.returnedFromPayment) return;
    if (props.initialStage === "paid") {
      setCelebrate(true);
      return;
    }
    if (props.initialStage !== "pay") return;
    let tries = 0;
    let cancelled = false;
    const qs = props.sessionId ? `?session_id=${encodeURIComponent(props.sessionId)}` : "";
    const poll = async () => {
      if (cancelled) return;
      tries += 1;
      try {
        const res = await fetch(`/api/p/${props.token}/status${qs}`, { cache: "no-store" });
        const data = await res.json();
        if (data.status === "paid") {
          setStage("paid");
          setConfirming(false);
          setCelebrate(true);
          return;
        }
      } catch {}
      if (tries < 20) setTimeout(poll, 1500);
      else setConfirming(false);
    };
    poll();
    return () => {
      cancelled = true;
    };
  }, [props.returnedFromPayment, props.initialStage, props.sessionId, props.token]);

  async function pay() {
    setPaying(true);
    setError("");
    try {
      const res = await fetch(`/api/p/${props.token}/checkout`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Couldn't start the payment.");
      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't start the payment.");
      setPaying(false);
    }
  }

  const firstName = (signature?.name ?? props.clientName).split(" ")[0];
  const pdfHref = `/api/p/${props.token}/pdf`;

  return (
    <div>
      <h2 ref={headingRef} tabIndex={-1} className="font-display text-[1.75rem] leading-[1.1] tracking-[-0.01em] outline-none sm:text-[2.25rem]">
        {stage === "paid" ? "All set" : stage === "pay" ? "Signed. One last step." : "Accept & sign"}
      </h2>

      {stage === "draft" && (
        <p className="mt-6 max-w-[60ch] text-ink-muted">
          This is where your client will sign and pay. Copy or email the link from the editor to open it up.
        </p>
      )}

      {stage === "expired" && (
        <p className="mt-6 max-w-[60ch] text-lg leading-relaxed">
          This proposal has expired. Please get in touch with {props.businessName || "the sender"} for an updated version.
        </p>
      )}

      {stage === "sign" &&
        (props.isOwner ? (
          <div className="mt-6 max-w-[60ch] space-y-3 text-ink-muted">
            <p>
              You&apos;re viewing this as the owner, so the sign and pay steps are hidden. Your client sees a sign form here, then a{" "}
              <span className="text-ink">Pay {props.totalLabel}</span> button that opens secure Stripe checkout.
            </p>
            <p>To try it yourself, open the client link in a private or incognito window.</p>
          </div>
        ) : (
          <SignForm
            token={props.token}
            contentHash={props.contentHash}
            defaultName={props.clientName}
            defaultEmail={props.clientEmail}
            onSigned={(name, signedAt) => {
              setSignature({ name, signedAt });
              setStage("pay");
              requestAnimationFrame(() => headingRef.current?.focus());
            }}
          />
        ))}

      {stage === "pay" && (
        <div className="mt-6 max-w-[60ch]">
          <p className="text-lg leading-relaxed">
            Thank you, {firstName}. Your signature is recorded
            {signature ? ` (${new Date(signature.signedAt).toLocaleDateString("en-US", { dateStyle: "long" })})` : ""}. Payment
            confirms the booking.
          </p>
          {confirming ? (
            <p role="status" className="mt-8 flex items-center gap-3 text-ink-muted">
              <span className="size-4 animate-spin rounded-full border-2 border-rule border-t-brand" aria-hidden />
              Confirming your payment…
            </p>
          ) : props.isOwner ? (
            <p className="mt-8 text-ink-muted">Waiting for your client to pay {props.totalLabel}.</p>
          ) : (
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <button type="button" className={btn} onClick={pay} disabled={paying}>
                <Lock aria-hidden className="size-4" />
                {paying ? "Opening secure checkout…" : `Pay ${props.totalLabel}`}
              </button>
              <a href={pdfHref} className="text-sm underline underline-offset-4 hover:text-brand focus-visible:outline-2 focus-visible:outline-ring">
                Download signed copy
              </a>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-4 text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      )}

      {stage === "paid" && (
        <div className="mt-6 max-w-[60ch]">
          <p className="text-lg leading-relaxed">
            Signed and paid ({props.totalLabel}). {props.businessName || "We"} will be in touch about next steps. A receipt is on its way to your inbox.
          </p>
          <a href={pdfHref} className={`${btnOutline} mt-8`}>
            <Download aria-hidden className="size-4" /> Download signed proposal (PDF)
          </a>
        </div>
      )}

      {celebrate && <Celebration firstName={firstName} pdfHref={pdfHref} onClose={() => setCelebrate(false)} />}
    </div>
  );
}

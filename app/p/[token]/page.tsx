import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProposalDocument } from "@/components/proposal-document";
import { loadByToken } from "@/lib/public";
import { createClient } from "@/lib/supabase/server";
import { canSign, isExpired } from "@/lib/status";
import { formatMoney } from "@/lib/pricing";
import { contentHash } from "@/lib/tokens";
import { ClientFlow, type Stage } from "./client-flow";
import { StickySignBar } from "./sticky-sign-bar";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ paid?: string; session_id?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const loaded = await loadByToken((await params).token);
  if (!loaded) return { title: "Proposal" };
  return {
    title: { absolute: `${loaded.proposal.title} · ${loaded.profile.business_name || "Proposal"}` },
    description: `Proposal for ${loaded.proposal.client_name}`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicProposalPage({ params, searchParams }: Props) {
  const { token } = await params;
  const { paid, session_id } = await searchParams;
  const loaded = await loadByToken(token);
  if (!loaded) notFound();
  const { proposal, profile, signature } = loaded;

  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  const isOwner = user?.id === proposal.user_id;

  const accent = profile.brand_accent === "forest" ? "" : `accent-${profile.brand_accent}`;

  if (proposal.status === "draft" && !isOwner) {
    return (
      <main className={`paper ${accent} grid min-h-dvh place-items-center bg-paper px-4 text-ink`}>
        <div className="max-w-md text-center">
          <h1 className="font-display text-3xl">This proposal isn&apos;t ready yet</h1>
          <p className="mt-3 text-ink-muted">It&apos;s still being finalised. Check back with the sender for the latest link.</p>
        </div>
      </main>
    );
  }

  const stage: Stage =
    proposal.status === "paid"
      ? "paid"
      : proposal.status === "signed"
        ? "pay"
        : isExpired(proposal)
          ? "expired"
          : proposal.status === "draft"
            ? "draft"
            : "sign";

  const sectionCount = proposal.content.filter((s) => s.body.trim() || s.key === "investment_note").length;

  return (
    <div className={`paper ${accent} min-h-dvh bg-paper text-ink`}>
      {isOwner && (
        <div className="border-b border-rule bg-surface px-4 py-2 text-center text-sm text-ink-muted">
          You&apos;re previewing as the owner{proposal.status === "draft" ? ". Clients can't open drafts until you copy or email the link." : ". Your visits aren't counted as client views."}
        </div>
      )}
      <main className="mx-auto max-w-5xl px-4 pb-32 sm:px-8">
        <ProposalDocument
          doc={{
            ...proposal,
            business_name: profile.business_name,
            logo_url: profile.logo_url,
          }}
        />
        <section id="accept" className="grid scroll-mt-8 gap-4 border-t border-ink py-12 sm:py-16 md:grid-cols-[8rem_1fr] md:gap-10">
          <p className="font-display text-sm text-ink-muted tabular-nums md:pt-2">{String(sectionCount + 1).padStart(2, "0")}</p>
          <ClientFlow
            token={token}
            contentHash={contentHash(proposal)}
            initialStage={stage}
            isOwner={isOwner}
            clientName={proposal.client_name}
            clientEmail={proposal.client_email ?? ""}
            businessName={profile.business_name}
            totalLabel={formatMoney(proposal.total_cents, proposal.currency)}
            signature={signature ? { name: signature.signer_name, signedAt: signature.signed_at } : null}
            returnedFromPayment={paid === "1"}
            sessionId={session_id ?? null}
          />
        </section>
        <footer className="border-t border-rule pt-6 text-sm text-ink-muted">
          {profile.business_name ? `${profile.business_name} · ` : ""}Payments are processed securely by Stripe.
        </footer>
      </main>
      {canSign(proposal) && !isOwner && <StickySignBar label={`Review & sign · ${formatMoney(proposal.total_cents, proposal.currency)}`} />}
    </div>
  );
}

import "server-only";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendMail } from "@/lib/email";
import { formatMoney } from "@/lib/pricing";
import { appUrl } from "@/lib/env";
import { ownerEmail } from "@/lib/public";

/**
 * Mark a proposal paid from a verified, completed Stripe Checkout Session.
 * Idempotent: only the first call for a signed proposal changes anything.
 */
export async function markPaidFromSession(session: Stripe.Checkout.Session): Promise<boolean> {
  const proposalId = session.metadata?.proposal_id;
  if (!proposalId || session.payment_status !== "paid") return false;

  const db = createAdminClient();
  const { data: proposal } = await db.from("proposals").select("id,user_id,title,client_name,total_cents,currency").eq("id", proposalId).maybeSingle();
  if (!proposal) return false;
  if (session.amount_total !== proposal.total_cents || session.currency !== proposal.currency) {
    console.error(`Stripe amount mismatch for proposal ${proposalId}: ${session.amount_total} ${session.currency}`);
    return false;
  }

  const paidAt = new Date().toISOString();
  const { data: updated } = await db
    .from("proposals")
    .update({ status: "paid", paid_at: paidAt })
    .eq("id", proposalId)
    .eq("status", "signed")
    .select("id");
  if (!updated?.length) return false; // already paid (or not signed)

  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);
  await Promise.all([
    db
      .from("payments")
      .update({ status: "paid", paid_at: paidAt, payment_intent_id: paymentIntent })
      .eq("stripe_session_id", session.id),
    db.from("proposal_events").insert({ proposal_id: proposalId, type: "paid" }),
  ]);

  const { data: profile } = await db.from("profiles").select("notify_email").eq("user_id", proposal.user_id).maybeSingle();
  const to = await ownerEmail(db, proposal.user_id, profile?.notify_email ?? null);
  if (to) {
    await sendMail({
      to,
      subject: `Paid: ${proposal.title} (${formatMoney(proposal.total_cents, proposal.currency)})`,
      text: `${proposal.client_name} just paid ${formatMoney(proposal.total_cents, proposal.currency)} for "${proposal.title}".\n\n${appUrl()}/proposals/${proposal.id}/edit\n`,
    });
  }
  return true;
}

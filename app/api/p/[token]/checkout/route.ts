import { NextResponse } from "next/server";
import { loadByToken } from "@/lib/public";
import { canPay } from "@/lib/status";
import { getStripe } from "@/lib/stripe";
import { rateLimit, requestMeta } from "@/lib/request";
import { appUrl } from "@/lib/env";
import { TOO_MANY, jsonError } from "@/lib/api";

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const meta = await requestMeta();
  if (!rateLimit(`checkout:${meta.ip}`, 10, 60_000)) return TOO_MANY();

  const loaded = await loadByToken(token);
  if (!loaded) return jsonError("Not found", 404);
  const { db, proposal, profile, signature } = loaded;
  if (proposal.status === "paid") return jsonError("This proposal is already paid.", 409);
  if (!canPay(proposal)) return jsonError("Please sign the proposal before paying.", 409);
  if (proposal.total_cents < 50) return jsonError("This proposal has no amount to pay.", 409);

  const base = `${appUrl()}/p/${token}`;
  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: signature?.signer_email ?? proposal.client_email ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: proposal.currency,
          unit_amount: proposal.total_cents, // from the database, never from the client
          product_data: {
            name: proposal.title,
            description: profile.business_name ? `Proposal from ${profile.business_name}` : undefined,
          },
        },
      },
    ],
    metadata: { proposal_id: proposal.id },
    payment_intent_data: { metadata: { proposal_id: proposal.id } },
    success_url: `${base}?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: base,
  });

  await db.from("payments").insert({
    proposal_id: proposal.id,
    stripe_session_id: session.id,
    amount_cents: proposal.total_cents,
    currency: proposal.currency,
  });
  return NextResponse.json({ url: session.url });
}

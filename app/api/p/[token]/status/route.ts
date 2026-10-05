import { NextResponse, type NextRequest } from "next/server";
import { loadByToken } from "@/lib/public";
import { getStripe } from "@/lib/stripe";
import { markPaidFromSession } from "@/lib/payments";
import { rateLimit, requestMeta } from "@/lib/request";
import { TOO_MANY, jsonError } from "@/lib/api";

/** Polled after returning from Stripe. Also confirms the session directly, so payment shows even if the webhook is late. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const meta = await requestMeta();
  if (!rateLimit(`status:${meta.ip}`, 60, 60_000)) return TOO_MANY();

  const loaded = await loadByToken(token);
  if (!loaded) return jsonError("Not found", 404);
  let status = loaded.proposal.status;

  const sessionId = req.nextUrl.searchParams.get("session_id");
  if (status === "signed" && sessionId && /^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);
    if (session.metadata?.proposal_id === loaded.proposal.id && (await markPaidFromSession(session))) status = "paid";
  }
  return NextResponse.json({ status });
}

import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { markPaidFromSession } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireEnv } from "@/lib/env";

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await req.text(), signature, requireEnv("STRIPE_WEBHOOK_SECRET"));
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Skip events already processed. Processing is idempotent too, so a failure before
  // recording the id just means Stripe's retry runs it again safely.
  const db = createAdminClient();
  const { data: seen } = await db.from("stripe_events").select("id").eq("id", event.id).maybeSingle();
  if (seen) return NextResponse.json({ received: true, duplicate: true });

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    await markPaidFromSession(event.data.object);
  }
  await db.from("stripe_events").upsert({ id: event.id }, { ignoreDuplicates: true });
  return NextResponse.json({ received: true });
}

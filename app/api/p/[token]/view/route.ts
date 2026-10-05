import { NextResponse } from "next/server";
import { loadByToken, ownerEmail } from "@/lib/public";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, requestMeta } from "@/lib/request";
import { sendMail } from "@/lib/email";
import { appUrl } from "@/lib/env";
import { TOO_MANY, jsonError } from "@/lib/api";

const NOTIFY_EVERY_MS = 60 * 60 * 1000;

export async function POST(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const meta = await requestMeta();
  if (!rateLimit(`view:${meta.ip}`, 30, 60_000)) return TOO_MANY();

  const loaded = await loadByToken(token);
  if (!loaded) return jsonError("Not found", 404);
  const { db, proposal, profile } = loaded;
  if (proposal.status === "draft") return NextResponse.json({ ok: true });

  // The owner previewing their own proposal is not a client view.
  const {
    data: { user },
  } = await (await createClient()).auth.getUser();
  if (user?.id === proposal.user_id) return NextResponse.json({ ok: true, owner: true });

  const now = new Date();
  const { data: last } = await db
    .from("proposal_events")
    .select("created_at")
    .eq("proposal_id", proposal.id)
    .eq("type", "viewed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  await db
    .from("proposals")
    .update({ viewed_at: now.toISOString(), ...(proposal.status === "sent" ? { status: "viewed" } : {}) })
    .eq("id", proposal.id);

  const recent = last && now.getTime() - new Date(last.created_at).getTime() < NOTIFY_EVERY_MS;
  if (!recent) {
    await db.from("proposal_events").insert({ proposal_id: proposal.id, type: "viewed", ip: meta.ip, user_agent: meta.userAgent });
    const to = await ownerEmail(db, proposal.user_id, profile.notify_email);
    if (to) {
      await sendMail({
        to,
        subject: `${proposal.client_name} is reading "${proposal.title}"`,
        text: `${proposal.client_name} just opened your proposal.\n\n${appUrl()}/proposals/${proposal.id}/edit\n`,
      });
    }
  }
  return NextResponse.json({ ok: true });
}

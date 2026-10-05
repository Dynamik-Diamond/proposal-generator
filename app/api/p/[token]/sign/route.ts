import { NextResponse } from "next/server";
import { z } from "zod";
import { loadByToken, ownerEmail } from "@/lib/public";
import { canSign } from "@/lib/status";
import { contentHash } from "@/lib/tokens";
import { rateLimit, requestMeta } from "@/lib/request";
import { sendMail } from "@/lib/email";
import { appUrl } from "@/lib/env";
import { TOO_MANY, jsonError } from "@/lib/api";

const SignBody = z.object({
  name: z.string().trim().min(2).max(200),
  email: z.email().max(300),
  method: z.enum(["typed", "drawn"]),
  image_data: z
    .string()
    .max(400_000)
    .regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/)
    .nullable()
    .optional(),
  agree: z.literal(true),
  content_hash: z.string().regex(/^[a-f0-9]{64}$/),
});

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const meta = await requestMeta();
  if (!rateLimit(`sign:${meta.ip}`, 10, 60_000)) return TOO_MANY();

  const parsed = SignBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Please add your full name, a valid email, and tick the box to agree.");
  const body = parsed.data;
  if (body.method === "drawn" && !body.image_data) return jsonError("Please draw your signature, or switch to typing it.");

  const loaded = await loadByToken(token);
  if (!loaded) return jsonError("Not found", 404);
  const { db, proposal, profile } = loaded;
  if (!canSign(proposal)) {
    return jsonError(proposal.status === "signed" || proposal.status === "paid" ? "This proposal has already been signed." : "This proposal can't be signed right now.", 409);
  }

  // The client must sign exactly the version they read; reject if the owner edited it since.
  const hash = contentHash(proposal);
  if (hash !== body.content_hash) {
    return jsonError("This proposal was updated while you had it open. Please refresh the page to review the latest version.", 409);
  }
  const { error: sigError } = await db.from("signatures").insert({
    proposal_id: proposal.id,
    signer_name: body.name,
    signer_email: body.email,
    method: body.method,
    image_data: body.method === "drawn" ? body.image_data : null,
    ip: meta.ip,
    user_agent: meta.userAgent,
    content_hash: hash,
  });
  if (sigError) return jsonError("This proposal has already been signed.", 409);

  const signedAt = new Date().toISOString();
  await Promise.all([
    db.from("proposals").update({ status: "signed", signed_at: signedAt }).eq("id", proposal.id).in("status", ["sent", "viewed"]),
    db.from("proposal_events").insert({ proposal_id: proposal.id, type: "signed", ip: meta.ip, user_agent: meta.userAgent }),
  ]);

  const to = await ownerEmail(db, proposal.user_id, profile.notify_email);
  if (to) {
    await sendMail({
      to,
      subject: `Signed: ${proposal.title}`,
      text: `${body.name} (${body.email}) signed "${proposal.title}". Payment is the next step for them.\n\n${appUrl()}/proposals/${proposal.id}/edit\n`,
    });
  }
  return NextResponse.json({ ok: true, signed_at: signedAt });
}

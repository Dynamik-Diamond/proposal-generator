import { loadByToken } from "@/lib/public";
import { renderSignedPdf } from "@/lib/pdf";
import { rateLimit, requestMeta } from "@/lib/request";
import { TOO_MANY, jsonError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const meta = await requestMeta();
  if (!rateLimit(`pdf:${meta.ip}`, 20, 60_000)) return TOO_MANY();

  const loaded = await loadByToken(token);
  if (!loaded) return jsonError("Not found", 404);
  const { db, proposal, profile, signature } = loaded;
  if (!signature) return jsonError("This proposal hasn't been signed yet.", 409);

  const { data: events } = await db
    .from("proposal_events")
    .select("type,created_at,ip,user_agent")
    .eq("proposal_id", proposal.id)
    .order("created_at", { ascending: true });

  const pdf = await renderSignedPdf({ proposal, businessName: profile.business_name, signature, events: events ?? [] });
  const filename = `${proposal.title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-") || "proposal"}-signed.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

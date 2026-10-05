import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isWellFormedToken } from "@/lib/tokens";
import type { Profile, Proposal } from "@/lib/types";

export type SignatureRow = {
  signer_name: string;
  signer_email: string;
  method: "typed" | "drawn";
  image_data: string | null;
  ip: string | null;
  user_agent: string | null;
  content_hash: string;
  signed_at: string;
};

/** Load a proposal by its public token with the service role. Callers decide which fields reach the client. */
export async function loadByToken(token: string) {
  if (!isWellFormedToken(token)) return null;
  const db = createAdminClient();
  const { data } = await db.from("proposals").select("*").eq("public_token", token).maybeSingle();
  if (!data) return null;
  const proposal = data as Proposal;
  const [{ data: profile }, { data: signature }] = await Promise.all([
    db.from("profiles").select("business_name,notify_email,logo_url,brand_accent").eq("user_id", proposal.user_id).maybeSingle(),
    db.from("signatures").select("*").eq("proposal_id", proposal.id).maybeSingle(),
  ]);
  return {
    db,
    proposal,
    profile: (profile ?? { business_name: "", notify_email: null, logo_url: null, brand_accent: "forest" }) as Pick<
      Profile,
      "business_name" | "notify_email" | "logo_url" | "brand_accent"
    >,
    signature: signature as SignatureRow | null,
  };
}

export async function ownerEmail(db: ReturnType<typeof createAdminClient>, userId: string, notifyEmail: string | null) {
  if (notifyEmail) return notifyEmail;
  const { data } = await db.auth.admin.getUserById(userId);
  return data.user?.email ?? null;
}

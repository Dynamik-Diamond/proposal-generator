"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/server";
import { generateProposal, regenerateSection } from "@/lib/ai";
import { parseDraftReply, type ProposalDraft } from "@/lib/ai/schema";
import { blankSections, TEMPLATE_SECTIONS } from "@/lib/template";
import { proposalTotal, sanitizeLineItems } from "@/lib/pricing";
import { canEdit } from "@/lib/status";
import { newPublicToken } from "@/lib/tokens";
import { appUrl } from "@/lib/env";
import { sendMail } from "@/lib/email";
import type { LineItem, Profile, Proposal, Section } from "@/lib/types";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function loadProfile(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], userId: string) {
  const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  return (data ?? { business_name: "", default_terms: "" }) as Pick<Profile, "business_name" | "default_terms">;
}

async function loadOwned(id: string) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase.from("proposals").select("*").eq("id", id).single();
  if (error || !data) throw new Error("Proposal not found");
  return { supabase, user, proposal: data as Proposal };
}

/** Force AI/pasted output into the template's section order. */
function normalizeSections(sections: Section[]): Section[] {
  return TEMPLATE_SECTIONS.map((t, i) => {
    const match = sections.find((s) => s.key === t.key) ?? sections[i];
    return { key: t.key, heading: t.heading, body: (match?.body ?? "").trim() };
  });
}

function clean(value: FormDataEntryValue | null, max = 300): string {
  return String(value ?? "").trim().slice(0, max);
}

export async function createProposal(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const mode = clean(form.get("mode"), 10) as "ai" | "blank" | "paste";
  const clientName = clean(form.get("client_name"));
  const clientCompany = clean(form.get("client_company")) || null;
  const clientEmail = clean(form.get("client_email")) || null;
  const brief = clean(form.get("brief"), 8000);
  const expiresDays = Number(form.get("expires_days")) || 30;

  if (!clientName) return { ok: false, error: "Add the client's name." };
  if (mode === "ai" && brief.length < 20) return { ok: false, error: "Describe the job in a few sentences first." };

  const profile = await loadProfile(supabase, user.id);
  let draft: ProposalDraft;
  try {
    if (mode === "ai") {
      draft = await generateProposal({
        brief,
        clientName,
        clientCompany,
        businessName: profile.business_name,
        defaultTerms: profile.default_terms,
      });
    } else if (mode === "paste") {
      draft = parseDraftReply(String(form.get("pasted") ?? ""));
    } else {
      draft = { title: `Proposal for ${clientCompany ?? clientName}`, sections: blankSections(profile.default_terms), line_items: [] };
    }
  } catch (err) {
    console.error("Draft generation failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't draft the proposal. Please try again." };
  }

  const lineItems = sanitizeLineItems(draft.line_items);
  const { data, error } = await supabase
    .from("proposals")
    .insert({
      user_id: user.id,
      public_token: newPublicToken(),
      title: draft.title.slice(0, 200) || `Proposal for ${clientName}`,
      client_name: clientName,
      client_email: clientEmail,
      client_company: clientCompany,
      brief,
      content: normalizeSections(draft.sections),
      line_items: lineItems,
      total_cents: proposalTotal(lineItems),
      expires_at: new Date(Date.now() + Math.min(Math.max(expiresDays, 1), 365) * 86_400_000).toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "Couldn't save the proposal." };

  await supabase.from("proposal_events").insert({ proposal_id: data.id, type: "created" });
  redirect(`/proposals/${data.id}/edit`);
}

export type ProposalPatch = {
  title: string;
  client_name: string;
  client_email: string | null;
  client_company: string | null;
  content: Section[];
  line_items: LineItem[];
  expires_at: string | null;
};

export async function saveProposal(id: string, patch: ProposalPatch): Promise<ActionResult> {
  const { supabase, proposal } = await loadOwned(id);
  if (!canEdit(proposal)) return { ok: false, error: "This proposal is signed and can no longer be edited." };
  if (!patch.title.trim() || !patch.client_name.trim()) return { ok: false, error: "Title and client name are required." };

  const lineItems = sanitizeLineItems(patch.line_items);
  const content = normalizeSections(
    patch.content.map((s) => ({ key: String(s.key), heading: String(s.heading), body: String(s.body).slice(0, 20_000) })),
  );
  const { error } = await supabase
    .from("proposals")
    .update({
      title: patch.title.trim().slice(0, 200),
      client_name: patch.client_name.trim().slice(0, 300),
      client_email: patch.client_email?.trim().slice(0, 300) || null,
      client_company: patch.client_company?.trim().slice(0, 300) || null,
      content,
      line_items: lineItems,
      total_cents: proposalTotal(lineItems),
      expires_at: patch.expires_at ? new Date(patch.expires_at).toISOString() : null,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "Couldn't save changes." };
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function regenerateSectionAction(
  id: string,
  sectionKey: string,
  currentSections: Section[],
  instruction: string,
): Promise<{ ok: true; body: string } | { ok: false; error: string }> {
  const { supabase, user, proposal } = await loadOwned(id);
  if (!canEdit(proposal)) return { ok: false, error: "This proposal is signed." };
  const profile = await loadProfile(supabase, user.id);
  const current = currentSections.find((s) => s.key === sectionKey);
  try {
    const body = await regenerateSection({
      input: {
        brief: proposal.brief,
        clientName: proposal.client_name,
        clientCompany: proposal.client_company,
        businessName: profile.business_name,
      },
      sectionKey,
      currentBody: current?.body ?? "",
      otherSections: currentSections
        .filter((s) => s.key !== sectionKey)
        .map((s) => `## ${s.heading}\n${s.body}`)
        .join("\n\n"),
      instruction: instruction.slice(0, 1000),
    });
    return { ok: true, body };
  } catch (err) {
    console.error("Section regeneration failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Couldn't rewrite that section." };
  }
}

async function markSentIfDraft(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"], proposal: Proposal) {
  if (proposal.status !== "draft") return;
  await supabase.from("proposals").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", proposal.id);
  await supabase.from("proposal_events").insert({ proposal_id: proposal.id, type: "sent" });
}

export async function publishProposal(id: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { supabase, proposal } = await loadOwned(id);
  if (proposal.line_items.length === 0) return { ok: false, error: "Add at least one priced line item before sending." };
  await markSentIfDraft(supabase, proposal);
  revalidatePath("/dashboard");
  return { ok: true, url: `${appUrl()}/p/${proposal.public_token}` };
}

export async function emailProposal(id: string): Promise<ActionResult> {
  const { supabase, user, proposal } = await loadOwned(id);
  if (!proposal.client_email) return { ok: false, error: "Add the client's email first." };
  if (proposal.line_items.length === 0) return { ok: false, error: "Add at least one priced line item before sending." };
  const profile = await loadProfile(supabase, user.id);
  const from = profile.business_name || "us";
  await sendMail({
    to: proposal.client_email,
    subject: `${proposal.title} — proposal from ${from}`,
    text: `Hi ${proposal.client_name},\n\nHere is your proposal from ${from}. You can read it, sign it and pay online:\n\n${appUrl()}/p/${proposal.public_token}\n\nAny questions, just reply to this email.\n`,
  });
  await markSentIfDraft(supabase, proposal);
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function duplicateProposal(id: string): Promise<void> {
  const { supabase, user, proposal } = await loadOwned(id);
  const { data, error } = await supabase
    .from("proposals")
    .insert({
      user_id: user.id,
      public_token: newPublicToken(),
      title: `${proposal.title} (copy)`.slice(0, 200),
      client_name: proposal.client_name,
      client_email: proposal.client_email,
      client_company: proposal.client_company,
      brief: proposal.brief,
      content: proposal.content,
      line_items: proposal.line_items,
      total_cents: proposal.total_cents,
      currency: proposal.currency,
      expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) throw new Error("Couldn't duplicate the proposal.");
  await supabase.from("proposal_events").insert({ proposal_id: data.id, type: "created" });
  redirect(`/proposals/${data.id}/edit`);
}

export async function deleteProposal(id: string): Promise<void> {
  const { supabase, proposal } = await loadOwned(id);
  if (proposal.status === "paid") throw new Error("Paid proposals can't be deleted.");
  await supabase.from("proposals").delete().eq("id", id);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/supabase/server";
import { isAiEnabled } from "@/lib/ai";
import { NewProposalForm } from "./new-proposal-form";

export const metadata: Metadata = { title: "New proposal" };
// Generation with a large model can take a minute or two.
export const maxDuration = 300;

export default async function NewProposalPage() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("profiles").select("business_name,default_terms").eq("user_id", user.id).maybeSingle();

  return (
    <>
      <AppHeader current="proposals" />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-4xl tracking-[-0.01em]">New proposal</h1>
        <p className="mt-2 max-w-[60ch] text-ink-muted">
          Tell us who it&apos;s for and describe the job the way you&apos;d explain it to a colleague: the problem, what you&apos;ll do,
          roughly how long, and the price if you know it.
        </p>
        <NewProposalForm
          aiEnabled={isAiEnabled()}
          businessName={data?.business_name ?? ""}
          defaultTerms={data?.default_terms ?? ""}
        />
      </main>
    </>
  );
}

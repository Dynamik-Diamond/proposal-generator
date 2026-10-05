import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/supabase/server";
import { isAiEnabled } from "@/lib/ai";
import { appUrl } from "@/lib/env";
import { Editor } from "./editor";
import type { Proposal } from "@/lib/types";

export const metadata: Metadata = { title: "Edit proposal" };
export const maxDuration = 120;

export type EventRow = { type: string; created_at: string; ip: string | null };

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data } = await supabase.from("proposals").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const proposal = data as Proposal;

  const [{ data: events }, { data: signature }] = await Promise.all([
    supabase.from("proposal_events").select("type,created_at,ip").eq("proposal_id", id).order("created_at", { ascending: false }).limit(50),
    supabase.from("signatures").select("signer_name,signer_email,signed_at").eq("proposal_id", id).maybeSingle(),
  ]);

  return (
    <>
      <AppHeader current="proposals" />
      <Editor
        proposal={proposal}
        events={(events ?? []) as EventRow[]}
        signature={signature as { signer_name: string; signer_email: string; signed_at: string } | null}
        aiEnabled={isAiEnabled()}
        publicUrl={`${appUrl()}/p/${proposal.public_token}`}
      />
    </>
  );
}

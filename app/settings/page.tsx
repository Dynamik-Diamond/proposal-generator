import type { Metadata } from "next";
import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";
import type { Profile } from "@/lib/types";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  const profile = (data ?? {
    user_id: user.id,
    business_name: "",
    notify_email: user.email ?? null,
    logo_url: null,
    default_terms: "",
    brand_accent: "forest",
  }) as Profile;

  return (
    <>
      <AppHeader current="settings" />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-4xl tracking-[-0.01em]">Settings</h1>
        <p className="mt-2 text-ink-muted">How your proposals are signed off and where notifications go.</p>
        <SettingsForm profile={profile} />
      </main>
    </>
  );
}

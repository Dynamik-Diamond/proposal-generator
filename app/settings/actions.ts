"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import { logoToDataUrl } from "@/lib/logo";
import type { ActionResult } from "@/app/proposals/actions";

const ACCENTS = ["forest", "oxblood", "inkblue"];

export async function saveProfile(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const accent = String(form.get("brand_accent"));

  // Logo: a new upload replaces it, "remove" clears it, otherwise it's left unchanged.
  let logo: { logo_url: string | null } | Record<string, never> = {};
  const file = form.get("logo");
  if (form.get("remove_logo") === "on") {
    logo = { logo_url: null };
  } else if (file instanceof File && file.size > 0) {
    const result = await logoToDataUrl(file);
    if (!result.ok) return { ok: false, error: result.error };
    logo = { logo_url: result.dataUrl };
  }

  const { error } = await supabase.from("profiles").upsert({
    user_id: user.id,
    business_name: String(form.get("business_name") ?? "").trim().slice(0, 200),
    notify_email: String(form.get("notify_email") ?? "").trim().slice(0, 300) || null,
    ...logo,
    default_terms: String(form.get("default_terms") ?? "").trim().slice(0, 5000),
    brand_accent: ACCENTS.includes(accent) ? accent : "forest",
  });
  if (error) return { ok: false, error: "Couldn't save settings." };
  revalidatePath("/settings");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/proposals/actions";

const ACCENTS = ["forest", "oxblood", "inkblue"];

export async function saveProfile(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();
  const accent = String(form.get("brand_accent"));
  const logo = String(form.get("logo_url") ?? "").trim();
  if (logo && !/^https:\/\/\S+$/.test(logo)) return { ok: false, error: "Logo URL must start with https://" };

  const { error } = await supabase.from("profiles").upsert({
    user_id: user.id,
    business_name: String(form.get("business_name") ?? "").trim().slice(0, 200),
    notify_email: String(form.get("notify_email") ?? "").trim().slice(0, 300) || null,
    logo_url: logo || null,
    default_terms: String(form.get("default_terms") ?? "").trim().slice(0, 5000),
    brand_accent: ACCENTS.includes(accent) ? accent : "forest",
  });
  if (error) return { ok: false, error: "Couldn't save settings." };
  revalidatePath("/settings");
  return { ok: true };
}

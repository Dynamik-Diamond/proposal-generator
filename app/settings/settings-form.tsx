"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveProfile } from "./actions";
import type { Profile } from "@/lib/types";

const ACCENTS = [
  { value: "forest", label: "Forest", swatch: "bg-[#2f5d46]" },
  { value: "oxblood", label: "Oxblood", swatch: "bg-[#7a2e2a]" },
  { value: "inkblue", label: "Ink blue", swatch: "bg-[#24406b]" },
] as const;

export function SettingsForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(saveProfile, null);

  return (
    <form action={action} className="mt-10 space-y-8">
      {/* Remount the fields when saved values change, so inputs never see their defaultValue change underneath them. */}
      <div key={JSON.stringify(profile)} className="space-y-8">
      <div className="space-y-2">
        <Label htmlFor="business_name">Business name</Label>
        <Input id="business_name" name="business_name" defaultValue={profile.business_name} className="h-10" placeholder="Your studio or name" />
        <p className="text-sm text-ink-muted">Shown on the cover as &ldquo;Prepared by&rdquo;.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="notify_email">Notification email</Label>
        <Input id="notify_email" name="notify_email" type="email" defaultValue={profile.notify_email ?? ""} className="h-10" />
        <p className="text-sm text-ink-muted">We email you here when a client opens, signs or pays.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="logo">Logo (optional)</Label>
        {profile.logo_url && (
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profile.logo_url} alt="Current logo" className="h-10 w-auto max-w-40 object-contain" />
            <label className="flex items-center gap-2 text-sm text-ink-muted">
              <input type="checkbox" name="remove_logo" className="size-4 accent-[var(--accent-brand)]" /> Remove logo
            </label>
          </div>
        )}
        <Input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="h-10 py-2" />
        <p className="text-sm text-ink-muted">PNG, JPEG or WebP, up to 300 KB. Shown on the cover of your proposals.</p>
      </div>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Accent colour</legend>
        <div className="flex flex-wrap gap-3">
          {ACCENTS.map((a) => (
            <label
              key={a.value}
              className="flex h-10 cursor-pointer items-center gap-2 rounded-sm border border-rule px-3 text-sm transition-colors hover:border-ink-muted has-checked:border-ink has-focus-visible:outline-2 has-focus-visible:outline-ring"
            >
              <input type="radio" name="brand_accent" value={a.value} defaultChecked={profile.brand_accent === a.value} className="sr-only" />
              <span className={`size-4 rounded-sm ${a.swatch}`} aria-hidden />
              {a.label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="space-y-2">
        <Label htmlFor="default_terms">Standard terms</Label>
        <Textarea id="default_terms" name="default_terms" defaultValue={profile.default_terms} rows={8} placeholder={"- This proposal is valid for 30 days.\n- Payment is due in full on acceptance."} />
        <p className="text-sm text-ink-muted">Used as the starting point for the Terms section of every new proposal.</p>
      </div>
      </div>
      <div className="flex items-center gap-4 border-t border-rule pt-6">
        <Button type="submit" className="h-10 px-4" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
        {state?.ok && <p role="status" className="text-sm text-brand">Saved.</p>}
        {state && !state.ok && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
      </div>
    </form>
  );
}

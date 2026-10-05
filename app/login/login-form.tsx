"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ next }: { next?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  const redirectTo = () => {
    const url = new URL("/auth/callback", window.location.origin);
    if (next) url.searchParams.set("next", next);
    return url.toString();
  };

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await createClient().auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo() } });
    if (error) {
      setState("error");
      setMessage(error.message);
    } else {
      setState("sent");
    }
  }

  async function google() {
    const { error } = await createClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirectTo() } });
    if (error) {
      setState("error");
      setMessage(error.message);
    }
  }

  if (state === "sent") {
    return (
      <div className="mt-10 border-t border-rule pt-6" role="status">
        <p className="font-medium">Check your inbox</p>
        <p className="mt-1 text-ink-muted">
          We sent a sign-in link to <span className="text-ink">{email}</span>. You can close this tab.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-6">
      <form onSubmit={sendLink} className="space-y-3">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-11"
          placeholder="you@studio.com"
        />
        <Button type="submit" className="h-11 w-full" disabled={state === "sending"}>
          {state === "sending" ? "Sending link…" : "Email me a sign-in link"}
        </Button>
        {state === "error" && (
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
        )}
      </form>
      <div className="flex items-center gap-3 text-xs text-ink-muted">
        <span className="h-px flex-1 bg-rule" /> or <span className="h-px flex-1 bg-rule" />
      </div>
      <Button type="button" variant="outline" className="h-11 w-full" onClick={google}>
        Continue with Google
      </Button>
    </div>
  );
}

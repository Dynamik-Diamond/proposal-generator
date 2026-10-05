import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return (
    <main className="min-h-dvh grid lg:grid-cols-[1.1fr_1fr]">
      <section className="hidden lg:flex flex-col justify-between border-r border-rule p-16">
        <p className="font-display text-lg">Proposals</p>
        <div>
          <p className="font-display text-[clamp(3rem,5vw,4.75rem)] leading-[1.02] tracking-[-0.02em] font-light max-w-[12ch]">
            Write it once. Get the signature and the payment.
          </p>
          <p className="mt-8 max-w-[44ch] text-ink-muted text-lg leading-relaxed">
            Describe the job in a paragraph. Send a proposal your client can read, sign and pay in one sitting.
          </p>
        </div>
        <p className="text-sm text-ink-muted">Draft → sent → viewed → signed → paid</p>
      </section>
      <section className="flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-4xl tracking-[-0.01em]">Sign in</h1>
          <p className="mt-2 text-ink-muted">We&apos;ll email you a link. No password needed.</p>
          {error && (
            <p role="alert" className="mt-6 text-sm text-destructive">
              That sign-in link didn&apos;t work or has expired. Request a new one.
            </p>
          )}
          <LoginForm next={next} />
        </div>
      </section>
    </main>
  );
}

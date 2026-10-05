# Proposal Generator

Write a paragraph about a job and get a polished proposal. Send your client a link where they can read it, sign it and pay for it.

## Setup

1. **Install:** `npm install`, then `cp .env.example .env.local`.
2. **Supabase:**
   - Project Settings → API: copy the Project URL, the publishable (anon) key and the secret (service role) key into `.env.local`.
   - SQL Editor: paste and run `supabase/migrations/0001_init.sql`.
   - Authentication → URL Configuration: set the Site URL to your app URL, and add `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback` to Redirect URLs.
   - Optional: Authentication → Providers → Google, to enable "Continue with Google".
3. **AI (optional):**
   - Free: create a key at aistudio.google.com, then set `AI_PROVIDER=gemini` and `GEMINI_API_KEY`.
   - Claude: set `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY` (uses `claude-opus-5-5`).
   - Without a key, "Draft with Claude" copies a prompt you can paste into the Claude app.
4. **Stripe:**
   - Put your test secret key in `STRIPE_SECRET_KEY`.
   - Locally, run `stripe listen --forward-to localhost:3000/api/stripe/webhook` and copy the `whsec_…` it prints into `STRIPE_WEBHOOK_SECRET`.
   - In production: Stripe Dashboard → Developers → Webhooks → add `https://<your-domain>/api/stripe/webhook` with the events `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
5. **Email (optional):** verify a domain in Resend, then set `RESEND_API_KEY` and `EMAIL_FROM`. Without these, emails are only logged.
6. **Run:** `npm run dev`.

## Deploy (Vercel)

Import the repo in Vercel and add every variable from `.env.example`. Set `NEXT_PUBLIC_APP_URL` to the production URL. Then add the production callback URL in Supabase and the webhook in Stripe.

## How it works

The owner's flow is **New proposal** → edit → **Copy client link** (this marks it *sent*). The client opens `/p/<token>`, which marks it *viewed* and emails you. They sign (typed or drawn), which marks it *signed*, locks the content, and records a SHA-256 hash of the agreed version. They pay through Stripe Checkout, which marks it *paid*. The signed PDF includes an audit trail page.

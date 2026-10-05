# Proposal Generator

PandaDoc-style app: owner signs in, describes a job, AI drafts a proposal from one fixed template; client opens a public link, signs, pays via Stripe, sees a celebration.

## Commands
- Install: `npm install`
- Dev: `npm run dev` (http://localhost:3000)
- Build: `npm run build`
- Unit tests: `npm test` · single file: `npx vitest run tests/unit/status.test.ts`
- Types: `npm run typecheck` · Lint: `npm run lint`
- E2E: `npm run e2e` (Playwright; needs a real Supabase project + Stripe test keys in `.env.local`)
- Security scan (HawkScan, local prod build on :3200): `node stackhawk/prepare.mjs && source .hawk.env`, build/start with `NEXT_DIST_DIR=.next-scan` (see header of `stackhawk.yml`), then `hawk scan stackhawk.yml`. If `hawk validate auth` dies with a gRPC "Network closed" error, run `hawk perch stop` and retry.
- Stripe webhooks locally: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

## Stack
- Next.js 15 App Router + TypeScript, npm. Hosted on Vercel.
- Supabase (Auth magic link + Google, Postgres with RLS). Schema lives in `supabase/migrations/` and is applied by hand in the Supabase SQL editor.
- Tailwind v4 + shadcn/ui (base-ui flavour, `cn` from the `cn` package). Tokens in `app/globals.css`, spec in `DESIGN.md`.
- AI: `lib/ai/` with Gemini (`@google/genai`) and Claude (`@anthropic-ai/sdk`, `claude-opus-5-5`) adapters, chosen by `AI_PROVIDER`. With no key, the app uses no-key mode (blank template, or copy/paste via the Claude app).
- Stripe Checkout, Resend email, `@react-pdf/renderer` for signed PDFs, Motion and canvas-confetti for the success screen.
- Never use: Inter/Geist as the brand font, indigo/purple, gradients (see DESIGN.md).

## Architecture
- `app/proposals/actions.ts`: all owner mutations (server actions, run as the user, so RLS applies).
- `app/p/[token]/` and `app/api/p/[token]/*`: the public client flow. No auth; uses the service role via `lib/public.ts`, and must only expose client-safe fields.
- `lib/status.ts` and `lib/pricing.ts`: the status machine and money rules. Totals are always recomputed on the server.
- `lib/payments.ts`: `markPaidFromSession` is the only code that sets `paid`. It's idempotent and called from the webhook and from the post-checkout status poll.
- `lib/template.ts` + `lib/ai/prompt.ts`: the proposal template (section keys, headings, writing guidance).

## Constraints
- Never commit `.env.local` or any key. Never send the service-role key to the browser.
- Never trust amounts or status from the client. Stripe amounts come from `proposals.total_cents`.
- CSP is built per request with a nonce in `lib/csp.ts` / `middleware.ts` (no `'unsafe-inline'` scripts). Never add third-party script/image hosts; logos are stored as data: URLs.
- Netlify functions hard-stop at 60s: keep AI calls under the 50s deadline in `lib/ai/`.
- Signed or paid proposals are immutable (enforced in the app and by a DB trigger). Don't add paths that edit them.
- Don't invent testimonials, stats or client facts in prompts or UI copy.

## Done means
- `npm test`, `npm run typecheck`, `npm run lint` and `npm run build` all pass.
- UI changes: screenshot at 375px and 1440px and save to `screenshots/`, then check against `DESIGN.md`.
- Code changes: run the HawkScan loop.

## More detail
- `README.md`: setup (Supabase, Stripe, Resend, AI keys, Vercel deploy).
- `DESIGN.md`: design tokens and rules.

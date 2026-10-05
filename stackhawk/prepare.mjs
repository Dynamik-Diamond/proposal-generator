// Prepares a HawkScan run against the local production build:
// - signs in the throwaway test owner (fresh random password) and captures its Supabase session cookie
// - creates a "sent" proposal the scanner can exercise via its public token
// Writes everything to .hawk.env (gitignored). Usage: node stackhawk/prepare.mjs
import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const email = "hawkscan-owner@example.com";
const password = randomBytes(24).toString("base64url");

const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
let user = list.users.find((u) => u.email === email);
if (user) await admin.auth.admin.updateUserById(user.id, { password });
else user = (await admin.auth.admin.createUser({ email, password, email_confirm: true })).data.user;
await admin.from("profiles").upsert({ user_id: user.id, business_name: "HawkScan Test Studio", notify_email: email });

// Fresh scan target each run.
await admin.from("proposals").delete().eq("user_id", user.id);
const token = randomBytes(32).toString("base64url");
const { data: proposal, error } = await admin
  .from("proposals")
  .insert({
    user_id: user.id,
    public_token: token,
    title: "Scan target proposal",
    client_name: "Scan Client",
    client_email: "scan-client@example.com",
    content: [
      { key: "situation", heading: "Where things stand", body: "Test content for security scanning." },
      { key: "investment_note", heading: "Investment", body: "" },
    ],
    line_items: [{ name: "Test item", description: "", qty: 1, unit_cents: 10000 }],
    total_cents: 10000,
    status: "sent",
    sent_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 86_400_000).toISOString(),
  })
  .select("id")
  .single();
if (error) throw error;

const jar = new Map();
const ssr = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (c) => c.forEach((x) => jar.set(x.name, x.value)) },
});
const { error: signInError } = await ssr.auth.signInWithPassword({ email, password });
if (signInError) throw signInError;
if (jar.size !== 1) throw new Error(`Expected one session cookie, got ${jar.size}; update stackhawk.yml external.values`);
const [[cookieName, cookieValue]] = [...jar];

fs.writeFileSync(
  ".hawk.env",
  [
    `export HAWK_SCAN_TOKEN=${token}`,
    `export HAWK_SCAN_PROPOSAL_ID=${proposal.id}`,
    `export HAWK_SB_COOKIE_NAME=${cookieName}`,
    `export HAWK_SB_COOKIE_VALUE=${cookieValue}`,
    "",
  ].join("\n"),
  { mode: 0o600 },
);
console.log(`Prepared scan target proposal ${proposal.id} for ${email}`);

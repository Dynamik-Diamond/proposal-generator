import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";

// Loads .env.local, ensures a test owner exists, and saves a signed-in browser state.
// A fresh random password each run, so no reusable credential lives in the repo.
export const OWNER = { email: "e2e-owner@example.com", password: randomBytes(24).toString("base64url") };
export const STATE = "tests/e2e/.auth/owner.json";

function loadEnv() {
  for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
}

export default async function globalSetup() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  let user = list?.users.find((u) => u.email === OWNER.email);
  if (!user) {
    const { data, error } = await admin.auth.admin.createUser({ email: OWNER.email, password: OWNER.password, email_confirm: true });
    if (error) throw error;
    user = data.user!;
  } else {
    const { error } = await admin.auth.admin.updateUserById(user.id, { password: OWNER.password });
    if (error) throw error;
  }
  // Start each run from an empty dashboard for the test owner only.
  await admin.from("proposals").delete().eq("user_id", user.id);
  await admin.from("profiles").upsert({ user_id: user.id, business_name: "Field Notes Studio", notify_email: OWNER.email, brand_accent: "forest" });

  const jar = new Map<string, string>();
  const ssr = createServerClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach((c) => jar.set(c.name, c.value)),
    },
  });
  const { error } = await ssr.auth.signInWithPassword(OWNER);
  if (error) throw error;

  fs.mkdirSync("tests/e2e/.auth", { recursive: true });
  fs.writeFileSync(
    STATE,
    JSON.stringify({
      cookies: [...jar].map(([name, value]) => ({ name, value, domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" })),
      origins: [],
    }),
  );
}

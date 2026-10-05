import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import { STATE } from "./global-setup";

const round = process.env.SHOT_ROUND ?? "1";
const shot = (page: Page, name: string) => page.screenshot({ path: `screenshots/round-${round}-${name}.png`, fullPage: true });

test("owner drafts with AI, client signs, pays and celebrates", async ({ browser }) => {
  // --- Owner ---
  const owner = await browser.newContext({ storageState: STATE, viewport: { width: 1440, height: 900 } });
  await owner.grantPermissions(["clipboard-read", "clipboard-write"], { origin: "http://localhost:3100" });
  const o = await owner.newPage();
  await o.goto("/dashboard");
  await expect(o.getByRole("heading", { name: "Proposals", level: 1 })).toBeVisible();
  await shot(o, "dashboard-before");

  await o.getByRole("link", { name: /New proposal/ }).click();
  await o.getByLabel("Client name").fill("Jordan Lee");
  await o.getByLabel("Company (optional)").fill("Northwind Bakery");
  await o.getByLabel("Client email (optional)").fill("jordan@example.com");
  await o
    .getByLabel("The job, in a paragraph")
    .fill(
      "Northwind is a 12-person bakery chain whose website can't take online orders. They want pre-orders for pickup, live in 6 weeks. We'll design and build it on Shopify, migrate their menu of about 60 items, and train two staff. Budget is $8,500.",
    );
  await shot(o, "new-proposal");
  await o.getByRole("button", { name: "Write the proposal" }).click();
  await o.waitForURL(/\/proposals\/.+\/edit/, { timeout: 180_000 });
  await expect(o.getByRole("heading", { name: /Where things stand/ })).toBeVisible();
  await expect(o.locator("#body-situation")).not.toHaveValue("");
  await shot(o, "editor");

  await o.getByRole("button", { name: "Copy client link" }).click();
  await expect(o.getByText("Link copied")).toBeVisible();
  const publicUrl = await o.evaluate(() => navigator.clipboard.readText());
  expect(publicUrl).toMatch(/\/p\/[A-Za-z0-9_-]{43}$/);

  // --- Client (no auth) ---
  const client = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const c = await client.newPage();
  await c.goto(publicUrl);
  await expect(c.getByRole("heading", { level: 1 })).toBeVisible();
  await shot(c, "public-desktop");

  const mobile = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
  const m = await mobile.newPage();
  await m.goto(publicUrl);
  await expect(m.getByRole("link", { name: /Review & sign/ })).toBeVisible();
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow, "no horizontal scroll at 375px").toBe(false);
  await shot(m, "public-mobile");

  // Signing a version other than the one on screen is refused.
  const token = publicUrl.split("/p/")[1];
  const stale = await c.request.post(`/api/p/${token}/sign`, {
    data: { name: "Jordan Lee", email: "jordan@example.com", method: "typed", agree: true, content_hash: "0".repeat(64) },
  });
  expect(stale.status()).toBe(409);

  await c.getByRole("checkbox").check();
  await shot(c, "sign-form");
  await c.getByRole("button", { name: "Sign proposal" }).click();
  await expect(c.getByRole("heading", { name: "Signed. One last step." })).toBeVisible();

  await c.getByRole("button", { name: /^Pay / }).click();
  await c.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });
  await c.getByTestId("hosted-payment-submit-button").waitFor();
  await shot(c, "stripe-checkout");
  // Stripe shows payment methods as an accordion; open the card option.
  await c.getByTestId("card-accordion-item-button").dispatchEvent("click");
  await c.locator("#cardNumber").fill("4242424242424242");
  await c.locator("#cardExpiry").fill("12 / 34");
  await c.locator("#cardCvc").fill("123");
  await c.locator("#billingName").fill("Jordan Lee");
  const zip = c.locator("#billingPostalCode");
  if ((await zip.count()) && (await zip.isVisible())) await zip.fill("94107");
  const savePass = c.locator("#enableStripePass");
  if ((await savePass.count()) && (await savePass.isChecked())) await savePass.uncheck();
  await c.getByTestId("hosted-payment-submit-button").click();

  await c.waitForURL(/\/p\/.+paid=1/, { timeout: 90_000 });
  await expect(c.getByRole("dialog", { name: /You're all set, Jordan/ })).toBeVisible({ timeout: 45_000 });
  await c.waitForTimeout(1400); // let the reveal settle for the screenshot
  await c.screenshot({ path: `screenshots/round-${round}-celebration.png` });

  const download = c.waitForEvent("download");
  await c.getByRole("dialog").getByRole("link", { name: "Download signed PDF" }).click();
  const pdf = await (await download).path();
  expect(fs.readFileSync(pdf).subarray(0, 4).toString()).toBe("%PDF");
  fs.copyFileSync(pdf, `screenshots/round-${round}-signed.pdf`);

  await c.getByRole("button", { name: "Back to the proposal" }).click();
  await expect(c.getByRole("heading", { name: "All set" })).toBeVisible();

  // --- Owner sees it paid ---
  await o.goto("/dashboard");
  await expect(o.getByText("Paid").first()).toBeVisible();
  await shot(o, "dashboard-after");
});

test("public routes refuse bad input", async ({ request }) => {
  expect((await request.get("/p/not-a-real-token")).status()).toBe(404);
  const res = await request.post("/api/p/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/sign", { data: { name: "x" } });
  expect(res.status()).toBe(400);
  expect((await request.post("/api/stripe/webhook", { data: "{}" })).status()).toBe(400);
});

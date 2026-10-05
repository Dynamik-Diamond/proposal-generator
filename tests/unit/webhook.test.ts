import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

const markPaid = vi.fn(async () => true);
const seen = new Set<string>();

vi.mock("@/lib/payments", () => ({ markPaidFromSession: markPaid }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: (_c: string, id: string) => ({ maybeSingle: async () => ({ data: seen.has(id) ? { id } : null }) }) }),
      upsert: async ({ id }: { id: string }) => void seen.add(id),
    }),
  }),
}));

const SECRET = "whsec_test_secret";
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = SECRET;

function signedRequest(payload: object, secret = SECRET) {
  const body = JSON.stringify(payload);
  const header = new Stripe("sk_test_dummy").webhooks.generateTestHeaderString({ payload: body, secret });
  return new Request("http://x/api/stripe/webhook", { method: "POST", body, headers: { "stripe-signature": header } });
}

const event = {
  id: "evt_1",
  object: "event",
  type: "checkout.session.completed",
  data: { object: { id: "cs_1", object: "checkout.session", payment_status: "paid", metadata: { proposal_id: "p1" } } },
};

describe("stripe webhook", () => {
  beforeEach(() => {
    markPaid.mockClear();
    seen.clear();
  });

  it("rejects a bad signature", async () => {
    const { POST } = await import("@/app/api/stripe/webhook/route");
    const res = await POST(signedRequest(event, "whsec_wrong"));
    expect(res.status).toBe(400);
    expect(markPaid).not.toHaveBeenCalled();
  });

  it("processes a completed checkout once, even if delivered twice", async () => {
    const { POST } = await import("@/app/api/stripe/webhook/route");
    expect((await POST(signedRequest(event))).status).toBe(200);
    expect((await POST(signedRequest(event))).status).toBe(200);
    expect(markPaid).toHaveBeenCalledTimes(1);
  });
});

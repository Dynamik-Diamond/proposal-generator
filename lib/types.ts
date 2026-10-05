export type ProposalStatus = "draft" | "sent" | "viewed" | "signed" | "paid";

export type Section = {
  key: string;
  heading: string;
  body: string; // Markdown
};

export type LineItem = {
  name: string;
  description: string;
  qty: number;
  unit_cents: number;
};

export type Proposal = {
  id: string;
  user_id: string;
  public_token: string;
  title: string;
  client_name: string;
  client_email: string | null;
  client_company: string | null;
  brief: string;
  content: Section[];
  line_items: LineItem[];
  total_cents: number;
  currency: string;
  status: ProposalStatus;
  expires_at: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Profile = {
  user_id: string;
  business_name: string;
  notify_email: string | null;
  logo_url: string | null;
  default_terms: string;
  brand_accent: "forest" | "oxblood" | "inkblue";
};

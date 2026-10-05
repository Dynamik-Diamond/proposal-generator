import { z } from "zod";

export const LineItemSchema = z.object({
  name: z.string().describe("Short line item name"),
  description: z.string().describe("One sentence on what it covers"),
  qty: z.number().describe("Quantity, usually 1"),
  unit_cents: z.number().int().describe("Unit price in cents, e.g. 250000 for $2,500"),
});

export const SectionSchema = z.object({
  key: z.string(),
  heading: z.string(),
  body: z.string().describe("Markdown body"),
});

export const ProposalDraftSchema = z.object({
  title: z.string().describe("Proposal title, under 8 words, specific to this client"),
  sections: z.array(SectionSchema),
  line_items: z.array(LineItemSchema),
});

export const SectionDraftSchema = z.object({ body: z.string().describe("Markdown body") });

export type ProposalDraft = z.infer<typeof ProposalDraftSchema>;

/** Accept a pasted reply from the Claude app: raw JSON, or JSON inside a ```json fence or surrounding text. */
export function parseDraftReply(text: string): ProposalDraft {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  let json: unknown;
  try {
    json = JSON.parse(candidate);
  } catch {
    throw new Error("Couldn't find valid JSON in the pasted reply. Paste Claude's whole answer.");
  }
  const result = ProposalDraftSchema.safeParse(json);
  if (!result.success) throw new Error("The pasted reply is missing title, sections or line_items.");
  return result.data;
}

import { TEMPLATE_SECTIONS } from "@/lib/template";

export type BriefInput = {
  brief: string;
  clientName: string;
  clientCompany?: string | null;
  businessName: string;
  defaultTerms?: string;
};

export const SYSTEM_PROMPT = `You write client proposals for an independent business. Your proposals win work because they are specific, calm and confident: they restate the client's problem better than the client could, make the outcome concrete, and make saying yes feel easy.

Voice: plain, warm, direct English. Short sentences. Second person ("you") for the client, first person plural ("we") for the business. No buzzwords, no hype, no exclamation marks, no invented facts, statistics, testimonials or past clients. If the brief lacks a detail (dates, exact quantities), choose a sensible default and keep it modest rather than inventing specifics about the client.

Formatting: section bodies are Markdown. Use **bold** for labels, "- " bullets for lists, and short paragraphs. Do not include the section heading inside the body. Never use headings (#) inside bodies.

Pricing: propose 1–5 line items that match the scope. If the brief states a price or budget, the line items must add up to it exactly. Prices are in cents.`;

export function sectionGuide(): string {
  return TEMPLATE_SECTIONS.map((s) => `- key "${s.key}", heading "${s.heading}": ${s.guidance}`).join("\n");
}

export function proposalUserPrompt(input: BriefInput): string {
  return `Write a proposal from ${input.businessName || "our studio"} to ${input.clientName}${
    input.clientCompany ? ` at ${input.clientCompany}` : ""
  }.

Return exactly these sections, in this order, with these keys and headings:
${sectionGuide()}
${input.defaultTerms ? `\nBase the "terms" section on these standard terms:\n${input.defaultTerms}\n` : ""}
The brief:
"""
${input.brief}
"""`;
}

export function sectionUserPrompt(args: {
  input: BriefInput;
  sectionKey: string;
  currentBody: string;
  otherSections: string;
  instruction?: string;
}): string {
  const spec = TEMPLATE_SECTIONS.find((s) => s.key === args.sectionKey);
  return `Rewrite one section of an existing proposal from ${args.input.businessName || "our studio"} to ${args.input.clientName}.

Section: "${spec?.heading ?? args.sectionKey}". ${spec?.guidance ?? ""}
${args.instruction ? `\nThe author's instruction for this rewrite: ${args.instruction}\n` : ""}
Current text of this section:
"""
${args.currentBody}
"""

The rest of the proposal, for context (do not repeat it):
"""
${args.otherSections}
"""

Original brief:
"""
${args.input.brief}
"""

Return only the new Markdown body for this section.`;
}

/** Self-contained prompt for pasting into the Claude app when no API key is configured. */
export function copyPastePrompt(input: BriefInput): string {
  return `${SYSTEM_PROMPT}

${proposalUserPrompt(input)}

Reply with ONLY a JSON object in a \`\`\`json code block, in exactly this shape:
{
  "title": "string",
  "sections": [{ "key": "situation", "heading": "Where things stand", "body": "markdown" }, ...],
  "line_items": [{ "name": "string", "description": "string", "qty": 1, "unit_cents": 250000 }]
}`;
}

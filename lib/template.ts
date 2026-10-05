import type { Section } from "./types";

/** The default proposal template: fixed section keys, in reading order. Investment is rendered from line items. */
export const TEMPLATE_SECTIONS: { key: string; heading: string; guidance: string }[] = [
  {
    key: "situation",
    heading: "Where things stand",
    guidance:
      "2–3 short paragraphs restating the client's situation and the problem in their own terms. Show you listened. No flattery, no generic industry talk.",
  },
  {
    key: "outcomes",
    heading: "What success looks like",
    guidance:
      "A one-sentence lead-in, then 3–5 bullet points of concrete, observable outcomes the client will have when the work is done.",
  },
  {
    key: "scope",
    heading: "Scope of work",
    guidance:
      "The deliverables, grouped under short bold labels, each with 1–2 sentences. End with a short 'Not included' list so the boundary is clear.",
  },
  {
    key: "approach",
    heading: "Approach & timeline",
    guidance:
      "Phases in order. For each: a bold phase name with duration (e.g. **Discovery · Week 1**), then 1–2 sentences on what happens and what the client receives.",
  },
  {
    key: "investment_note",
    heading: "Investment",
    guidance:
      "1–2 sentences framing the price in terms of value and what it covers. Payment is due in full on acceptance. Do NOT restate line items or totals; they are shown in a table.",
  },
  {
    key: "terms",
    heading: "Terms",
    guidance:
      "Short plain-English bullets: validity of the proposal, payment, revisions, ownership/IP on payment, cancellation. Keep it friendly and fair.",
  },
];

export function blankSections(defaultTerms = ""): Section[] {
  return TEMPLATE_SECTIONS.map((s) => ({
    key: s.key,
    heading: s.heading,
    body: s.key === "terms" && defaultTerms ? defaultTerms : "",
  }));
}

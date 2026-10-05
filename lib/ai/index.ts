import "server-only";
import { ProposalDraftSchema, SectionDraftSchema, type ProposalDraft } from "./schema";
import { SYSTEM_PROMPT, proposalUserPrompt, sectionUserPrompt, type BriefInput } from "./prompt";
import type { z } from "zod";

type Provider = "anthropic" | "gemini";

function provider(): Provider | null {
  const chosen = (process.env.AI_PROVIDER ?? "gemini") as Provider;
  if (chosen === "anthropic" && process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (chosen === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
  return null;
}

/** False means "no-key mode": the UI offers blank template + copy/paste instead. */
export function isAiEnabled(): boolean {
  return provider() !== null;
}

async function json<T extends z.ZodType>(schema: T, user: string): Promise<z.infer<T>> {
  const p = provider();
  if (p === "anthropic") return (await import("./anthropic")).anthropicJson(schema, SYSTEM_PROMPT, user);
  if (p === "gemini") return (await import("./gemini")).geminiJson(schema, SYSTEM_PROMPT, user);
  throw new Error("AI generation isn't configured. Add an API key or use 'Draft with Claude'.");
}

export function generateProposal(input: BriefInput): Promise<ProposalDraft> {
  return json(ProposalDraftSchema, proposalUserPrompt(input));
}

export async function regenerateSection(args: Parameters<typeof sectionUserPrompt>[0]): Promise<string> {
  const result = await json(SectionDraftSchema, sectionUserPrompt(args));
  return result.body;
}

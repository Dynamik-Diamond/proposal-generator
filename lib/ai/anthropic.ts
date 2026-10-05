import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

export async function anthropicJson<T extends z.ZodType>(schema: T, system: string, user: string): Promise<z.infer<T>> {
  // Stay inside the hosting platform's 60s function limit (Netlify).
  const client = new Anthropic({ timeout: 50_000, maxRetries: 0 });
  const response = await client.beta.messages
    .parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "high", format: betaZodOutputFormat(schema) },
    system,
    messages: [{ role: "user", content: user }],
    })
    .catch((err: unknown) => {
      console.error("Anthropic API error:", err);
      if (err instanceof Anthropic.AuthenticationError) throw new Error("The AI request failed. Check the Anthropic API key.");
      if (err instanceof Anthropic.RateLimitError) throw new Error("The AI is rate limited right now. Try again in a minute.");
      if (err instanceof Anthropic.APIError) throw new Error("The AI model is busy right now. Please try again in a minute.");
      throw err;
    });
  if (response.stop_reason === "refusal") throw new Error("The model declined to write this. Try rephrasing the brief.");
  if (response.stop_reason === "max_tokens") throw new Error("The draft ran too long. Try a shorter brief.");
  if (!response.parsed_output) throw new Error("The model returned an unexpected format. Please try again.");
  return response.parsed_output as z.infer<T>;
}

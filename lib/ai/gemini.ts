import "server-only";
import { ApiError, GoogleGenAI } from "@google/genai";
import { z } from "zod";

// The "-latest" aliases track Google's current free-tier Flash models. Override with GEMINI_MODEL / GEMINI_FALLBACK_MODEL.
const MODELS = [process.env.GEMINI_MODEL || "gemini-flash-latest", process.env.GEMINI_FALLBACK_MODEL || "gemini-flash-lite-latest"];
const RETRY_DELAYS_MS = [3_000, 8_000];
// Hosting functions stop at 60s (Netlify), so give up with a clear message before that.
const DEADLINE_MS = 50_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
class TimeoutError extends Error {}
const isAbort = (err: unknown) => err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
const isBusy = (err: unknown) => err instanceof ApiError && (err.status === 429 || err.status >= 500);

export async function geminiJson<T extends z.ZodType>(schema: T, system: string, user: string): Promise<z.infer<T>> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const started = Date.now();
  const remaining = () => DEADLINE_MS - (Date.now() - started);
  const config = {
    systemInstruction: system,
    responseMimeType: "application/json",
    responseJsonSchema: z.toJSONSchema(schema),
  };

  // The free tier is often briefly overloaded (503) or rate limited (429):
  // try the main model, then the lighter fallback, then back off and repeat.
  let lastError: unknown;
  for (let round = 0; round <= RETRY_DELAYS_MS.length; round++) {
    for (const model of MODELS) {
      if (remaining() < 5_000) return fail(lastError ?? new TimeoutError());
      try {
        const response = await ai.models.generateContent({
          model,
          contents: user,
          config: { ...config, abortSignal: AbortSignal.timeout(remaining()) },
        });
        const result = schema.safeParse(JSON.parse(response.text ?? ""));
        if (result.success) return result.data;
        lastError = new Error("The model returned an unexpected format. Please try again.");
      } catch (err) {
        if (isAbort(err)) return fail(new TimeoutError());
        if (!isBusy(err) && !(err instanceof SyntaxError)) return fail(err);
        lastError = err;
      }
    }
    if (round < RETRY_DELAYS_MS.length) {
      if (remaining() < RETRY_DELAYS_MS[round] + 10_000) break; // not enough time left for another attempt
      await sleep(RETRY_DELAYS_MS[round]);
    }
  }
  return fail(lastError);
}

function fail(err: unknown): never {
  if (err instanceof TimeoutError) throw new Error("The AI took too long to respond. Please try again in a minute.");
  if (err instanceof ApiError) {
    console.error("Gemini API error:", err.status, err.message);
    if (err.status === 429) throw new Error("The free AI quota is used up for now. Try again in a few minutes, or use Draft with Claude.");
    if (err.status >= 500) throw new Error("The AI model is busy right now. Please try again in a minute.");
    throw new Error("The AI request failed. Check the Gemini API key.");
  }
  if (err instanceof SyntaxError) throw new Error("The model returned an unexpected format. Please try again.");
  throw err;
}

import { describe, expect, it } from "vitest";
import { parseDraftReply } from "@/lib/ai/schema";

const draft = { title: "New site", sections: [{ key: "situation", heading: "H", body: "B" }], line_items: [] };

describe("parseDraftReply", () => {
  it("reads JSON inside a fenced block with surrounding chatter", () => {
    const reply = `Here you go!\n\`\`\`json\n${JSON.stringify(draft)}\n\`\`\`\nLet me know.`;
    expect(parseDraftReply(reply).title).toBe("New site");
  });

  it("reads bare JSON", () => {
    expect(parseDraftReply(JSON.stringify(draft)).sections).toHaveLength(1);
  });

  it("rejects non-JSON and wrong shapes with a helpful message", () => {
    expect(() => parseDraftReply("sorry, I can't")).toThrow(/valid JSON/);
    expect(() => parseDraftReply('{"title": 1}')).toThrow(/missing/);
  });
});

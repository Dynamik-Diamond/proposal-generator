export const LOGO_MAX_BYTES = 300 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

/**
 * Turn an uploaded logo into a data URL stored with the profile. Logos are inlined
 * (not hotlinked) so the CSP can restrict images to 'self' and data:.
 */
export async function logoToDataUrl(file: File): Promise<{ ok: true; dataUrl: string } | { ok: false; error: string }> {
  if (!LOGO_TYPES.includes(file.type)) return { ok: false, error: "Logo must be a PNG, JPEG or WebP image." };
  if (file.size > LOGO_MAX_BYTES) return { ok: false, error: "Logo must be 300 KB or smaller." };
  const bytes = Buffer.from(await file.arrayBuffer());
  const looksRight =
    (file.type === "image/png" && bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) ||
    (file.type === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8) ||
    (file.type === "image/webp" && bytes.subarray(8, 12).toString("ascii") === "WEBP");
  if (!looksRight) return { ok: false, error: "That file doesn't look like a valid image." };
  return { ok: true, dataUrl: `data:${file.type};base64,${bytes.toString("base64")}` };
}

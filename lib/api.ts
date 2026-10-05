import { NextResponse } from "next/server";

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export const TOO_MANY = () => jsonError("Too many requests. Please wait a moment.", 429);

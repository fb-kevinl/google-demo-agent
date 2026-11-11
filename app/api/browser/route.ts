import { NextResponse } from "next/server";
import { releaseSession, searchGoogle, startLiveSession } from "@/lib/browser";

export const maxDuration = 60;

type Body = {
  action?: "start" | "search" | "stop";
  sessionId?: string | null;
  query?: string;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action;
  console.log("[api/browser]", { action, sessionId: body.sessionId, query: body.query });
  if (action === "start") {
    try {
      const session = await startLiveSession(body.sessionId);
      return NextResponse.json(session);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start Browserbase.";
      console.error("[api/browser] start 502:", error);
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (action === "search") {
    const result = await searchGoogle(body.sessionId ?? null, body.query ?? "");
    return NextResponse.json(result);
  }

  if (action === "stop") {
    if (body.sessionId) await releaseSession(body.sessionId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

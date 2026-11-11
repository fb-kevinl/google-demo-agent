import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function GET() {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  const agentId = process.env.ELEVENLABS_AGENT_ID?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "ELEVENLABS_API_KEY is not set. Voice stays idle until the key is bound." },
      { status: 503 },
    );
  }
  if (!agentId) {
    return NextResponse.json(
      {
        error:
          "ELEVENLABS_AGENT_ID is not set. Create the agent in ElevenLabs, paste first_message and the searchGoogle client tool from lib/agent-config.ts, upload kb/google-search.md, then set the id in .env.",
      },
      { status: 503 },
    );
  }

  const headers = { "xi-api-key": apiKey };
  const tokenUrl = `https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=${encodeURIComponent(agentId)}`;
  const tokenRes = await fetch(tokenUrl, { headers, cache: "no-store" });
  if (tokenRes.ok) {
    const data = (await tokenRes.json()) as { token?: string; conversation_token?: string };
    const conversationToken = data.token || data.conversation_token;
    if (conversationToken) return NextResponse.json({ conversationToken });
  }

  const signedUrl = `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`;
  const signedRes = await fetch(signedUrl, { headers, cache: "no-store" });
  if (!signedRes.ok) {
    return NextResponse.json(
      { error: "ElevenLabs refused a conversation token. Check the API key scopes and agent id." },
      { status: 502 },
    );
  }
  const signed = (await signedRes.json()) as { signed_url?: string };
  if (!signed.signed_url) {
    return NextResponse.json({ error: "ElevenLabs returned no signed URL." }, { status: 502 });
  }
  return NextResponse.json({ signedUrl: signed.signed_url, connectionType: "websocket" });
}

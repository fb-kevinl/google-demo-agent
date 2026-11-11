import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY is not set." }, { status: 503 });
  }
  const body = (await req.json()) as { text?: string };
  const text = body.text?.trim();
  if (!text) return NextResponse.json({ error: "Missing text." }, { status: 400 });

  const tts = await fetch(
    "https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb/stream?output_format=mp3_44100_128",
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({ text, model_id: "eleven_flash_v2_5" }),
    },
  );
  if (!tts.ok || !tts.body) {
    console.error("[api/speak] TTS failed:", tts.status, await tts.text());
    return NextResponse.json({ error: "ElevenLabs speech failed." }, { status: 502 });
  }
  return new NextResponse(tts.body, {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}

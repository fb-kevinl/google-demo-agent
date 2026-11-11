"use client";

import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mic, MicOff, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  Textarea,
} from "@fastbreak-amateur/fb-toolkit/client";

const emailSchema = z.object({
  email: z.string().email("Enter a valid email to continue."),
});

type EmailValues = z.infer<typeof emailSchema>;
type Line = { role: "user" | "agent"; text: string };
type BrowserState = {
  sessionId: string | null;
  liveViewUrl: string | null;
  mocked: boolean;
  message: string;
};

export function DemoApp() {
  const [email, setEmail] = useState<string | null>(null);
  if (!email) return <EmailGate onContinue={setEmail} />;
  return <WatchDemo />;
}

function EmailGate({ onContinue }: { onContinue: (email: string) => void }) {
  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Badge variant="secondary" className="w-fit">
            Watch-only POC
          </Badge>
          <CardTitle>FastBreak Google demo</CardTitle>
          <CardDescription>
            Leave an email, then watch the agent search google.com. You never click the live
            view. This POC discards the address after you continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void form.handleSubmit((values) => onContinue(values.email))(event);
            }}
          >
            <FieldGroup>
              <Field data-invalid={!!form.formState.errors.email || undefined}>
                <FieldLabel htmlFor="email">Work email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  aria-invalid={!!form.formState.errors.email}
                  {...form.register("email")}
                />
                <FieldDescription>Not stored. No FastBreak Dev Supabase on this POC.</FieldDescription>
                <FieldError errors={[form.formState.errors.email]} />
              </Field>
              <Button type="submit" className="w-full" size="lg">
                Enter the demo
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function WatchDemo() {
  const sessionRef = useRef<string | null>(null);
  const [mockQuery, setMockQuery] = useState("");
  const searchGoogle = useCallback(async (parameters: Record<string, unknown>) => {
    const query = String(parameters.query ?? "");
    setMockQuery(query);
    const res = await fetch("/api/browser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "search", query, sessionId: sessionRef.current }),
    });
    const data = (await res.json()) as { narration?: string };
    return data.narration || "Search returned nothing visible. Park it.";
  }, []);

  return (
    <ConversationProvider clientTools={{ searchGoogle }}>
      <DemoShell sessionRef={sessionRef} mockQuery={mockQuery} />
    </ConversationProvider>
  );
}

function DemoShell({
  sessionRef,
  mockQuery,
}: {
  sessionRef: { current: string | null };
  mockQuery: string;
}) {
  const conversation = useConversation({
    onMessage: (payload) => {
      const text = payload.message?.trim();
      if (!text) return;
      setLines((prev) => [...prev, { role: payload.role, text }]);
    },
    onError: (message) => setVoiceError(message),
  });
  const [browser, setBrowser] = useState<BrowserState | null>(null);
  const [browserError, setBrowserError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok) {
        setBrowserError(data.error || "Could not start the live view.");
        return;
      }
      sessionRef.current = data.sessionId;
      setBrowser({
        sessionId: data.sessionId,
        liveViewUrl: data.liveViewUrl,
        mocked: data.mocked,
        message: data.message,
      });
    })();
    return () => {
      cancelled = true;
      const id = sessionRef.current;
      if (id) {
        void fetch("/api/browser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stop", sessionId: id }),
        });
      }
    };
  }, [sessionRef]);

  async function startVoice() {
    setStarting(true);
    setVoiceError(null);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const res = await fetch("/api/conversation");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start the agent.");
      if (data.conversationToken) {
        conversation.startSession({ conversationToken: data.conversationToken });
      } else {
        conversation.startSession({
          signedUrl: data.signedUrl,
          connectionType: data.connectionType ?? "websocket",
        });
      }
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : "Microphone or agent failed.");
    } finally {
      setStarting(false);
    }
  }

  function sendText() {
    const text = draft.trim();
    if (!text || conversation.status !== "connected") return;
    conversation.sendUserMessage(text);
    setDraft("");
  }

  const connected = conversation.status === "connected";

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 lg:flex-row lg:p-6">
      <section className="flex min-h-[320px] flex-1 flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            <p className="text-sm font-medium">google.com</p>
            <p className="text-xs text-muted-foreground">{browser?.message ?? "Starting live view…"}</p>
          </div>
          <Badge variant={browser?.mocked ? "secondary" : "default"}>
            {browserError ? "Error" : browser?.mocked ? "Sample" : browser ? "Live" : "Loading"}
          </Badge>
        </div>
        <div className="relative min-h-0 flex-1 bg-muted/40">
          {browserError ? (
            <EmptyState title="Live view failed" body={browserError} />
          ) : !browser ? (
            <EmptyState title="Opening google.com" body="Starting a Browserbase session, or a sample view if the project id is missing." />
          ) : browser.liveViewUrl ? (
            <iframe
              title="Google live view"
              src={browser.liveViewUrl}
              className="absolute inset-0 h-full w-full pointer-events-none border-0"
              allow="clipboard-read"
            />
          ) : (
            <MockGoogle query={mockQuery} />
          )}
        </div>
      </section>

      <aside className="flex w-full flex-col gap-3 lg:w-[380px]">
        <Card className="flex min-h-0 flex-1 flex-col">
          <CardHeader>
            <CardTitle>Demo guide</CardTitle>
            <CardDescription>
              The agent speaks first after you start voice. Ask it to search; watch the screen.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {!connected ? (
                <Button onClick={startVoice} disabled={starting} size="lg">
                  <Mic /> {starting ? "Connecting…" : "Start voice"}
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => conversation.endSession()}>
                  <MicOff /> End
                </Button>
              )}
              <Badge variant="outline">{conversation.status}</Badge>
              {connected && (
                <Badge variant="secondary">{conversation.isSpeaking ? "Speaking" : "Listening"}</Badge>
              )}
            </div>
            {voiceError && <p className="text-sm text-destructive">{voiceError}</p>}
            <div className="min-h-[180px] flex-1 space-y-2 overflow-y-auto rounded-lg bg-muted/40 p-3 text-sm">
              {lines.length === 0 ? (
                <p className="text-muted-foreground">Transcript appears here. Empty until the agent connects.</p>
              ) : (
                lines.map((line, i) => (
                  <p key={`${i}-${line.text.slice(0, 12)}`}>
                    <span className="font-medium">{line.role === "agent" ? "Guide" : "You"}: </span>
                    {line.text}
                  </p>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={connected ? "Type a query if you prefer not to talk" : "Start voice first"}
                disabled={!connected}
                rows={2}
              />
              <Button type="button" size="icon-lg" onClick={sendText} disabled={!connected || !draft.trim()}>
                <Send />
              </Button>
            </div>
          </CardContent>
          <CardFooter className="text-xs text-muted-foreground">
            One client tool: searchGoogle. No click-through. FastBreak facts are parked, not guessed.
          </CardFooter>
        </Card>
        {browser?.mocked && (
          <p className="px-1 text-xs text-muted-foreground">
            Sample iframe is on because BROWSERBASE_PROJECT_ID is unset. Searches still return sample titles
            {mockQuery ? ` (last: ${mockQuery})` : ""}.
          </p>
        )}
      </aside>
    </main>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 px-6 text-center">
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

function MockGoogle({ query }: { query: string }) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center bg-[#202124] px-6 py-10 text-[#e8eaed]">
      <p className="mb-8 text-5xl font-medium tracking-tight">Google</p>
      <div className="w-full max-w-xl rounded-full border border-white/15 px-5 py-3 text-sm">
        {query || "Ask the guide to search. Sample results will appear here."}
      </div>
      <div className="mt-8 w-full max-w-xl space-y-4 text-left text-sm">
        <p className="text-[#8ab4f8]">Sample result · Wikipedia</p>
        <p className="text-[#8ab4f8]">Sample result · News</p>
        <p className="text-[#8ab4f8]">Sample result · Official site</p>
      </div>
    </div>
  );
}

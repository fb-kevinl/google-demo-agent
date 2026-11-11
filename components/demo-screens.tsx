"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
import type { RefObject } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Badge,
  Button,
  Card,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@fastbreak-amateur/fb-toolkit/client";

export const PREP_STEPS = [
  "Saving your email",
  "Opening google.com",
  "Starting the live view",
  "Starting the AI guide",
] as const;

export const CHIPS = ["Search Wikipedia", "What is FastBreak?", "Who is it for?"];

const emailSchema = z.object({
  email: z.string().email("Enter an email like name@club.com."),
});

type EmailValues = z.infer<typeof emailSchema>;
export type Line = { role: "user" | "agent"; text: string };
export type BrowserState = {
  sessionId: string;
  liveViewUrl: string;
  message: string;
};

export function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function EmailGate({ onContinue }: { onContinue: (email: string) => void }) {
  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-[420px] gap-0 py-0">
        <div className="p-7">
          <p className="text-lg font-bold">
            FastBreak <span className="font-normal text-muted-foreground">AI demo</span>
          </p>
          <h1 className="mt-4 text-[22px] font-semibold tracking-tight">Watch a live FastBreak demo</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            See the AI guide search Google on a live screen. It takes a few minutes.
          </p>
          <p className="mt-4 rounded-lg border bg-[#fafafa] p-3 text-sm">
            Your guide is an AI agent, not a person. It talks and types, and it controls the
            screen while you watch.
          </p>
          <Form {...form}>
            <form
              className="mt-5"
              noValidate
              onSubmit={form.handleSubmit((values) => onContinue(values.email))}
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" placeholder="you@club.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="mt-4 w-full">
                Start demo
              </Button>
            </form>
          </Form>
          <p className="mt-3 text-xs text-muted-foreground">
            We use your email for this session only. This POC does not save it.
          </p>
        </div>
      </Card>
    </main>
  );
}

export function PrepScreen({
  prepIndex,
  prepTick,
  prepSlow,
  onRetry,
}: {
  prepIndex: number;
  prepTick: number;
  prepSlow: boolean;
  onRetry: () => void;
}) {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-[420px] gap-0 py-0">
        <div className="p-7">
          <h2 className="text-lg font-semibold">Setting up your demo</h2>
          <p className="mt-1 text-sm text-muted-foreground">This takes 10 to 30 seconds.</p>
          <div className="mt-4 space-y-1">
            {PREP_STEPS.map((label, i) => {
              const done = i < prepIndex;
              const run = i === prepIndex;
              return (
                <div
                  key={label}
                  className={`flex items-center gap-2.5 py-1.5 text-sm ${run || done ? "" : "text-muted-foreground"}`}
                >
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      done
                        ? "border-foreground bg-foreground text-background"
                        : run
                          ? "border-foreground"
                          : "border-neutral-300"
                    }`}
                  >
                    {done ? <Check className="size-3" /> : null}
                    {run ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  </span>
                  {label}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{prepTick}s</p>
          {prepSlow ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-sm">
              Setup is taking longer than normal.{" "}
              <Button size="sm" className="ml-2" onClick={onRetry}>
                Try again
              </Button>
            </div>
          ) : null}
        </div>
      </Card>
    </main>
  );
}

export function EndScreen({
  email,
  endedByCap,
  searches,
  questions,
  onStartOver,
}: {
  email: string;
  endedByCap: boolean;
  searches: string[];
  questions: Line[];
  onStartOver: () => void;
}) {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="w-full max-w-[560px]">
        <Card className="gap-0 py-0">
          <div className="p-7">
            <h2 className="text-xl font-semibold">
              {endedByCap ? "The demo reached its 12-minute limit" : "Demo finished"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Want to talk about how this fits your club? Our team can walk through it with you.
            </p>
            <Button size="lg" className="mt-4" asChild>
              <a href="#CALENDAR-LINK-TBD">Book a time with our team</a>
            </Button>
            <div className="mt-4 rounded-xl border bg-[#fafafa] p-4">
              <div className="flex items-center">
                <p className="font-semibold">What you saw</p>
                <span className="flex-1" />
                <Badge variant="outline">Demo data</Badge>
              </div>
              <ul className="mt-2 list-disc space-y-0.5 pl-4 text-sm">
                {searches.length ? (
                  searches.map((q) => <li key={q}>Google search: {q}</li>)
                ) : (
                  <li className="text-muted-foreground">No searches run.</li>
                )}
              </ul>
              <p className="mt-3 font-semibold">Your questions</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm">
                {questions.length ? (
                  questions.map((q, i) => <li key={`${i}-${q.text}`}>“{q.text}”</li>)
                ) : (
                  <li className="text-muted-foreground">No questions asked.</li>
                )}
              </ul>
            </div>
            <Button variant="outline" size="sm" className="mt-4" onClick={onStartOver}>
              Start over
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">Session email: {email}</p>
          </div>
        </Card>
      </div>
    </main>
  );
}

export function DemoLayout({
  secs,
  warn,
  lost,
  browser,
  browserError,
  searches,
  lines,
  draft,
  connected,
  isSpeaking,
  isMuted,
  awaiting,
  agentLabel,
  voiceError,
  txRef,
  onEnd,
  onRestart,
  onToggleMute,
  onDraft,
  onSend,
}: {
  secs: number;
  warn: boolean;
  lost: boolean;
  browser: BrowserState | null;
  browserError: string | null;
  searches: string[];
  lines: Line[];
  draft: string;
  connected: boolean;
  isSpeaking: boolean;
  isMuted: boolean;
  awaiting: boolean;
  agentLabel: string;
  voiceError: string | null;
  txRef: RefObject<HTMLDivElement | null>;
  onEnd: () => void;
  onRestart: () => void;
  onToggleMute: () => void;
  onDraft: (value: string) => void;
  onSend: (text?: string) => void;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex h-[52px] items-center gap-3.5 border-b bg-background px-4">
        <span className="font-bold">
          FastBreak <span className="font-normal text-muted-foreground">AI demo</span>
        </span>
        <span className="flex-1" />
        <span className="hidden text-sm text-muted-foreground sm:inline">
          Time left <b className="text-foreground">{fmt(secs)}</b>
        </span>
        <Button variant="outline" size="sm" onClick={onEnd}>
          End demo
        </Button>
      </header>
      {warn ? (
        <div className="flex items-center gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm">
          <b>1 minute left.</b>
          <span>The demo ends at 3 minutes.</span>
          <span className="flex-1" />
          <Button variant="outline" size="sm" onClick={onEnd}>
            End now
          </Button>
        </div>
      ) : null}
      {lost ? (
        <div className="flex items-center gap-3 border-b border-red-200 bg-red-50 px-4 py-2 text-sm">
          <b>Connection lost.</b>
          <span>The demo screen stopped updating.</span>
          <span className="flex-1" />
          <Button size="sm" onClick={onRestart}>
            Restart demo
          </Button>
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:h-[calc(100vh-52px)] lg:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]">
        <Card className="flex min-h-0 flex-col gap-0 overflow-hidden py-0">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Badge variant={browserError ? "destructive" : browser ? "success" : "secondary"}>
              <span
                className={`size-2 rounded-full ${browserError ? "bg-red-600" : browser ? "bg-green-600" : "bg-neutral-400"}`}
              />
              {browserError ? "Not connected" : browser ? "Live" : "Loading"}
            </Badge>
            <span className="text-xs text-muted-foreground">View only. The agent controls this screen.</span>
          </div>
          <div className="relative m-3 flex min-h-[240px] flex-1 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-neutral-300 bg-[repeating-linear-gradient(45deg,#fafafa_0_12px,#f5f5f5_12px_24px)] lg:min-h-0">
            {browserError ? (
              <div className="px-6 text-center">
                <p className="font-semibold text-neutral-600">Live view failed</p>
                <p className="mt-1 text-sm text-muted-foreground">{browserError}</p>
              </div>
            ) : !browser ? (
              <div className="px-6 text-center">
                <p className="font-semibold text-neutral-600">Live view</p>
                <p className="mt-1 text-sm text-muted-foreground">Opening google.com…</p>
              </div>
            ) : (
              <iframe
                title="Google live view"
                src={browser.liveViewUrl}
                className="absolute inset-0 h-full w-full border-0 pointer-events-none"
                allow="clipboard-read"
              />
            )}
            <span className="absolute right-2.5 bottom-2.5 rounded-md border bg-white/90 px-2 py-0.5 text-xs text-neutral-600">
              Demo session. Not your data.
            </span>
            {lost ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-white/80">
                <Card className="max-w-[280px] gap-0 py-0">
                  <div className="p-4 text-center">
                    <p className="font-semibold">Connection lost</p>
                    <p className="mt-1 text-xs text-muted-foreground">The screen stopped updating.</p>
                    <Button size="sm" className="mt-2.5" onClick={onRestart}>
                      Restart demo
                    </Button>
                  </div>
                </Card>
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col gap-0 overflow-hidden py-0">
          <div className="border-b px-3 py-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Google search</p>
              <span className="text-xs text-muted-foreground">
                {searches.length ? `${searches.length} search${searches.length === 1 ? "" : "es"}` : "Watch only"}
              </span>
            </div>
          </div>
          <div ref={txRef} className="flex min-h-[240px] flex-1 flex-col gap-2 overflow-auto p-3 lg:min-h-0" aria-live="polite">
            {lines.length === 0 ? (
              <p className="self-center text-xs text-muted-foreground">
                {connected ? "The guide will speak first." : "Connecting the AI guide…"}
              </p>
            ) : (
              lines.map((line, i) => (
                <div
                  key={`${i}-${line.text.slice(0, 16)}`}
                  className={`max-w-[88%] rounded-[10px] px-3 py-2 text-sm ${
                    line.role === "user" ? "self-end bg-foreground text-background" : "self-start bg-neutral-100"
                  }`}
                >
                  {line.role === "agent" ? (
                    <span className="mb-0.5 block text-[11px] text-muted-foreground">
                      Agent{isMuted ? "" : " · voice and text"}
                    </span>
                  ) : null}
                  {line.text}
                </div>
              ))
            )}
            {connected && awaiting && lines.at(-1)?.role !== "agent" ? (
              <div className="max-w-[88%] self-start rounded-[10px] bg-neutral-100 px-3 py-2">
                <span className="demo-typing">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            ) : null}
          </div>
          {connected ? (
            <div className="flex flex-wrap gap-1.5 px-3 pb-2">
              {CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="rounded-full border bg-background px-2.5 py-0.5 text-xs hover:bg-neutral-100"
                  onClick={() => onSend(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex items-center gap-2 border-t px-3 py-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border bg-background px-2 py-0.5 text-xs ${isSpeaking ? "demo-speaking" : ""}`}
            >
              <span className="demo-wave">
                <i />
                <i />
                <i />
                <i />
              </span>
              {agentLabel}
            </span>
            <span className="flex-1" />
            <button
              type="button"
              aria-pressed={isMuted}
              onClick={onToggleMute}
              className={`inline-flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-2 text-[13px] ${
                isMuted ? "border-red-200 bg-red-50 text-red-600" : ""
              }`}
            >
              {isMuted ? "Muted. Unmute" : "Voice on. Mute"}
            </button>
          </div>
          {voiceError ? <p className="px-3 pb-2 text-xs text-red-600">{voiceError}</p> : null}
          <div className="flex items-center gap-2 px-3 pb-3">
            <Input
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              placeholder={connected ? "Type a question, or a search" : "Connecting…"}
              disabled={!connected}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSend();
                }
              }}
            />
            <Button type="button" onClick={() => onSend()} disabled={!connected || !draft.trim()}>
              Send
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

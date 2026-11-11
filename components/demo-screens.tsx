"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Volume2, VolumeX } from "lucide-react";
import type { RefObject } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  Alert,
  AlertBody,
  AlertHeader,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  FastbreakLogo,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  PageHeader,
  Separator,
  Spinner,
} from "@fastbreak-amateur/fb-toolkit/client";

export const PREP_STEPS = [
  "Saving your email",
  "Opening google.com",
  "Starting the live view",
  "Starting the AI agent",
] as const;

const emailSchema = z.object({
  email: z.string().email("Enter an email like name@company.com."),
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

function BrandMark() {
  return (
    <span className="inline-flex items-center gap-2 font-bold">
      <FastbreakLogo className="h-5 w-auto" />
      <span>
        Fastbreak <span className="font-normal text-muted-foreground">AI Demo</span>
      </span>
    </span>
  );
}

export function DashboardScreen({ onStartDemo }: { onStartDemo: () => void }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex h-[52px] items-center gap-3.5 border-b bg-background px-6">
        <BrandMark />
      </header>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
        <PageHeader title="Dashboard" />
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-xl font-semibold">Take our AI demo</CardTitle>
              <Badge variant="secondary">3-minute live walkthrough</Badge>
            </div>
            <CardDescription>
              Watch an AI agent control a live browser and run Google searches in real time while
              walking you through the results.
            </CardDescription>
          </CardHeader>
          <CardFooter className="items-start">
            <Button size="lg" onClick={onStartDemo}>
              Take our AI demo
            </Button>
          </CardFooter>
        </Card>
      </main>
    </div>
  );
}

export function EmailGate({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: (email: string) => void;
}) {
  const form = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-[420px]">
        <CardHeader>
          <div className="mb-2">
            <BrandMark />
          </div>
          <CardTitle className="text-xl font-semibold">Watch a live Fastbreak AI demo</CardTitle>
          <CardDescription>
            See the AI agent search Google on a live screen. The session lasts up to 3 minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="info">
            <AlertBody>
              Your guide is an AI agent, not a person. It speaks, responds to your questions, and
              controls the screen while you watch.
            </AlertBody>
          </Alert>
          <Form {...form}>
            <form
              className="space-y-4"
              noValidate
              onSubmit={form.handleSubmit((values) => onContinue(values.email))}
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder="you@company.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={onBack}>
                  Back
                </Button>
                <Button type="submit" className="flex-1">
                  Start demo
                </Button>
              </div>
            </form>
          </Form>
          <p className="text-xs text-muted-foreground">
            We use your email for this session only. This POC does not save it.
          </p>
        </CardContent>
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
      <Card className="w-full max-w-[420px]">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Setting up your demo</CardTitle>
          <CardDescription>This takes 10 to 30 seconds.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
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
                    {run ? <Spinner className="size-3.5" /> : null}
                  </span>
                  {label}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">{prepTick}s</p>
          {prepSlow ? (
            <Alert variant="warning">
              <AlertBody className="flex items-center justify-between gap-2">
                <span>Setup is taking longer than normal.</span>
                <Button size="sm" variant="outline" onClick={onRetry}>
                  Try again
                </Button>
              </AlertBody>
            </Alert>
          ) : null}
        </CardContent>
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
      <Card className="w-full max-w-[560px]">
        <CardHeader>
          <div className="mb-2">
            <BrandMark />
          </div>
          <CardTitle className="text-xl font-semibold">
            {endedByCap ? "The demo reached its 3-minute limit" : "Demo finished"}
          </CardTitle>
          <CardDescription>
            Thanks for watching the live AI demo. Here is a summary of your session.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border bg-muted/40 p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">What you saw</p>
              <Badge variant="outline">Session summary</Badge>
            </div>
            <ul className="mt-2 list-disc space-y-0.5 pl-4 text-sm">
              {searches.length ? (
                searches.map((q) => <li key={q}>Google search: {q}</li>)
              ) : (
                <li className="text-muted-foreground">No searches run.</li>
              )}
            </ul>
            <Separator className="my-3" />
            <p className="font-semibold">Your messages</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm">
              {questions.length ? (
                questions.map((q, i) => <li key={`${i}-${q.text}`}>{q.text}</li>)
              ) : (
                <li className="text-muted-foreground">No messages sent.</li>
              )}
            </ul>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Session email: {email}</p>
            <Button variant="outline" size="sm" onClick={onStartOver}>
              Back to dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
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
        <BrandMark />
        <span className="flex-1" />
        <span className="hidden text-sm text-muted-foreground sm:inline">
          Time left <b className="text-foreground">{fmt(secs)}</b>
        </span>
        <Button variant="outline" size="sm" onClick={onEnd}>
          End demo
        </Button>
      </header>
      {warn ? (
        <Alert variant="warning" className="rounded-none border-b px-4 py-2">
          <AlertBody className="flex items-center justify-between gap-3">
            <span>
              <b>1 minute left.</b> The demo ends at 3 minutes.
            </span>
            <Button variant="outline" size="sm" onClick={onEnd}>
              End now
            </Button>
          </AlertBody>
        </Alert>
      ) : null}
      {lost ? (
        <Alert variant="error" className="rounded-none border-b px-4 py-2">
          <AlertBody className="flex items-center justify-between gap-3">
            <span>
              <b>Connection lost.</b> The demo screen stopped updating.
            </span>
            <Button size="sm" onClick={onRestart}>
              Restart demo
            </Button>
          </AlertBody>
        </Alert>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:h-[calc(100vh-52px)] lg:grid-cols-[minmax(0,7fr)_minmax(320px,3fr)]">
        <Card className="flex min-h-0 flex-col gap-0 overflow-hidden py-0">
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Badge variant={browserError ? "destructive" : browser ? "success" : "secondary"}>
              {browserError ? "Not connected" : browser ? "Live" : "Loading"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              View only. The AI agent controls this screen.
            </span>
          </div>
          <div className="relative m-3 flex min-h-[240px] flex-1 items-center justify-center overflow-hidden rounded-lg border bg-muted/30 lg:min-h-0">
            {browserError ? (
              <div className="px-6 text-center">
                <p className="font-semibold">Live view failed</p>
                <p className="mt-1 text-sm text-muted-foreground">{browserError}</p>
              </div>
            ) : !browser ? (
              <div className="flex flex-col items-center gap-2 px-6 text-center">
                <Spinner className="size-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Opening google.com...</p>
              </div>
            ) : (
              <iframe
                title="Google live view"
                src={browser.liveViewUrl}
                className="pointer-events-none absolute inset-0 h-full w-full border-0"
                allow="clipboard-read"
              />
            )}
            {lost ? (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80">
                <Card className="max-w-[280px]">
                  <CardContent className="space-y-2 text-center">
                    <p className="font-semibold">Connection lost</p>
                    <p className="text-xs text-muted-foreground">The screen stopped updating.</p>
                    <Button size="sm" onClick={onRestart}>
                      Restart demo
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="flex min-h-0 flex-col gap-0 overflow-hidden py-0">
          <div className="flex items-center justify-between border-b px-3 py-2.5">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">AI Agent</p>
              <Badge variant="outline" className={isSpeaking ? "demo-speaking" : ""}>
                <span className="demo-wave mr-1">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                {agentLabel}
              </Badge>
            </div>
            <Button
              type="button"
              variant={isMuted ? "destructive" : "outline"}
              size="sm"
              aria-pressed={isMuted}
              onClick={onToggleMute}
            >
              {isMuted ? <VolumeX className="mr-1.5 size-3.5" /> : <Volume2 className="mr-1.5 size-3.5" />}
              {isMuted ? "Unmute" : "Mute"}
            </Button>
          </div>

          <div
            ref={txRef}
            className="flex min-h-[240px] flex-1 flex-col gap-2 overflow-auto p-3 lg:min-h-0"
            aria-live="polite"
          >
            {lines.length === 0 ? (
              <p className="self-center text-xs text-muted-foreground">
                {connected ? "The AI agent will speak first." : "Connecting the AI agent..."}
              </p>
            ) : (
              lines.map((line, i) => (
                <div
                  key={`${i}-${line.text.slice(0, 16)}`}
                  className={`max-w-[88%] rounded-[10px] px-3 py-2 text-sm ${
                    line.role === "user"
                      ? "self-end bg-foreground text-background"
                      : "self-start bg-muted"
                  }`}
                >
                  {line.text}
                </div>
              ))
            )}
            {connected && awaiting && lines.at(-1)?.role !== "agent" ? (
              <div className="max-w-[88%] self-start rounded-[10px] bg-muted px-3 py-2">
                <span className="demo-typing">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            ) : null}
          </div>

          {voiceError ? (
            <div className="px-3 pb-2">
              <Alert variant="error">
                <AlertHeader className="text-xs">{voiceError}</AlertHeader>
              </Alert>
            </div>
          ) : null}

          <div className="flex items-center gap-2 border-t p-3">
            <Input
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              placeholder={
                connected
                  ? searches.length
                    ? "Ask a question or try another search..."
                    : "Ask the AI agent to search Google..."
                  : "Connecting..."
              }
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

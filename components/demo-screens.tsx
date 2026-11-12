"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  Calendar,
  Check,
  ChevronDown,
  MapPin,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
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
  Spinner,
} from "@fastbreak-amateur/fb-toolkit/client";

export const PREP_STEPS = [
  { key: "agent", label: "Connecting the AI agent" },
  { key: "session", label: "Allocating cloud browser" },
  { key: "google", label: "Opening google.com" },
  { key: "live", label: "Starting the live view" },
] as const;

export type PrepStepKey = (typeof PREP_STEPS)[number]["key"];
export type PrepStepStatus = "pending" | "running" | "done" | "error";

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
        Fastbreak <span className="font-normal text-muted-foreground">AI</span>
      </span>
    </span>
  );
}

const SOLUTIONS = [
  {
    icon: Trophy,
    title: "Amateur & Youth Sports",
    description:
      "Powerful registration, scheduling, ticketing, and event management for youth, high school, and amateur sports leagues & tournaments.",
  },
  {
    icon: Calendar,
    title: "Professional Sports",
    description:
      "Advanced AI schedule creation and optimization for leagues with Pro Schedule, and teams with Perform.",
  },
  {
    icon: Building2,
    title: "Brands & Agencies",
    description:
      "Connect with youth athletes and their families through scalable on-site activations, branded experiences, and tournament sponsorships.",
  },
  {
    icon: MapPin,
    title: "Sports Tourism",
    description:
      "Maximize tourism revenue and strengthen relationships with event organizers through real-time, event-specific impact analysis.",
  },
] as const;

const PILLARS = [
  {
    title: "Smarter Scheduling",
    description: "AI-driven optimization for fairness and efficiency.",
  },
  {
    title: "Less Travel, More Play",
    description: "Reduce unnecessary travel to lower costs and fatigue.",
  },
  {
    title: "Maximize Revenue",
    description: "Integrate sponsors to fund more events and programs.",
  },
  {
    title: "Seamless Operations",
    description: "Streamline logistics and simplify event management.",
  },
] as const;

export function DashboardScreen({ onStartDemo }: { onStartDemo: () => void }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <div className="rounded-b-[48px] bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 pb-16 text-white">
        <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            <span className="inline-flex items-center gap-2 font-bold text-white">
              <FastbreakLogo className="h-5 w-auto" />
              <span>
                Fastbreak <span className="font-normal text-cyan-300">AI</span>
              </span>
            </span>
            <nav className="hidden items-center gap-6 text-sm font-medium text-slate-300 md:flex">
              <span className="inline-flex items-center gap-1 hover:text-white">
                Pro Sports <ChevronDown className="size-3.5" />
              </span>
              <span className="inline-flex items-center gap-1 hover:text-white">
                Amateur & Youth <ChevronDown className="size-3.5" />
              </span>
              <span className="hover:text-white">Brands</span>
              <span className="hover:text-white">Tourism</span>
              <span className="inline-flex items-center gap-1 hover:text-white">
                Company <ChevronDown className="size-3.5" />
              </span>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              className="border-cyan-400/40 bg-white/10 text-white hover:bg-white/20"
              onClick={onStartDemo}
            >
              <Sparkles className="mr-1.5 size-3.5 text-cyan-300" />
              Take our AI demo
            </Button>
            <Button size="sm">Contact sales</Button>
          </div>
        </header>

        <section className="mx-auto mt-10 grid max-w-6xl grid-cols-1 items-center gap-10 px-6 lg:grid-cols-12">
          <div className="space-y-5 lg:col-span-7">
            <Badge className="bg-cyan-400/15 text-cyan-300 hover:bg-cyan-400/20">
              Pro + Youth Sports Operations & Scheduling
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
              AI-powered software for the people who make sports exceptional
            </h1>
            <p className="max-w-xl text-base text-slate-300">
              Intelligent software for sports league scheduling, tournament management, travel,
              ticketing, and experiential sponsorship for brands.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button size="lg" onClick={onStartDemo}>
                <Sparkles className="mr-2 size-4" />
                Take our AI demo
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/25 bg-white/5 text-white hover:bg-white/15"
              >
                Explore solutions
              </Button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <Card className="border-white/15 bg-white/95 text-foreground shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="success">Live Interactive POC</Badge>
                  <span className="text-xs text-muted-foreground">3-minute session</span>
                </div>
                <CardTitle className="mt-2 text-lg font-semibold">
                  Try the live Fastbreak AI agent
                </CardTitle>
                <CardDescription>
                  Watch our AI agent control a live browser and answer questions in real time.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                  <Users className="size-4 text-primary" />
                  <span>Voice + text walkthrough with an AI agent</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
                  <Sparkles className="size-4 text-primary" />
                  <span>Live watch-only browser session</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" size="lg" onClick={onStartDemo}>
                  Take our AI demo
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>
      </div>

      <section className="mx-auto w-full max-w-6xl px-6 py-14">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-wider text-primary uppercase">
            01 · Select Your Interest
          </p>
          <h2 className="mt-1 text-2xl font-bold">AI-driven solutions to power your game</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            From professional leagues to youth tournaments, Fastbreak helps you optimize
            scheduling, enhance engagement, and maximize impact.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SOLUTIONS.map(({ icon: Icon, title, description }) => (
            <Card key={title}>
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t bg-muted/30 py-14">
        <div className="mx-auto w-full max-w-6xl px-6">
          <p className="text-xs font-semibold tracking-wider text-primary uppercase">
            02 · Why Fastbreak
          </p>
          <h2 className="mt-1 text-2xl font-bold">Optimizing sports operations</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Each product is purpose-built to simplify operations, unlock new revenue, and help
            organizations run faster, smarter, and more efficiently.
          </p>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((pillar) => (
              <Card key={pillar.title}>
                <CardHeader>
                  <CardTitle>{pillar.title}</CardTitle>
                  <CardDescription>{pillar.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>
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
  stepStatus,
  prepTick,
  prepSlow,
  prepError,
  onRetry,
}: {
  stepStatus: Record<PrepStepKey, PrepStepStatus>;
  prepTick: number;
  prepSlow: boolean;
  prepError?: string | null;
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
            {PREP_STEPS.map(({ key, label }) => {
              const status = stepStatus[key];
              const done = status === "done";
              const run = status === "running";
              const err = status === "error";
              return (
                <div
                  key={key}
                  className={`flex items-center gap-2.5 py-1.5 text-sm ${
                    err ? "text-destructive" : run || done ? "" : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      done
                        ? "border-foreground bg-foreground text-background"
                        : err
                          ? "border-destructive text-destructive"
                          : run
                            ? "border-foreground"
                            : "border-neutral-300"
                    }`}
                  >
                    {done ? <Check className="size-3" /> : null}
                    {run ? <Spinner className="size-3.5" /> : null}
                    {err ? <span className="text-xs font-bold leading-none">!</span> : null}
                  </span>
                  {label}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">{prepTick}s</p>
          {prepError ? (
            <Alert variant="error">
              <AlertBody className="flex items-center justify-between gap-2">
                <span>{prepError}</span>
                <Button size="sm" variant="outline" onClick={onRetry}>
                  Try again
                </Button>
              </AlertBody>
            </Alert>
          ) : prepSlow ? (
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
  onStartOver,
}: {
  email: string;
  endedByCap: boolean;
  onStartOver: () => void;
}) {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-[440px]">
        <CardHeader>
          <div className="mb-2">
            <BrandMark />
          </div>
          <CardTitle className="text-xl font-semibold">
            {endedByCap ? "The demo reached its 3-minute limit" : "Demo finished"}
          </CardTitle>
          <CardDescription>
            Thanks for watching the live Fastbreak AI demo.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex-row items-center justify-between border-t pt-4">
          <p className="text-xs text-muted-foreground">{email}</p>
          <Button variant="outline" size="sm" onClick={onStartOver}>
            Back to home
          </Button>
        </CardFooter>
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
  searchingQuery,
  starterPrompts,
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
  searchingQuery: string | null;
  starterPrompts: readonly string[];
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
  const inputLocked = !connected || Boolean(searchingQuery) || awaiting;

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
            {searchingQuery ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Spinner className="size-3.5" />
                Searching Google for &ldquo;{searchingQuery}&rdquo;...
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                View only. The AI agent controls this screen.
              </span>
            )}
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
            {searchingQuery ? (
              <div className="flex items-center gap-2.5 self-start rounded-[10px] border bg-muted/60 px-3 py-2 text-xs text-foreground">
                <Spinner className="size-3.5 shrink-0" />
                <span>
                  Running live Google search for <b>&ldquo;{searchingQuery}&rdquo;</b>...
                </span>
              </div>
            ) : connected && awaiting && lines.at(-1)?.role !== "agent" ? (
              <div className="max-w-[88%] self-start rounded-[10px] bg-muted px-3 py-2">
                <span className="demo-typing">
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            ) : null}
            {connected && lines.length > 0 && searches.length === 0 && !searchingQuery && !awaiting ? (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {starterPrompts.map((prompt) => (
                  <Button
                    key={prompt}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto py-1 text-left text-xs whitespace-normal"
                    onClick={() => onSend(prompt)}
                  >
                    {prompt}
                  </Button>
                ))}
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

          {searchingQuery ? (
            <div className="flex items-center gap-2 border-t bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
              <Spinner className="size-3 shrink-0" />
              <span>Browser search in progress. Input is paused until results load.</span>
            </div>
          ) : null}

          <div className="flex items-center gap-2 border-t p-3">
            <Input
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              placeholder={
                !connected
                  ? "Connecting..."
                  : searchingQuery
                    ? "Searching live screen, please wait..."
                    : awaiting
                      ? "AI agent is responding..."
                      : searches.length
                        ? "Ask a question or try another search..."
                        : "Share your name or a topic to search..."
              }
              disabled={inputLocked}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSend();
                }
              }}
            />
            <Button type="button" onClick={() => onSend()} disabled={inputLocked || !draft.trim()}>
              Send
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

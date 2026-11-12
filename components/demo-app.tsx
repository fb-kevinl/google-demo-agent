"use client";

import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { FIRST_MESSAGE, STARTER_PROMPTS } from "@/lib/agent-config";
import { createAgentSpeech, unlockDemoAudio } from "@/lib/agent-speech";
import {
  DashboardScreen,
  DemoLayout,
  EmailGate,
  EndScreen,
  PrepScreen,
  type BrowserState,
  type Line,
  type PrepStepKey,
  type PrepStepStatus,
} from "./demo-screens";

const CAP_SECS = 180; // ponytail: 3-min cap while on free Browserbase tier; bump to 600+ with api_timeout in lib/browser.ts for full 10-min demos
type Phase = "prep" | "demo" | "end";

const INITIAL_STEPS: Record<PrepStepKey, PrepStepStatus> = {
  session: "running",
  google: "pending",
  live: "pending",
  agent: "running",
};

export function DemoApp() {
  const [started, setStarted] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  if (!started) {
    return <DashboardScreen onStartDemo={() => setStarted(true)} />;
  }

  if (!email) {
    return (
      <EmailGate
        onBack={() => setStarted(false)}
        onContinue={(value) => {
          unlockDemoAudio();
          setEmail(value);
        }}
      />
    );
  }

  return (
    <DemoSession
      email={email}
      onStartOver={() => {
        setEmail(null);
        setStarted(false);
      }}
    />
  );
}

function DemoSession({ email, onStartOver }: { email: string; onStartOver: () => void }) {
  const sessionRef = useRef<string | null>(null);
  const [searches, setSearches] = useState<string[]>([]);
  const [searchingQuery, setSearchingQuery] = useState<string | null>(null);
  const lastSearchRef = useRef<{ query: string; promise: Promise<string> } | null>(null);
  const resetSearchState = useCallback(() => {
    setSearches([]);
    setSearchingQuery(null);
    lastSearchRef.current = null;
  }, []);
  const searchGoogle = useCallback(async (parameters: Record<string, unknown>) => {
    const query = String(parameters.query ?? "").trim();
    if (!query) return "Empty query. Ask the visitor what to search.";
    if (lastSearchRef.current?.query.toLowerCase() === query.toLowerCase()) {
      return lastSearchRef.current.promise;
    }
    setSearches((prev) => [...prev, query]);
    setSearchingQuery(query);
    const promise = (async () => {
      try {
        const res = await fetch("/api/browser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "search", query, sessionId: sessionRef.current }),
        });
        const data = (await res.json()) as { narration?: string };
        return data.narration || "Search returned nothing visible. Park it.";
      } finally {
        setSearchingQuery(null);
      }
    })();
    lastSearchRef.current = { query, promise };
    return promise;
  }, []);

  return (
    <ConversationProvider clientTools={{ searchGoogle }}>
      <SessionShell
        email={email}
        sessionRef={sessionRef}
        searches={searches}
        searchingQuery={searchingQuery}
        onResetSearch={resetSearchState}
        onStartOver={onStartOver}
      />
    </ConversationProvider>
  );
}

function SessionShell({
  email,
  sessionRef,
  searches,
  searchingQuery,
  onResetSearch,
  onStartOver,
}: {
  email: string;
  sessionRef: { current: string | null };
  searches: string[];
  searchingQuery: string | null;
  onResetSearch: () => void;
  onStartOver: () => void;
}) {
  const speakReplyRef = useRef<(text: string) => void>(() => {});
  const greetedRef = useRef(false);
  const warnPromptedRef = useRef(false);
  const conversation = useConversation({
    onMessage: (payload) => {
      const text = payload.message?.trim();
      if (!text || payload.role === "user") return;
      if (greetedRef.current && text === FIRST_MESSAGE) return;
      greetedRef.current = true;
      setAwaiting(false);
      setLines((prev) => [...prev, { role: "agent", text }]);
      speakReplyRef.current(text);
    },
    onError: (message) => setVoiceError(message),
  });
  const conversationRef = useRef(conversation);
  conversationRef.current = conversation;
  const [phase, setPhase] = useState<Phase>("prep");
  const [endedByCap, setEndedByCap] = useState(false);
  const [stepStatus, setStepStatus] = useState<Record<PrepStepKey, PrepStepStatus>>(INITIAL_STEPS);
  const [prepSlow, setPrepSlow] = useState(false);
  const [prepTick, setPrepTick] = useState(0);
  const [runId, setRunId] = useState(0);
  const [browser, setBrowser] = useState<BrowserState | null>(null);
  const [browserError, setBrowserError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [secs, setSecs] = useState(CAP_SECS);
  const [hadVoice, setHadVoice] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [awaiting, setAwaiting] = useState(false);
  const txRef = useRef<HTMLDivElement>(null);
  const speechRef = useRef(createAgentSpeech(setSpeaking));
  const connected = conversation.status === "connected";
  const lost =
    Boolean(browserError) ||
    (phase === "demo" && hadVoice && conversation.status === "disconnected");

  useEffect(() => {
    if (connected) {
      setHadVoice(true);
      setStepStatus((prev) => (prev.agent === "done" ? prev : { ...prev, agent: "done" }));
    }
  }, [connected]);

  const stopBrowser = useCallback(() => {
    const id = sessionRef.current;
    sessionRef.current = null;
    if (!id) return;
    void fetch("/api/browser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop", sessionId: id }),
      keepalive: true,
    });
  }, [sessionRef]);

  speakReplyRef.current = (text: string) => {
    void (async () => {
      try {
        const res = await fetch("/api/speak", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        if (!res.ok) throw new Error("Speech failed.");
        speechRef.current.speak(await res.blob());
      } catch {
        setVoiceError("The AI agent can chat, but speech did not play.");
      }
    })();
  };

  const connectVoice = useCallback(async () => {
    const conv = conversationRef.current;
    setVoiceError(null);
    const res = await fetch("/api/conversation");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not start the agent.");
    await conv.startSession({
      signedUrl: data.signedUrl,
      connectionType: "websocket",
      textOnly: true,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setBrowser(null);
    setBrowserError(null);
    setLines([]);
    onResetSearch();
    greetedRef.current = false;
    warnPromptedRef.current = false;
    setHadVoice(false);
    setMuted(false);
    setStepStatus(INITIAL_STEPS);
    setPrepSlow(false);
    setPrepTick(0);
    setPhase("prep");
    speechRef.current = createAgentSpeech(setSpeaking);

    const startBrowser = async () => {
      try {
        const res = await fetch("/api/browser", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start" }),
        });
        if (!res.ok || !res.body) {
          const data = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error || "Could not start the live view.");
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const chunks = buffer.split("\n");
          buffer = chunks.pop() ?? "";
          for (const line of chunks) {
            if (!line.trim()) continue;
            const event = JSON.parse(line) as
              | { type: "step"; step: "session" | "google" | "live" }
              | ({ type: "done" } & BrowserState)
              | { type: "error"; error: string };
            if (event.type === "step") {
              if (cancelled) continue;
              setStepStatus((prev) => {
                if (event.step === "session") {
                  return { ...prev, session: "done", google: "running" };
                }
                if (event.step === "google") {
                  return { ...prev, session: "done", google: "done", live: "running" };
                }
                return { ...prev, session: "done", google: "done", live: "done" };
              });
            } else if (event.type === "done") {
              if (cancelled) {
                void fetch("/api/browser", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "stop", sessionId: event.sessionId }),
                  keepalive: true,
                });
                return;
              }
              sessionRef.current = event.sessionId;
              setBrowser({
                sessionId: event.sessionId,
                liveViewUrl: event.liveViewUrl,
                message: event.message,
              });
            } else if (event.type === "error") {
              throw new Error(event.error);
            }
          }
        }
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Could not start the live view.";
        setBrowserError(message);
        setStepStatus((prev) => ({
          ...prev,
          session: prev.session === "running" ? "error" : prev.session,
          google: prev.google === "running" ? "error" : prev.google,
          live: prev.live === "running" ? "error" : prev.live,
        }));
      }
    };

    const startAgent = async () => {
      try {
        await connectVoice();
        if (!cancelled) {
          setStepStatus((prev) => ({ ...prev, agent: "done" }));
        }
      } catch (error) {
        if (cancelled) return;
        setVoiceError(error instanceof Error ? error.message : "Could not reach the agent.");
        setStepStatus((prev) => ({ ...prev, agent: "error" }));
      }
    };

    void Promise.all([startBrowser(), startAgent()]);

    return () => {
      cancelled = true;
      speechRef.current.stop();
      stopBrowser();
      const conv = conversationRef.current;
      if (conv.status === "connected") conv.endSession();
    };
  }, [runId, connectVoice, onResetSearch, sessionRef, stopBrowser]);

  useEffect(() => {
    if (phase !== "prep") return;
    const started = Date.now();
    const id = window.setInterval(() => {
      setPrepTick(Math.floor((Date.now() - started) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [phase, runId]);

  useEffect(() => {
    if (phase === "prep" && prepTick >= 30) setPrepSlow(true);
  }, [phase, prepTick]);

  const allPrepDone =
    stepStatus.session === "done" &&
    stepStatus.google === "done" &&
    stepStatus.live === "done" &&
    stepStatus.agent === "done";

  useEffect(() => {
    if (phase !== "prep" || !allPrepDone) return;
    const id = window.setTimeout(() => setPhase("demo"), 300);
    return () => window.clearTimeout(id);
  }, [phase, allPrepDone]);

  useEffect(() => {
    if (phase !== "demo" || greetedRef.current) return;
    greetedRef.current = true;
    setLines([{ role: "agent", text: FIRST_MESSAGE }]);
    speakReplyRef.current(FIRST_MESSAGE);
  }, [phase]);

  useEffect(() => {
    if (phase !== "demo") return;
    setSecs(CAP_SECS);
    setEndedByCap(false);
    const endAt = Date.now() + CAP_SECS * 1000;
    const id = window.setInterval(() => {
      const rem = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setSecs(rem);
      if (rem === 0) {
        window.clearInterval(id);
        setEndedByCap(true);
        setPhase("end");
        conversationRef.current.endSession();
        speechRef.current.stop();
        stopBrowser();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, stopBrowser]);

  useEffect(() => {
    if (
      phase !== "demo" ||
      !warn ||
      !connected ||
      searchingQuery ||
      awaiting ||
      warnPromptedRef.current
    ) {
      return;
    }
    warnPromptedRef.current = true;
    setAwaiting(true);
    conversationRef.current.sendUserMessage(
      "[SYSTEM: 1 minute left in the 3-minute demo. Proactively check in with the visitor (use their name if known), let them know one minute remains, briefly recap what we have searched so far, and invite them to run one final Google search or ask a last question.]",
    );
  }, [phase, warn, connected, searchingQuery, awaiting]);

  useEffect(() => {
    txRef.current?.scrollTo({ top: txRef.current.scrollHeight });
  }, [lines, searchingQuery, awaiting]);

  function sendText(text = draft) {
    const value = text.trim();
    if (!value || !connected || searchingQuery || awaiting) return;
    setAwaiting(true);
    setLines((prev) => [...prev, { role: "user", text: value }]);
    conversation.sendUserMessage(value);
    setDraft("");
  }

  function handleDraft(value: string) {
    setDraft(value);
    if (connected && value.trim()) {
      conversation.sendUserActivity();
    }
  }

  function endDemo(cap = false) {
    setEndedByCap(cap);
    setPhase("end");
    conversation.endSession();
    speechRef.current.stop();
    stopBrowser();
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    speechRef.current.setMuted(next);
  }

  if (phase === "prep") {
    return (
      <PrepScreen
        stepStatus={stepStatus}
        prepTick={prepTick}
        prepSlow={prepSlow}
        prepError={browserError || voiceError}
        onRetry={() => setRunId((n) => n + 1)}
      />
    );
  }

  if (phase === "end") {
    return (
      <EndScreen
        email={email}
        endedByCap={endedByCap}
        onStartOver={onStartOver}
      />
    );
  }

  const agentLabel = muted ? "Muted" : speaking ? "Speaking" : connected ? "Listening" : "Connecting";

  return (
    <DemoLayout
      secs={secs}
      warn={secs <= 60}
      lost={lost}
      browser={browser}
      browserError={browserError}
      searches={searches}
      lines={lines}
      draft={draft}
      connected={connected}
      isSpeaking={speaking}
      isMuted={muted}
      awaiting={awaiting}
      agentLabel={agentLabel}
      voiceError={voiceError}
      txRef={txRef}
      onEnd={() => endDemo(false)}
      onRestart={() => setRunId((n) => n + 1)}
      onToggleMute={toggleMute}
      onDraft={setDraft}
      onSend={sendText}
    />
  );
}

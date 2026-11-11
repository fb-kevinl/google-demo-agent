"use client";

import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { FIRST_MESSAGE } from "@/lib/agent-config";
import { createAgentSpeech, unlockDemoAudio } from "@/lib/agent-speech";
import {
  DemoLayout,
  EmailGate,
  EndScreen,
  PREP_STEPS,
  PrepScreen,
  type BrowserState,
  type Line,
} from "./demo-screens";

const CAP_SECS = 180; // ponytail: 3-min cap while on free Browserbase tier; bump to 600+ with api_timeout in lib/browser.ts for full 10-min demos
type Phase = "prep" | "demo" | "end";

function googleQuery(text: string) {
  return text
    .replace(/^(hey[,.]?\s+|please\s+|can you\s+|could you\s+)*/i, "")
    .replace(/^(search(\s+google)?(\s+for)?\s+|google(\s+for)?\s+|look up\s+|find\s+)/i, "")
    .replace(/[.?!]+$/, "")
    .trim();
}

export function DemoApp() {
  const [email, setEmail] = useState<string | null>(null);
  if (!email) {
    return (
      <EmailGate
        onContinue={(value) => {
          unlockDemoAudio();
          setEmail(value);
        }}
      />
    );
  }
  return <DemoSession email={email} onStartOver={() => setEmail(null)} />;
}

function DemoSession({ email, onStartOver }: { email: string; onStartOver: () => void }) {
  const sessionRef = useRef<string | null>(null);
  const [searches, setSearches] = useState<string[]>([]);
  const lastQuery = useRef("");
  const searchGoogle = useCallback(async (parameters: Record<string, unknown>) => {
    const query = String(parameters.query ?? "").trim();
    if (!query) return "Empty query. Ask the visitor what to search.";
    if (query === lastQuery.current) return `Already showing results for “${query}”.`;
    lastQuery.current = query;
    setSearches((prev) => [...prev, query]);
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
      <SessionShell
        email={email}
        sessionRef={sessionRef}
        searches={searches}
        searchGoogle={searchGoogle}
        onStartOver={onStartOver}
      />
    </ConversationProvider>
  );
}

function SessionShell({
  email,
  sessionRef,
  searches,
  searchGoogle,
  onStartOver,
}: {
  email: string;
  sessionRef: { current: string | null };
  searches: string[];
  searchGoogle: (parameters: Record<string, unknown>) => Promise<string>;
  onStartOver: () => void;
}) {
  const speakReplyRef = useRef<(text: string) => void>(() => {});
  const greetedRef = useRef(false);
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
  const [prepIndex, setPrepIndex] = useState(0);
  const [prepReady, setPrepReady] = useState(false);
  const [prepSlow, setPrepSlow] = useState(false);
  const [prepTick, setPrepTick] = useState(0);
  const [runId, setRunId] = useState(0);
  const [browser, setBrowser] = useState<BrowserState | null>(null);
  const [browserError, setBrowserError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const [secs, setSecs] = useState(CAP_SECS);
  const [warn, setWarn] = useState(false);
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
    if (connected) setHadVoice(true);
  }, [connected]);

  const stopBrowser = useCallback(() => {
    const id = sessionRef.current;
    sessionRef.current = null;
    if (!id) return;
    void fetch("/api/browser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "stop", sessionId: id }),
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
        setVoiceError("The guide can chat, but speech did not play.");
      }
    })();
  };

  const connectVoice = useCallback(async () => {
    const conv = conversationRef.current;
    setVoiceError(null);
    const res = await fetch("/api/conversation");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not start the agent.");
    conv.startSession({
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
    greetedRef.current = false;
    setHadVoice(false);
    setMuted(false);
    setPrepIndex(0);
    setPrepReady(false);
    setPrepSlow(false);
    setPrepTick(0);
    setPhase("prep");
    speechRef.current = createAgentSpeech(setSpeaking);
    void (async () => {
      const res = await fetch("/api/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      const data = await res.json();
      if (cancelled) {
        if (data.sessionId) {
          void fetch("/api/browser", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "stop", sessionId: data.sessionId }),
          });
        }
        return;
      }
      if (!res.ok) {
        setBrowserError(data.error || "Could not start the live view.");
      } else {
        sessionRef.current = data.sessionId;
        setBrowser({
          sessionId: data.sessionId,
          liveViewUrl: data.liveViewUrl,
          message: data.message,
        });
      }
      try {
        await connectVoice();
      } catch (error) {
        setVoiceError(error instanceof Error ? error.message : "Could not reach the agent.");
      }
      if (!cancelled) setPrepReady(true);
    })();
    return () => {
      cancelled = true;
      speechRef.current.stop();
      stopBrowser();
      const conv = conversationRef.current;
      if (conv.status === "connected") conv.endSession();
    };
  }, [runId, connectVoice, sessionRef, stopBrowser]);

  useEffect(() => {
    if (phase !== "prep") return;
    const started = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Date.now() - started;
      setPrepTick(Math.floor(elapsed / 1000));
      setPrepIndex(Math.min(PREP_STEPS.length - 1, Math.floor(elapsed / 800)));
    }, 100);
    return () => window.clearInterval(id);
  }, [phase, runId]);

  useEffect(() => {
    if (phase === "prep" && prepTick >= 30) setPrepSlow(true);
  }, [phase, prepTick]);

  useEffect(() => {
    if (phase !== "prep" || !prepReady || prepIndex < PREP_STEPS.length - 1) return;
    const id = window.setTimeout(() => setPhase("demo"), 400);
    return () => window.clearTimeout(id);
  }, [phase, prepReady, prepIndex]);

  useEffect(() => {
    if (phase !== "demo" || greetedRef.current) return;
    greetedRef.current = true;
    setLines([{ role: "agent", text: FIRST_MESSAGE }]);
    speakReplyRef.current(FIRST_MESSAGE);
  }, [phase]);

  useEffect(() => {
    if (phase !== "demo") return;
    setSecs(CAP_SECS);
    setWarn(false);
    setEndedByCap(false);
    const id = window.setInterval(() => {
      setSecs((prev) => {
        if (prev === 61) setWarn(true);
        if (prev <= 1) {
          setEndedByCap(true);
          setPhase("end");
          conversationRef.current.endSession();
          speechRef.current.stop();
          stopBrowser();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, stopBrowser]);

  useEffect(() => {
    txRef.current?.scrollTo({ top: txRef.current.scrollHeight });
  }, [lines]);

  function sendText(text = draft) {
    const value = text.trim();
    if (!value || !connected) return;
    setAwaiting(true);
    setLines((prev) => [...prev, { role: "user", text: value }]);
    conversation.sendUserMessage(value);
    setDraft("");
    const query = googleQuery(value);
    if (query) void searchGoogle({ query });
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
        prepIndex={prepIndex}
        prepTick={prepTick}
        prepSlow={prepSlow}
        onRetry={() => setRunId((n) => n + 1)}
      />
    );
  }

  if (phase === "end") {
    return (
      <EndScreen
        email={email}
        endedByCap={endedByCap}
        searches={searches}
        questions={lines.filter((l) => l.role === "user")}
        onStartOver={onStartOver}
      />
    );
  }

  const agentLabel = muted ? "Muted" : speaking ? "Speaking" : connected ? "Listening" : "Connecting";

  return (
    <DemoLayout
      secs={secs}
      warn={warn}
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

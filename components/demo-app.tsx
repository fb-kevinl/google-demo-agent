"use client";

import { ConversationProvider, useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  DemoLayout,
  EmailGate,
  EndScreen,
  PREP_STEPS,
  PrepScreen,
  type BrowserState,
  type Line,
} from "./demo-screens";

const CAP_SECS = 720;
type Phase = "prep" | "demo" | "end";

export function DemoApp() {
  const [email, setEmail] = useState<string | null>(null);
  if (!email) return <EmailGate onContinue={setEmail} />;
  return <DemoSession email={email} onStartOver={() => setEmail(null)} />;
}

function DemoSession({ email, onStartOver }: { email: string; onStartOver: () => void }) {
  const sessionRef = useRef<string | null>(null);
  const [mockQuery, setMockQuery] = useState("");
  const [searches, setSearches] = useState<string[]>([]);
  const searchGoogle = useCallback(async (parameters: Record<string, unknown>) => {
    const query = String(parameters.query ?? "");
    setMockQuery(query);
    if (query) setSearches((prev) => [...prev, query]);
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
        mockQuery={mockQuery}
        searches={searches}
        onStartOver={onStartOver}
      />
    </ConversationProvider>
  );
}

function SessionShell({
  email,
  sessionRef,
  mockQuery,
  searches,
  onStartOver,
}: {
  email: string;
  sessionRef: { current: string | null };
  mockQuery: string;
  searches: string[];
  onStartOver: () => void;
}) {
  const conversation = useConversation({
    onMessage: (payload) => {
      const text = payload.message?.trim();
      if (!text) return;
      setLines((prev) => [...prev, { role: payload.role, text }]);
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
  const [textOnly, setTextOnly] = useState(false);
  const [secs, setSecs] = useState(CAP_SECS);
  const [warn, setWarn] = useState(false);
  const [hadVoice, setHadVoice] = useState(false);
  const txRef = useRef<HTMLDivElement>(null);
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

  const connectVoice = useCallback(async () => {
    const conv = conversationRef.current;
    setVoiceError(null);
    let micOk = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      micOk = true;
    } catch {
      micOk = false;
    }
    setTextOnly(!micOk);
    const res = await fetch("/api/conversation");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not start the agent.");
    if (data.conversationToken) {
      conv.startSession({ conversationToken: data.conversationToken, textOnly: !micOk });
    } else {
      conv.startSession({
        signedUrl: data.signedUrl,
        connectionType: data.connectionType ?? "websocket",
        textOnly: !micOk,
      });
    }
    if (!micOk) setVoiceError("Microphone is blocked. The guide can chat but not speak.");
  }, []);

  useEffect(() => {
    let cancelled = false;
    setBrowser(null);
    setBrowserError(null);
    setLines([]);
    setHadVoice(false);
    setPrepIndex(0);
    setPrepReady(false);
    setPrepSlow(false);
    setPrepTick(0);
    setPhase("prep");
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
          mocked: data.mocked,
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
    if (phase !== "demo") return;
    setSecs(CAP_SECS);
    setWarn(false);
    setEndedByCap(false);
    const id = window.setInterval(() => {
      setSecs((prev) => {
        if (prev === 121) setWarn(true);
        if (prev <= 1) {
          setEndedByCap(true);
          setPhase("end");
          conversationRef.current.endSession();
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
    conversation.sendUserMessage(value);
    setDraft("");
  }

  function endDemo(cap = false) {
    setEndedByCap(cap);
    setPhase("end");
    conversation.endSession();
    stopBrowser();
  }

  function toggleMute() {
    const next = !conversation.isMuted;
    conversation.setMuted(next);
    conversation.setVolume({ volume: next ? 0 : 1 });
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

  const agentLabel = conversation.isMuted
    ? "Muted"
    : conversation.isSpeaking
      ? "Speaking"
      : connected
        ? "Listening"
        : "Connecting";

  return (
    <DemoLayout
      secs={secs}
      warn={warn}
      lost={lost}
      browser={browser}
      browserError={browserError}
      mockQuery={mockQuery}
      searches={searches}
      lines={lines}
      draft={draft}
      connected={connected}
      isSpeaking={conversation.isSpeaking}
      isMuted={conversation.isMuted}
      textOnly={textOnly}
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

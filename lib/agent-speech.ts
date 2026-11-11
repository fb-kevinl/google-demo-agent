/** Browser TTS playback for text-only agent replies. Unlock on a user click. */

let ctx: AudioContext | null = null;
let gain: GainNode | null = null;

function ensure() {
  if (ctx) return;
  ctx = new AudioContext();
  gain = ctx.createGain();
  gain.connect(ctx.destination);
}

export function unlockDemoAudio() {
  ensure();
  void ctx?.resume();
  if (!ctx || !gain) return;
  const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(gain);
  src.start(0);
}

export type AgentSpeech = {
  speak: (blob: Blob) => void;
  stop: () => void;
  setMuted: (muted: boolean) => void;
};

export function createAgentSpeech(onSpeaking: (speaking: boolean) => void): AgentSpeech {
  let muted = false;
  let queue: ArrayBuffer[] = [];
  let playing = false;
  let current: AudioBufferSourceNode | null = null;

  async function pump() {
    if (playing || muted || !ctx || !gain) return;
    const next = queue.shift();
    if (!next) {
      onSpeaking(false);
      return;
    }
    playing = true;
    onSpeaking(true);
    try {
      await ctx.resume();
      const audio = await ctx.decodeAudioData(next.slice(0));
      await new Promise<void>((resolve) => {
        const src = ctx!.createBufferSource();
        current = src;
        src.buffer = audio;
        src.connect(gain!);
        src.onended = () => resolve();
        src.start();
      });
    } catch {
      // Skip a bad chunk and keep the queue moving.
    } finally {
      current = null;
      playing = false;
      void pump();
    }
  }

  return {
    speak(blob) {
      if (muted) return;
      ensure();
      void blob.arrayBuffer().then((ab) => {
        queue.push(ab);
        void pump();
      });
    },
    stop() {
      queue = [];
      try {
        current?.stop();
      } catch {
        /* already ended */
      }
      current = null;
      playing = false;
      onSpeaking(false);
    },
    setMuted(next) {
      muted = next;
      if (gain) gain.gain.value = next ? 0 : 1;
      if (next) this.stop();
    },
  };
}

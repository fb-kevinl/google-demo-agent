# Fastbreak AI Demo

Watch-only AI demo POC: dashboard, email gate, setup screen, live demo where an ElevenLabs AI agent searches [google.com](https://www.google.com) in a Browserbase live view, and an end summary screen. Visitors never click the iframe.

UI uses `@fastbreak-amateur/fb-toolkit` 5.17.0 (GitHub Packages). Set `GITHUB_TOKEN` with `read:packages` before install.

## Run locally

```bash
export GITHUB_TOKEN=ghp_...   # read:packages for @fastbreak-amateur/fb-toolkit
pnpm install
cp .env.example .env.local
# fill ELEVENLABS_API_KEY, BROWSERBASE_API_KEY, ELEVENLABS_AGENT_ID
pnpm agent:push
pnpm dev
```

Open [http://localhost:4317](http://localhost:4317). Click **Take our AI demo**, enter any email (it is discarded), and ask the AI agent to search.

## ElevenLabs agent (`pnpm agent:push` / `pnpm agent:pull`)

All ElevenLabs agent configuration lives in `lib/agent-config.ts` and `kb/google-search.md`:

- **Push local config to ElevenLabs:** `pnpm agent:push`
  - Syncs `SYSTEM_PROMPT`, the `searchGoogle` client tool (`expects_response: true`, `response_timeout_secs: 30`, `pre_tool_speech: "force"`, `execution_mode: "immediate"`, `interruption_mode: "allow"`), built-in `skip_turn`, and uploads/attaches `kb/google-search.md` (`usage_mode: "prompt"`).
  - Leaves `first_message: ""` on the ElevenLabs server because `FIRST_MESSAGE` is injected locally by the client when the demo opens.
- **Inspect / pull remote config from ElevenLabs:** `pnpm agent:pull`

Restricted API key scopes required: ElevenAgents Read+Write, Voices Read, TTS Access, STT Access.

## Env

| Name | Role |
| --- | --- |
| `ELEVENLABS_API_KEY` | Secret. Conversation token, TTS, and `pnpm agent:push` / `pnpm agent:pull`. |
| `BROWSERBASE_API_KEY` | Secret. Cloud browser. The key selects the Browserbase project. |
| `ELEVENLABS_AGENT_ID` | Dashboard id (`agent_...`). |

Email is not persisted.

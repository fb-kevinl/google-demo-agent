# Fastbreak AI Demo

Watch-only AI demo POC: dashboard, email gate, setup screen, live demo where an ElevenLabs AI agent searches [google.com](https://www.google.com) in a Browserbase live view, and an end summary screen. Visitors never click the iframe.

UI uses `@fastbreak-amateur/fb-toolkit` 5.17.0 (GitHub Packages). Set `GITHUB_TOKEN` with `read:packages` before install.

## Run locally

```bash
export GITHUB_TOKEN=ghp_...   # read:packages for @fastbreak-amateur/fb-toolkit
pnpm install
cp .env.example .env.local
# fill ELEVENLABS_API_KEY, BROWSERBASE_API_KEY, ELEVENLABS_AGENT_ID
pnpm dev
```

Open [http://localhost:4317](http://localhost:4317). Click **Take our AI demo**, enter any email (it is discarded), and ask the AI agent to search.

## ElevenLabs agent

Create an agent in ElevenLabs. Paste from `lib/agent-config.ts`:

- **First message:** `FIRST_MESSAGE`
- **System prompt:** `SYSTEM_PROMPT`
- **Client tool:** `searchGoogle` with a `query` string, `expects_response: true`, `pre_tool_speech: force`, `execution_mode: post_tool_speech`, `interruption_mode: allow`
- **Knowledge base:** upload `kb/google-search.md` in prompt (full-context) mode, not RAG
- Enable system `skip_turn`

Set `ELEVENLABS_AGENT_ID` to that agent. Restricted API key: ElevenAgents Read+Write, Voices Read, TTS Access, STT Access.

## Env

| Name | Role |
| --- | --- |
| `ELEVENLABS_API_KEY` | Secret. Conversation token and TTS. |
| `BROWSERBASE_API_KEY` | Secret. Cloud browser. The key selects the Browserbase project. |
| `ELEVENLABS_AGENT_ID` | Dashboard id. Create an agent in ElevenLabs, then paste its id. |

Email is not persisted.


## Flaws (known)

- `pnpm install` needs `GITHUB_TOKEN` for GitHub Packages (`@fastbreak-amateur/fb-toolkit`).
- Agent id is not a Cursor app secret; published voice stays idle until `ELEVENLABS_AGENT_ID` is in the host env. Missing `BROWSERBASE_API_KEY` uses a sample iframe.
- Playwright `connectOverCDP` from a serverless host can time out; search then fails and the agent should park.
- In-memory session close is best-effort. New demo start requests Browserbase `REQUEST_RELEASE` on the previous id from the client.
- Google consent walls can block typing until a human updates selectors.

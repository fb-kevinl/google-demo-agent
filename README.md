# FastBreak Google demo agent

Watch-only sales demo: email gate, then an ElevenLabs agent searches [google.com](https://www.google.com) in a Browserbase live view. Visitors never click the iframe.

Private `@fastbreak-amateur/fb-toolkit` was not available from this environment (GitHub Packages 404). UI is shadcn/ui with a dark FastBreak-like palette.

## Run locally

```bash
npm install
cp .env.example .env.local
# fill ELEVENLABS_API_KEY, BROWSERBASE_API_KEY, ELEVENLABS_AGENT_ID, BROWSERBASE_PROJECT_ID
npm run dev
```

Open [http://localhost:4317](http://localhost:4317). Enter any email (it is discarded). Start voice. Ask the guide to search.

## ElevenLabs agent

Create an agent in ElevenAgents. Paste from `lib/agent-config.ts`:

- **First message:** `FIRST_MESSAGE`
- **System prompt:** `SYSTEM_PROMPT`
- **Client tool:** `searchGoogle` with a `query` string, `expects_response: true`, `pre_tool_speech: force`, `execution_mode: post_tool_speech`, `interruption_mode: allow`
- **Knowledge base:** upload `kb/google-search.md` in prompt (full-context) mode, not RAG
- Enable system `skip_turn`

Set `ELEVENLABS_AGENT_ID` to that agent. Restricted API key: ElevenAgents Read+Write, Voices Read, TTS Access, STT Access.

## Env

| Name | Role |
| --- | --- |
| `ELEVENLABS_API_KEY` | Secret. Conversation token. |
| `BROWSERBASE_API_KEY` | Secret. Cloud browser. |
| `ELEVENLABS_AGENT_ID` | Dashboard id. `.env.example` only. |
| `BROWSERBASE_PROJECT_ID` | Dashboard id. Missing this uses a sample iframe and sample SERP text. |

No FastBreak Dev Supabase. Email is not persisted.

## Flaws (known)

- GitHub Packages auth is required to swap shadcn for fb-toolkit 5.17.0.
- Agent id and Browserbase project id are not Cursor app secrets; published voice/live view stay idle or sample until those are in the host env.
- Playwright `connectOverCDP` from a serverless host can time out; search then fails and the agent should park.
- In-memory session close is best-effort. New demo start requests Browserbase `REQUEST_RELEASE` on the previous id from the client.
- Google consent walls can block typing until a human updates selectors.

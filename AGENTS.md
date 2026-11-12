# Agent instructions - google-demo-agent

Entry point for AI agents. Keep this file compact; depth lives in linked files.

## Stack (see `package.json` for pins)

- Next.js 16, React 19, TypeScript 5 (strict), `pnpm@10`
- ElevenLabs Conversational AI + TTS (`@elevenlabs/react`), Browserbase (`@browserbasehq/sdk`) + `playwright-core`
- `@fastbreak-amateur/fb-toolkit` 5.17.0, React Hook Form + Zod 4, Tailwind CSS 4

## Read first

1. [`README.md`](README.md) - setup, environment variables, and ElevenLabs sync workflow.
2. [`features-list.json`](features-list.json) - POC scope and behavioral invariants.

### Agent & Browser Architecture

- **ElevenLabs source of truth:** [`lib/agent-config.ts`](lib/agent-config.ts) and [`kb/google-search.md`](kb/google-search.md).
  - Push local prompt, `searchGoogle` client tool, `skip_turn`, and KB changes via `pnpm agent:push`.
  - Inspect remote configuration via `pnpm agent:pull`.
  - `first_message` is kept empty on ElevenLabs; `FIRST_MESSAGE` is injected locally by the client when the demo starts.
- **Browserbase session & CDP control:** [`lib/browser.ts`](lib/browser.ts) and [`app/api/browser/route.ts`](app/api/browser/route.ts).
  - Watch-only live view (`pointer-events-none` iframe). Visitors never click the browser; the agent drives Google Search and never clicks through into results.
- **Demo UI & flow:** [`components/demo-app.tsx`](components/demo-app.tsx) and [`components/demo-screens.tsx`](components/demo-screens.tsx).

## Communication

- Keep thread replies simple and easy to understand.
- Never use em-dashes.

## Hard rules

- **Simplicity:** keep all code changes simple. Prefer the smallest change that solves the problem.
- **Minimal diffs:** when planning, focus on how to make the change with as little code change as possible. Avoid drive-by refactors, extra abstractions, and unrelated cleanup.
- **UI:** prefer `@fastbreak-amateur/fb-toolkit`; capture user input via Shadcn Form patterns (React Hook Form + Zod).
- **File consolidation:** prefer one cohesive file (up to ~500 lines) over several small files for the same concern. Keep related helpers, types, and logic in the nearest owner file; avoid one-off extractions and micro-modules. Split only when a file exceeds ~500 lines or concerns are genuinely independent.
- **Package manager:** `pnpm` only.
- **Rename / move files:** use terminal commands (`git mv`, `mv`) instead of reading, writing a new file, and deleting the old one. Preserves git history, avoids accidental content drift, and saves tokens.

## After each implemented change

Run (fix failures before presenting work):

```bash
pnpm lint && pnpm build
```

When [`lib/agent-config.ts`](lib/agent-config.ts) or [`kb/google-search.md`](kb/google-search.md) changes, also run `pnpm agent:push` when syncing to ElevenLabs is requested.

## Tests

- **Default:** speed over coverage. Do **not** add tests unless instructed.
- **When tests are requested:** TDD (red -> green -> refactor).


## Commit messages

Prefix with a [gitmoji](https://gitmoji.dev/) shortcode, then a short message. Example: `:bug: fix idle animation drift`

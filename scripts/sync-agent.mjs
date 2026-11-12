import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const API_BASE = "https://api.elevenlabs.io/v1/convai";
const apiKey = process.env.ELEVENLABS_API_KEY?.trim();
const agentId = process.env.ELEVENLABS_AGENT_ID?.trim();
const cmd = process.argv[2] || "pull";

if (!apiKey) {
  console.error("Error: ELEVENLABS_API_KEY is not set in .env.local");
  process.exit(1);
}
if (!agentId) {
  console.error("Error: ELEVENLABS_AGENT_ID is not set in .env.local");
  process.exit(1);
}

const headers = {
  "xi-api-key": apiKey,
  "Content-Type": "application/json",
};

function readLocalConfig() {
  const src = readFileSync(resolve(process.cwd(), "lib/agent-config.ts"), "utf8");
  const promptMatch = src.match(/export const SYSTEM_PROMPT = `([\s\S]*?)`;/);
  if (!promptMatch) throw new Error("Could not parse SYSTEM_PROMPT from lib/agent-config.ts");
  const systemPrompt = promptMatch[1];
  const kbText = readFileSync(resolve(process.cwd(), "kb/google-search.md"), "utf8");

  const searchTool = {
    type: "client",
    name: "searchGoogle",
    description:
      "Type the visitor's query into Google on the live iframe and submit. Returns titles and snippets visible on screen. Never click through.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query to type and submit." },
      },
      required: ["query"],
    },
    expects_response: true,
    response_timeout_secs: 30,
    pre_tool_speech: "force",
    execution_mode: "immediate",
    interruption_mode: "disable_during_tool_and_turn",
  };

  return { systemPrompt, kbText, searchTool };
}

async function getAgent() {
  const res = await fetch(`${API_BASE}/agents/${encodeURIComponent(agentId)}`, { headers });
  if (!res.ok) {
    throw new Error(`GET agent failed (${res.status}): ${await res.text()}`);
  }
  return await res.json();
}

async function ensureKnowledgeBase(existingKb, kbText) {
  const kbName = "kb/google-search.md";
  const found = Array.isArray(existingKb)
    ? existingKb.find((item) => item?.name === kbName && item?.id)
    : null;
  if (found) {
    return existingKb.map((item) =>
      item.id === found.id ? { ...item, usage_mode: "prompt" } : item,
    );
  }

  console.log(`Uploading ${kbName} to ElevenLabs Knowledge Base...`);
  const res = await fetch(`${API_BASE}/knowledge-base/text`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: kbName, text: kbText }),
  });
  if (!res.ok) {
    throw new Error(`POST knowledge-base/text failed (${res.status}): ${await res.text()}`);
  }
  const created = await res.json();
  const locator = {
    type: "text",
    id: created.id,
    name: created.name || kbName,
    usage_mode: "prompt",
  };
  return [...(Array.isArray(existingKb) ? existingKb : []), locator];
}

async function pull() {
  const agent = await getAgent();
  const cfg = agent.conversation_config?.agent ?? {};
  const promptCfg = cfg.prompt ?? {};
  console.log(
    JSON.stringify(
      {
        agent_id: agent.agent_id,
        name: agent.name,
        first_message: cfg.first_message ?? "",
        language: cfg.language,
        llm: promptCfg.llm,
        temperature: promptCfg.temperature,
        tts: agent.conversation_config?.tts,
        tools: promptCfg.tools,
        built_in_tools: promptCfg.built_in_tools,
        knowledge_base: promptCfg.knowledge_base,
        prompt: promptCfg.prompt,
      },
      null,
      2,
    ),
  );
}

async function push() {
  const { systemPrompt, kbText, searchTool } = readLocalConfig();
  const current = await getAgent();
  const currentPrompt = current.conversation_config?.agent?.prompt ?? {};
  const knowledgeBase = await ensureKnowledgeBase(currentPrompt.knowledge_base, kbText);

  const otherTools = (Array.isArray(currentPrompt.tools) ? currentPrompt.tools : []).filter(
    (t) => t?.name !== "searchGoogle",
  );

  const payload = {
    conversation_config: {
      agent: {
        first_message: "",
        prompt: {
          prompt: systemPrompt,
          tools: [...otherTools, searchTool],
          built_in_tools: {
            ...(currentPrompt.built_in_tools ?? {}),
            skip_turn: currentPrompt.built_in_tools?.skip_turn ?? {
              type: "system",
              name: "skip_turn",
              description: "",
              params: {
                system_tool_type: "skip_turn",
              },
            },
          },
          knowledge_base: knowledgeBase,
        },
      },
    },
  };

  const res = await fetch(`${API_BASE}/agents/${encodeURIComponent(agentId)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`PATCH agent failed (${res.status}): ${await res.text()}`);
  }
  const updated = await res.json();
  console.log(`Synced agent ${updated.agent_id} (${updated.name}):`);
  console.log(`- first_message: "" (client injects FIRST_MESSAGE locally)`);
  console.log(`- prompt: ${systemPrompt.length} chars`);
  console.log(`- tools: ${updated.conversation_config?.agent?.prompt?.tools?.map((t) => t.name).join(", ")}`);
  console.log(`- knowledge_base: ${knowledgeBase.map((k) => `${k.name} (${k.usage_mode})`).join(", ")}`);
}

if (cmd === "push") {
  await push();
} else if (cmd === "pull") {
  await pull();
} else {
  console.error(`Unknown command "${cmd}". Use "push" or "pull".`);
  process.exit(1);
}

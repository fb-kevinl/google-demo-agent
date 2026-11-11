import Browserbase from "@browserbasehq/sdk";
import { chromium, type Page } from "playwright-core";

export type SearchResult = {
  ok: boolean;
  mocked: boolean;
  narration: string;
  query?: string;
};

export type LiveSession = {
  sessionId: string | null;
  liveViewUrl: string | null;
  mocked: boolean;
  message: string;
};

function apiKey() {
  return process.env.BROWSERBASE_API_KEY?.trim() || "";
}

function client() {
  return new Browserbase({ apiKey: apiKey() });
}

function connectUrl(sessionId: string) {
  return `wss://connect.browserbase.com?apiKey=${encodeURIComponent(apiKey())}&sessionId=${encodeURIComponent(sessionId)}`;
}

function mockSearch(query: string): SearchResult {
  const q = query.trim() || "FastBreak";
  return {
    ok: true,
    mocked: true,
    query: q,
    narration: `Sample results for “${q}” (Browserbase key is not set): 1) Wikipedia-style overview. 2) Recent headlines. 3) Official site snippet. Narrate only these sample titles; this is not a real SERP.`,
  };
}

export function isBrowserConfigured() {
  return Boolean(apiKey());
}

export async function releaseSession(sessionId: string) {
  if (!apiKey() || sessionId.startsWith("mock-")) return;
  try {
    await client().sessions.update(sessionId, { status: "REQUEST_RELEASE" });
  } catch {
    // ponytail: best-effort release; stale sessions time out on Browserbase
  }
}

export async function startLiveSession(previousId?: string | null): Promise<LiveSession> {
  if (previousId) await releaseSession(previousId);
  if (!isBrowserConfigured()) {
    return {
      sessionId: `mock-${Date.now()}`,
      liveViewUrl: null,
      mocked: true,
      message: "Sample live view. Set BROWSERBASE_API_KEY to drive google.com.",
    };
  }

  const session = await client().sessions.create({
    keepAlive: true,
    api_timeout: 600,
    browserSettings: {
      viewport: { width: 1280, height: 800 },
      blockAds: true,
      allowedDomains: ["google.com"],
    },
  });

  await withPage(session.id, async (p) => {
    await p.goto("https://www.google.com/", { waitUntil: "domcontentloaded", timeout: 25000 });
    await dismissConsent(p);
  });

  const debug = await client().sessions.debug(session.id);
  const liveViewUrl = appendNavbarFalse(debug.debuggerFullscreenUrl);

  return {
    sessionId: session.id,
    liveViewUrl,
    mocked: false,
    message: "Watch-only Google live view. The agent types; you do not click.",
  };
}

export async function searchGoogle(sessionId: string | null, query: string): Promise<SearchResult> {
  const q = query.trim().slice(0, 200);
  if (!q) return { ok: false, mocked: false, narration: "Empty query. Ask the visitor what to search." };
  if (!sessionId || sessionId.startsWith("mock-") || !isBrowserConfigured()) {
    return mockSearch(q);
  }

  try {
    return await withPage(sessionId, async (page) => {
      await dismissConsent(page);
      await injectCursor(page);
      const box = page.locator('textarea[name="q"], input[name="q"]').first();
      await box.waitFor({ state: "visible", timeout: 12000 });
      await box.click();
      await box.fill("");
      await highlight(page, box);
      await box.pressSequentially(q, { delay: 35 });
      await box.press("Enter");
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1200);
      const titles = (await page.locator("#search h3").allTextContents()).filter(Boolean).slice(0, 5);
      const snippets = (await page.locator("#search .VwiC3b").allTextContents())
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5);
      if (!titles.length) {
        return {
          ok: false,
          mocked: false,
          query: q,
          narration: "Search ran but no result titles were visible. Park this and keep going.",
        };
      }
      const lines = titles.map((t, i) => {
        const snip = snippets[i] ? ` - ${snippets[i].slice(0, 140)}` : "";
        return `${i + 1}) ${t}${snip}`;
      });
      return {
        ok: true,
        mocked: false,
        query: q,
        narration: `On-screen results for “${q}”: ${lines.join(" ")}`,
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed.";
    return {
      ok: false,
      mocked: false,
      query: q,
      narration: `Search failed (${message}). Retry once, then park.`,
    };
  }
}

function appendNavbarFalse(url: string) {
  const u = new URL(url);
  u.searchParams.set("navbar", "false");
  return u.toString();
}

async function withPage<T>(sessionId: string, fn: (page: Page) => Promise<T>): Promise<T> {
  const browser = await chromium.connectOverCDP(connectUrl(sessionId));
  try {
    const context = browser.contexts()[0] ?? (await browser.newContext());
    const page = context.pages()[0] ?? (await context.newPage());
    await injectCursor(page);
    return await fn(page);
  } finally {
    await browser.close();
  }
}

async function dismissConsent(page: Page) {
  const names = ["Accept all", "I agree", "Accept"];
  for (const name of names) {
    const btn = page.getByRole("button", { name, exact: false }).first();
    if (await btn.count()) {
      await btn.click({ timeout: 1500 }).catch(() => undefined);
    }
  }
  const legacy = page.locator("#L2AGLb");
  if (await legacy.count()) await legacy.click({ timeout: 1500 }).catch(() => undefined);
}

async function injectCursor(page: Page) {
  await page.evaluate(() => {
    if (document.getElementById("fb-demo-cursor")) return;
    const el = document.createElement("div");
    el.id = "fb-demo-cursor";
    el.style.cssText =
      "position:fixed;z-index:2147483647;width:18px;height:18px;border:2px solid #f97316;border-radius:50%;pointer-events:none;transform:translate(-50%,-50%);box-shadow:0 0 0 6px rgba(249,115,22,.22);transition:left .08s linear,top .08s linear;";
    document.documentElement.appendChild(el);
    document.addEventListener(
      "mousemove",
      (e) => {
        el.style.left = `${e.clientX}px`;
        el.style.top = `${e.clientY}px`;
      },
      true,
    );
  });
}

async function highlight(page: Page, locator: ReturnType<Page["locator"]>) {
  await locator.evaluate((node) => {
    const el = node as HTMLElement;
    el.style.outline = "3px solid #f97316";
    el.style.outlineOffset = "2px";
  });
}

import Browserbase from "@browserbasehq/sdk";
import { chromium, type Browser, type Page } from "playwright-core";

export type SearchResult = {
  ok: boolean;
  narration: string;
  query?: string;
};

export type LiveSession = {
  sessionId: string;
  liveViewUrl: string;
  message: string;
};

type ActiveSession = {
  browser: Browser;
  page: Page;
  connectUrl: string;
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

type LiveStore = { ids: Set<string>; pages: Map<string, ActiveSession>; hooked?: boolean };

function liveStore() {
  const g = globalThis as typeof globalThis & { __bbLive?: LiveStore };
  g.__bbLive ??= { ids: new Set(), pages: new Map() };
  g.__bbLive.pages ??= new Map();
  return g.__bbLive;
}

function trackSession(sessionId: string) {
  liveStore().ids.add(sessionId);
  hookShutdown();
}

function hookShutdown() {
  const store = liveStore();
  if (store.hooked) return;
  store.hooked = true;
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    const others = process.listeners(signal);
    process.removeAllListeners(signal);
    process.once(signal, () => {
      const ids = [...liveStore().ids];
      liveStore().ids.clear();
      const pending = Promise.all(ids.map((id) => releaseSession(id)));
      const timer = setTimeout(() => finish(signal, others), 2500);
      void pending.finally(() => {
        clearTimeout(timer);
        finish(signal, others);
      });
    });
  }
}

function finish(signal: NodeJS.Signals, others: NodeJS.SignalsListener[]) {
  for (const listener of others) listener(signal);
  process.exit(0);
}

function log(step: string, detail?: unknown) {
  console.log(`[browserbase] ${step}`, detail ?? "");
}

function logErr(step: string, error: unknown) {
  console.error(`[browserbase] ${step} failed:`, error);
}

export async function releaseSession(sessionId: string) {
  log("release", { sessionId });
  const store = liveStore();
  store.ids.delete(sessionId);
  const active = store.pages.get(sessionId);
  store.pages.delete(sessionId);
  if (active) await active.browser.close().catch(() => undefined);
  if (!apiKey()) return;
  try {
    await client().sessions.update(sessionId, { status: "REQUEST_RELEASE" });
  } catch (error) {
    logErr("release", error);
  }
}

export async function startLiveSession(previousId?: string | null): Promise<LiveSession> {
  if (!apiKey()) throw new Error("BROWSERBASE_API_KEY is not set.");

  const stale = new Set(liveStore().ids);
  if (previousId) stale.add(previousId);
  if (stale.size) await Promise.all([...stale].map((id) => releaseSession(id)));

  log("creating session");
  const session = await client().sessions.create({
    api_timeout: 180,
    browserSettings: {
      viewport: { width: 1280, height: 800 },
      blockAds: true,
    },
  });
  log("session created", { id: session.id, status: session.status, hasConnectUrl: Boolean(session.connectUrl) });
  trackSession(session.id);

  try {
    log("connecting CDP", { id: session.id });
    const page = await openPage(session.id, session.connectUrl);
    log("goto google.com", { id: session.id });
    await page.goto("https://www.google.com/", { waitUntil: "domcontentloaded", timeout: 25000 });
    await dismissConsent(page);
    await injectCursor(page);
  } catch (error) {
    logErr(`setup (${session.id})`, error);
    await releaseSession(session.id);
    throw error;
  }

  const debug = await client().sessions.debug(session.id);
  const pageView = debug.pages?.[0]?.debuggerFullscreenUrl || debug.debuggerFullscreenUrl;
  const liveViewUrl = appendNavbarFalse(pageView);
  log("live view ready", { id: session.id, pages: debug.pages?.length ?? 0 });

  return {
    sessionId: session.id,
    liveViewUrl,
    message: "Watch-only Google live view. The agent types; you do not click.",
  };
}

export async function searchGoogle(sessionId: string | null, query: string): Promise<SearchResult> {
  const q = query.trim().slice(0, 200);
  log("search requested", { sessionId, query: q });
  if (!q) return { ok: false, narration: "Empty query. Ask the visitor what to search." };
  if (!sessionId || !apiKey()) {
    return { ok: false, narration: "No active Browserbase session." };
  }

  try {
    const page = await openPage(sessionId);
    log("search typing", { sessionId, url: page.url(), query: q });
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
    log("search results", { sessionId, url: page.url(), titleCount: titles.length, titles });
    if (!titles.length) {
      return {
        ok: false,
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
      query: q,
      narration: `On-screen results for “${q}”: ${lines.join(" ")}`,
    };
  } catch (error) {
    logErr(`search (${sessionId})`, error);
    const message = error instanceof Error ? error.message : "Search failed.";
    return {
      ok: false,
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

async function openPage(sessionId: string, url?: string): Promise<Page> {
  const store = liveStore();
  const existing = store.pages.get(sessionId);
  if (existing && existing.browser.isConnected() && !existing.page.isClosed()) {
    return existing.page;
  }
  const ws = url || existing?.connectUrl || connectUrl(sessionId);
  const browser = await chromium.connectOverCDP(ws);
  const context = browser.contexts()[0] ?? (await browser.newContext());
  const page = context.pages()[0] ?? (await context.newPage());
  store.pages.set(sessionId, { browser, page, connectUrl: ws });
  return page;
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

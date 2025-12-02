/**
 * Lightweight client-side GraphQL helper that queues requests while the
 * tab is not focused/visible. When the tab becomes visible again, queued
 * requests are flushed to `/api/graphql`.
 *
 * Also provides shared utilities for visibility-based request queueing
 * that can be used by other modules (e.g., telemetry).
 */

import { logger } from "./logger";

type GraphQLPayload = {
  query: string;
  variables?: Record<string, unknown>;
  operationName?: string;
};

type QueueItem = {
  payload: GraphQLPayload;
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
  promise?: Promise<unknown>;
};

const queue: QueueItem[] = [];
let visibilityListenerAttached = false;

async function doFetch(payload: GraphQLPayload) {
  logger.debug("Sending GraphQL request", {
    operationName: payload.operationName,
  });
  try {
    const res = await fetch("/api/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    // Let caller handle parsing and errors; return parsed JSON for convenience
    const json = await res.json();
    logger.debug("GraphQL request successful", {
      operationName: payload.operationName,
    });
    return json;
  } catch (error) {
    logger.error("GraphQL request failed", {
      operationName: payload.operationName,
      error,
    });
    throw error;
  }
}

function flushQueue() {
  if (queue.length === 0) return;
  logger.info("Flushing GraphQL queue", { count: queue.length });
  const items = queue.splice(0, queue.length);
  for (const it of items) {
    doFetch(it.payload).then(it.resolve).catch(it.reject);
  }
}

function stableStringify(obj: unknown): string {
  if (obj === null || obj === undefined) return String(obj);
  if (typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return `[${obj.map((v) => stableStringify(v)).join(",")}]`;
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const parts: string[] = [];
  for (const k of keys) {
    const v = (obj as Record<string, unknown>)[k];
    parts.push(JSON.stringify(k) + ":" + stableStringify(v));
  }
  return `{${parts.join(",")}}`;
}

function payloadKey(payload: GraphQLPayload) {
  const vars =
    payload.variables === undefined ? "" : stableStringify(payload.variables);
  const op = payload.operationName ?? "";
  return `${op}::${payload.query}::${vars}`;
}

function ensureVisibilityHandler() {
  if (
    visibilityListenerAttached ||
    typeof window === "undefined" ||
    typeof document === "undefined"
  )
    return;

  const onVisible = () => {
    try {
      if (!document.hidden) flushQueue();
    } catch {
      // ignore
    }
  };

  window.addEventListener("focus", onVisible);
  document.addEventListener("visibilitychange", onVisible);
  visibilityListenerAttached = true;
}

/**
 * Shared utility: Check if the current tab/document is visible.
 * Safe to call from both client and server (returns false on server).
 *
 * @returns true if document is visible and focused, false otherwise
 */
export function isDocumentVisible(): boolean {
  if (typeof document === "undefined") return false;
  return document.visibilityState === "visible" && !document.hidden;
}

/**
 * Shared utility: Ensure a visibility change handler is installed.
 * Safe to call multiple times - will only install once.
 * Safe to call from server (no-op).
 *
 * @param callback - Function to call when document becomes visible
 */
export function ensureVisibilityListener(callback: () => void): void {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  // Use a unique property on the callback to track if we've registered it
  const key = "__visibility_registered";
  if ((callback as () => void)[key]) return;
  (callback as () => void)[key] = true;

  const onVisible = () => {
    try {
      if (isDocumentVisible()) callback();
    } catch {
      // Swallow errors - visibility handlers should never break the app
    }
  };

  window.addEventListener("focus", onVisible);
  document.addEventListener("visibilitychange", onVisible);
}

/**
 * Send a GraphQL query/mutation to the app API. If the tab is not focused
 * or the document is hidden, the request will be queued and sent once the
 * tab becomes visible again.
 *
 * Accepts either a raw query string or a payload object {query, variables}.
 */
export function sendQuery(input: string | GraphQLPayload) {
  ensureVisibilityHandler();

  const payload: GraphQLPayload =
    typeof input === "string" ? { query: input } : input;

  // If the page is not visible, queue the request
  if (
    typeof document !== "undefined" &&
    (document.hidden || !document.hasFocus())
  ) {
    logger.info("Queueing GraphQL request (tab hidden)", {
      operationName: payload.operationName,
    });
    const key = payloadKey(payload);
    // If an identical payload already exists in the queue, return its promise
    const existing = queue.find((it) => payloadKey(it.payload) === key);
    if (existing && existing.promise) {
      logger.debug(
        "Duplicate GraphQL request detected; returning existing queued promise",
        { operationName: payload.operationName },
      );
      return existing.promise;
    }

    // Otherwise create a new promise and enqueue
    const p = new Promise((resolve, reject) => {
      queue.push({ payload, resolve, reject, promise: undefined });
    });
    // Attach promise reference to the queued item we just pushed
    const queued = queue[queue.length - 1];
    if (queued) queued.promise = p;
    return p;
  }

  // Otherwise send immediately
  return doFetch(payload);
}

export default sendQuery;

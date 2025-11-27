// Lightweight client-side GraphQL helper that queues requests while the
// tab is not focused/visible. When the tab becomes visible again, queued
// requests are flushed to `/api/graphql`.

type GraphQLPayload = { query: string; variables?: any; operationName?: string };

type QueueItem = {
  payload: GraphQLPayload;
  resolve: (v: any) => void;
  reject: (e: any) => void;
};

const queue: QueueItem[] = [];
let visibilityListenerAttached = false;

async function doFetch(payload: GraphQLPayload) {
  const res = await fetch("/api/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  // Let caller handle parsing and errors; return parsed JSON for convenience
  return res.json();
}

function flushQueue() {
  if (queue.length === 0) return;
  const items = queue.splice(0, queue.length);
  for (const it of items) {
    doFetch(it.payload).then(it.resolve).catch(it.reject);
  }
}

function ensureVisibilityHandler() {
  if (visibilityListenerAttached || typeof window === "undefined" || typeof document === "undefined") return;

  const onVisible = () => {
    try {
      if (!document.hidden) flushQueue();
    } catch (e) {
      // ignore
    }
  };

  window.addEventListener("focus", onVisible);
  document.addEventListener("visibilitychange", onVisible);
  visibilityListenerAttached = true;
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

  const payload: GraphQLPayload = typeof input === "string" ? { query: input } : input;

  // If the page is not visible, queue the request
  if (typeof document !== "undefined" && (document.hidden || !document.hasFocus())) {
    return new Promise((resolve, reject) => {
      queue.push({ payload, resolve, reject });
    });
  }

  // Otherwise send immediately
  return doFetch(payload);
}

export default sendQuery;

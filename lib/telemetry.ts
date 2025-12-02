/**
 * Client-side helper to send telemetry events to the server-side route.
 * Only call this from client code. Telemetry is optional and should fail silently.
 *
 * Uses shared visibility queue infrastructure from graphql.ts to defer
 * telemetry sends when the tab is not visible.
 */

import { ensureVisibilityListener, isDocumentVisible } from "./graphql";

type TelemetryEvent = { event: string; properties?: Record<string, unknown> };

// Queue for events captured while the tab is not visible.
const queuedTelemetry: TelemetryEvent[] = [];

/**
 * Actually send a telemetry event to the server.
 * Checks user consent and anonymous mode before sending.
 */
async function _actuallySend(e: TelemetryEvent): Promise<void> {
  try {
    // Import getSession dynamically so this module remains safe server-side.
    const { getSession } = await import("next-auth/react");
    const sess = await getSession();
    const user = sess?.user as
      | { telemetry_consent?: boolean; anonymous_mode?: boolean }
      | undefined;
    const telemetryConsent = user?.telemetry_consent;
    const anonymousMode = user?.anonymous_mode;

    if (anonymousMode === true) return;
    if (telemetryConsent === false) return;

    await fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: e.event, properties: e.properties }),
    });
  } catch (err) {
    // Swallow errors silently — telemetry should never break the app
    console.debug("Telemetry send failed", err);
  }
}

/**
 * Flush all queued telemetry events in FIFO order.
 * Called automatically when the tab becomes visible.
 */
async function flushQueuedTelemetry(): Promise<void> {
  if (queuedTelemetry.length === 0) return;
  // Drain the queue in FIFO order
  while (queuedTelemetry.length > 0) {
    const e = queuedTelemetry.shift()!;
    // fire-and-forget — don't block the flush loop on individual failures
    _actuallySend(e).catch(() => {});
  }
}

/**
 * Send a telemetry event to the server.
 * If the tab is not visible, the event will be queued and sent when it becomes visible.
 *
 * @param event - The event name
 * @param properties - Optional event properties/metadata
 */
export async function sendTelemetry(
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  // If running server-side, do nothing.
  if (typeof window === "undefined") return;

  // Install visibility listener to flush queue when tab becomes visible
  ensureVisibilityListener(flushQueuedTelemetry);

  // If the tab is not visible, queue the event and return without sending.
  if (!isDocumentVisible()) {
    queuedTelemetry.push({ event, properties });
    return;
  }

  // If visible, send immediately.
  void _actuallySend({ event, properties });
}

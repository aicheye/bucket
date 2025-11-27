/* Client-side helper to send telemetry events to the server-side route.
 * Only call this from client code. Telemetry is optional and should fail silently.
 */
type TelemetryEvent = { event: string; properties?: Record<string, unknown> };

// Queue for events captured while the tab is not visible.
const queuedTelemetry: TelemetryEvent[] = [];
let visibilityListenerInstalled = false;

async function _actuallySend(e: TelemetryEvent) {
  try {
    // Import getSession dynamically so this module remains safe server-side.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getSession } = await import("next-auth/react");
    const sess = await getSession();
    const telemetryConsent = (sess as any)?.user?.telemetry_consent;
    const anonymousMode = (sess as any)?.user?.anonymous_mode;

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

async function flushQueuedTelemetry() {
  if (queuedTelemetry.length === 0) return;
  // Drain the queue in FIFO order
  while (queuedTelemetry.length > 0) {
    const e = queuedTelemetry.shift()!;
    // fire-and-forget — don't block the flush loop on individual failures
    _actuallySend(e).catch(() => {});
  }
}

export async function sendTelemetry(
  event: string,
  properties?: Record<string, unknown>,
) {
  // If running server-side, do nothing.
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // Install a one-time visibilitychange listener to flush queued events
  // when the tab becomes visible.
  if (!visibilityListenerInstalled) {
    visibilityListenerInstalled = true;
    try {
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          // flush queued events when tab becomes visible
          void flushQueuedTelemetry();
        }
      });
    } catch (e) {
      // ignore — defensive if document isn't available
    }
  }

  // If the tab is not visible, queue the event and return without sending.
  if (document.visibilityState !== "visible") {
    queuedTelemetry.push({ event, properties });
    return;
  }

  // If visible, send immediately.
  void _actuallySend({ event, properties });
}

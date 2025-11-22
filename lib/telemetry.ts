/* Client-side helper to send telemetry events to the server-side route.
 * Only call this from client code. Telemetry is optional and should fail silently.
 */
export async function sendTelemetry(
  event: string,
  properties?: Record<string, unknown>,
) {
  try {
    await fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, properties }),
    });
  } catch (e) {
    // Don't surface telemetry errors to user
    // eslint-disable-next-line no-console
    console.debug("Telemetry send failed", e);
  }
}

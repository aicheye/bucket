/* Client-side helper to send telemetry events to the server-side route.
 * Only call this from client code. Telemetry is optional and should fail silently.
 */
export async function sendTelemetry(
  event: string,
  properties?: Record<string, unknown>,
) {
  try {
    // Check client session flags to avoid sending telemetry when user opted out
    // Importing here keeps the module safe for server-side usage.
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
      body: JSON.stringify({ event, properties }),
    });
  } catch (e) {
    // Don't surface telemetry errors to user
     
    console.debug("Telemetry send failed", e);
  }
}

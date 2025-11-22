"use client";
import { SessionProvider, useSession } from "next-auth/react";
import React, { useEffect } from "react";
import { sendTelemetry } from "../lib/telemetry";

export default function Providers({ children }: { children: React.ReactNode }) {
  // session heartbeat: periodically record active session (client-side)
  const Heartbeat = ({ children }: { children: React.ReactNode }) => {
    const { data: session } = useSession();

    useEffect(() => {
      if (!session?.user?.id) return;

      // Immediately send one heartbeat
      sendTelemetry("session_heartbeat", {});

      const interval = setInterval(
        () => {
          sendTelemetry("session_heartbeat", {});
        },
        1000 * 60 * 14,
      ); // 14 minutes - server limits similar events within 15 minutes

      return () => clearInterval(interval);
    }, [session]);

    return <>{children}</>;
  };
  return (
    <SessionProvider>
      <Heartbeat>{children}</Heartbeat>
    </SessionProvider>
  );
}

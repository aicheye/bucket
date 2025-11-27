"use client";
import { SessionProvider, useSession } from "next-auth/react";
import React, { useEffect } from "react";
import { sendTelemetry } from "../lib/telemetry";
import Footer from "./components/footer";
import GlobalLoading from "./components/global-loading";
import { LoadingProvider } from "./components/loading-context";
import Navbar from "./components/navbar";
import Sidebar from "./components/sidebar";
import { CourseProvider } from "./course-context";

export default function Providers({ children }: { children: React.ReactNode }) {
  // session heartbeat: periodically record active session (client-side)
  const Heartbeat = ({ children }: { children: React.ReactNode }) => {
    const { data: session } = useSession();

    useEffect(() => {
      if (!session?.user?.id) return;

      // Send heartbeats on 15 minute intervals
      const interval = setInterval(async () => {
        await sendTelemetry("session_heartbeat", {
          user_id: session.user.id,
        });
      }, 15 * 60 * 1000);

      // Initial heartbeat on load
      sendTelemetry("session_heartbeat", {
        user_id: session.user.id,
      });

      return () => clearInterval(interval);
    }, [session]);

    return <>{children}</>;
  };

  return (
    <LoadingProvider>
      <SessionProvider refetchOnWindowFocus={false}>
        <CourseProvider>
          <Heartbeat>
            <div className="min-h-screen flex flex-col overflow-x-hidden">
              <Navbar showMenuButton={true} className="z-50" />
              <div className="flex flex-1 bg-base-300 min-h-0" style={{ marginTop: 'var(--navbar-total-height)' }}>
                {/* Desktop sidebar (unchanged) */}
                <div className="hidden lg:block">
                  <Sidebar />
                </div>

                <div className="flex flex-1 flex-col w-full">
                  {/* Mobile: drawer that overlays content and appears below the header */}
                  <div className="block lg:hidden w-full">
                    <div className="drawer">
                      <input id="my-drawer-2" type="checkbox" className="drawer-toggle" />
                      <div className="drawer-content">
                        <div className="flex flex-1 flex-col w-full py-auto overflow-y-auto justify-between overflow-x-hidden min-h-0">
                          <div className="flex-1 min-h-0">{children}</div>
                          <div>
                            <Footer />
                          </div>
                        </div>
                      </div>
                      <div className="drawer-side">
                        <label htmlFor="my-drawer-2" className="drawer-overlay" style={{ top: 'calc(var(--navbar-total-height) - 1px)', height: 'calc(100vh - var(--navbar-total-height))' }}></label>
                        <div style={{ marginTop: 'calc(var(--navbar-total-height) - 1px)', height: 'calc(100vh - var(--navbar-total-height))', minHeight: 0 }}>
                          <Sidebar />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Large-screen main content (unchanged layout) */}
                  <div className="hidden lg:flex flex-1 flex-col w-full py-auto overflow-y-auto justify-between min-h-0">
                    <div className="flex-1 min-h-0">{children}</div>
                    <div>
                      <Footer />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Heartbeat>
        </CourseProvider>
        <GlobalLoading />
      </SessionProvider >
    </LoadingProvider >
  );
}

"use client";
import type { Session } from "next-auth";
import { SessionProvider, useSession } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";
import React, { useEffect } from "react";
import { logger } from "../lib/logger";
import { sendTelemetry } from "../lib/telemetry";
import Footer from "./components/layout/Footer";
import GlobalLoading from "./components/layout/GlobalLoading";
import Navbar from "./components/layout/Navbar";
import Sidebar from "./components/layout/Sidebar";
import { CourseProvider } from "./contexts/CourseContext";
import { LoadingProvider } from "./contexts/LoadingContext";

// session heartbeat: periodically record active session (client-side)
const Heartbeat = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user?.id) return;

    // Send heartbeats on 15 minute intervals
    const interval = setInterval(
      async () => {
        await sendTelemetry("session_heartbeat", {
          user_id: session.user.id,
        });
      },
      15 * 60 * 1000,
    );

    // Initial heartbeat on load
    sendTelemetry("session_heartbeat", {
      user_id: session.user.id,
    });

    return () => clearInterval(interval);
  }, [session]);

  return <>{children}</>;
};

export default function Providers({
  children,
  session,
}: {
  children: React.ReactNode;
  session?: Session | null;
}) {
  const pathname = usePathname();
  const showSidebar =
    pathname?.startsWith("/courses") ||
    pathname === "/dashboard" ||
    pathname === "/calendar";
  const authScreen = pathname?.startsWith("/api/auth/signin");

  const searchParams = useSearchParams();

  const gradesScreen = searchParams?.get("view")?.endsWith("grades");
  const infoScreen = searchParams?.get("view")?.endsWith("info");

  useEffect(() => {
    logger.info("Providers initialized");
  }, []);

  // Update theme-color meta tag when drawer is toggled (for iOS address bar)
  useEffect(() => {
    if (!showSidebar) return;

    const drawerCheckbox = document.getElementById("my-drawer-2") as HTMLInputElement;
    if (!drawerCheckbox) return;

    const updateThemeColor = () => {
      let metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
      }

      // Always use sidebar color (base-200) to keep it constant
      const sidebar = document.querySelector('.drawer-side .bg-base-200');
      if (sidebar) {
        const sidebarColor = getComputedStyle(sidebar).backgroundColor;
        metaThemeColor.setAttribute('content', sidebarColor);
      } else {
        // Fallback to body background
        const color = getComputedStyle(document.body).backgroundColor;
        metaThemeColor.setAttribute('content', color);
      }
    };

    drawerCheckbox.addEventListener('change', updateThemeColor);
    // Initial update
    updateThemeColor();

    return () => {
      drawerCheckbox.removeEventListener('change', updateThemeColor);
    };
  }, [showSidebar]);

  return (
    <LoadingProvider>
      <SessionProvider session={session} refetchOnWindowFocus={false}>
        <CourseProvider>
          <Heartbeat>
            <div className="min-h-screen flex flex-col overflow-x-hidden">
              <Navbar
                showMenuButton={showSidebar}
                showProfile={!authScreen}
                className="z-50"
              />
              <div
                className="flex flex-1 bg-base-300 min-h-0"
                style={{ marginTop: "var(--navbar-total-height)" }}
              >
                {/* Desktop: fixed sidebar so it does not participate in page scrolling */}
                {showSidebar ? (
                  <div className="h-full hidden lg:block lg:fixed lg:top-[var(--navbar-total-height)] lg:left-0 lg:h-[calc(100dvh - var(--navbar-total-height))] lg:w-64 lg:overflow-y-auto">
                    <Sidebar
                      gradesScreen={gradesScreen}
                      infoScreen={infoScreen}
                    />
                  </div>
                ) : null}

                {/* Main content area is inset on large screens to avoid overlapping the fixed sidebar */}
                <div
                  className={`flex flex-1 flex-col w-full ${showSidebar ? "lg:ml-64" : ""}`}
                >
                  {/* Mobile: drawer that overlays content and appears above the navbar */}
                  {showSidebar ? (
                    <div className="block lg:hidden w-full flex-1 flex flex-col min-h-0">
                      <div className="drawer flex-1 flex flex-col min-h-0">
                        <input
                          id="my-drawer-2"
                          type="checkbox"
                          className="drawer-toggle"
                        />
                        <div className="drawer-content flex flex-col min-h-0 flex-1">
                          <div className="flex flex-col w-full flex-1 overflow-y-auto overflow-x-hidden min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                            <div className="flex-1 flex flex-col min-h-0">
                              {children}
                            </div>
                          </div>
                          <Footer />
                        </div>
                        <div className="drawer-side z-[60] overflow-hidden h-[100dvh]">
                          <label
                            htmlFor="my-drawer-2"
                            className="drawer-overlay !fixed !inset-0 !h-[100dvh]"
                          ></label>
                          <div
                            className="h-full overflow-hidden bg-base-200"
                            style={{
                              paddingTop: 'env(safe-area-inset-top, 0px)',
                              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                            }}
                          >
                            <Sidebar
                              gradesScreen={gradesScreen}
                              infoScreen={infoScreen}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // If sidebar is hidden, render a straightforward stacked layout for mobile
                    <div className="block lg:hidden w-full flex-1 flex flex-col min-h-0">
                      <div className="flex flex-col w-full flex-1 overflow-y-auto overflow-x-hidden min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
                        <div className="flex-1 flex flex-col">{children}</div>
                      </div>
                      <Footer />
                    </div>
                  )}

                  {/* Large-screen main content (unchanged layout) */}
                  <div className="hidden lg:flex flex-1 flex-col w-full min-h-0">
                    <div className="flex-1 flex flex-col overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>{children}</div>
                    <Footer />
                  </div>
                </div>
              </div>
            </div>
          </Heartbeat>
        </CourseProvider>
        <GlobalLoading />
      </SessionProvider>
    </LoadingProvider>
  );
}

"use client";
import type { Session } from "next-auth";
import { SessionProvider, useSession } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import Snowfall from "react-snowfall";
import { logger } from "../lib/logger";
import { sendTelemetry } from "../lib/telemetry";
import OnboardingCheck from "./components/features/OnboardingCheck";
import Footer from "./components/layout/Footer";
import GlobalLoading from "./components/layout/GlobalLoading";
import Navbar from "./components/layout/Navbar";
import Sidebar from "./components/layout/Sidebar";
import { CourseProvider } from "./contexts/CourseContext";
import { LoadingProvider } from "./contexts/LoadingContext";
import { SnowProvider, useSnow } from "./contexts/SnowContext";

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

const SnowfallWrapper = () => {
  const { isSnowEnabled } = useSnow();
  if (!isSnowEnabled) return null;
  return (
    <div className="absolute top-0 left-0 w-screen h-screen pointer-events-none z-100">
      <Snowfall />
    </div>
  );
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

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateThemeColor = () => {
      // Use a small timeout to ensure the DOM/CSS has updated with the new theme variables
      setTimeout(() => {
        let meta = document.querySelector("meta[name='theme-color']");
        if (!meta) {
          meta = document.createElement("meta");
          meta.setAttribute("name", "theme-color");
          document.head.appendChild(meta);
        }

        // Create a dummy element to get the correct theme color (bg-base-200)
        // This avoids issues with overlays or body background being different
        const dummy = document.createElement("div");
        dummy.className = "bg-base-200 fixed top-0 left-0 w-1 h-1 -z-50 opacity-0 pointer-events-none";
        document.body.appendChild(dummy);
        const color = getComputedStyle(dummy).backgroundColor;
        document.body.removeChild(dummy);

        meta.setAttribute("content", color);
      }, 100);
    };

    // Initial update
    updateThemeColor();

    // Watch for theme changes
    const observer = new MutationObserver(updateThemeColor);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    logger.info("Providers initialized");
  }, []);

  return (
    <LoadingProvider>
      <SessionProvider session={session} refetchOnWindowFocus={false}>
        <OnboardingCheck />
        <CourseProvider>
          <SnowProvider>
            <Heartbeat>
              <SnowfallWrapper />
              {/* Desktop Navbar: Fixed at top, full width */}
              <div className="hidden lg:block sticky top-0 z-50 w-full h-[var(--navbar-height)]">
                <Navbar
                  showMenuButton={false}
                  showProfile={!authScreen}
                  className="!relative"
                />
              </div>

              <div className={`drawer ${showSidebar ? "lg:drawer-open" : ""} min-h-screen lg:min-h-0 lg:h-[calc(100dvh-var(--navbar-height))]`}>
                <input
                  id="my-drawer-2"
                  type="checkbox"
                  className="drawer-toggle"
                  checked={isDrawerOpen}
                  onChange={(e) => setIsDrawerOpen(e.target.checked)}
                />
                <div className="drawer-content flex flex-col min-h-screen lg:h-full lg:min-h-0 bg-base-300 lg:overflow-hidden">
                  {/* Mobile Navbar: Scrolls with content */}
                  <div className="lg:hidden">
                    <Navbar
                      showMenuButton={showSidebar}
                      showProfile={!authScreen}
                      className="!relative z-40"
                    />
                  </div>

                  <div className="flex-1 flex flex-col lg:overflow-y-auto">
                    {children}
                    <Footer />
                  </div>
                </div>
                {showSidebar && (
                  <div className="drawer-side z-50 lg:z-auto lg:h-full">
                    <label
                      htmlFor="my-drawer-2"
                      className="drawer-overlay"
                      aria-label="close sidebar"
                    ></label>
                    <div className="h-full bg-base-200 text-base-content w-64 border-r border-base-content/10">
                      <Sidebar
                        gradesScreen={gradesScreen}
                        infoScreen={infoScreen}
                        inDrawer={true}
                        onClose={() => setIsDrawerOpen(false)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Heartbeat>          </SnowProvider>        </CourseProvider>
        <GlobalLoading />
      </SessionProvider>
    </LoadingProvider>
  );
}

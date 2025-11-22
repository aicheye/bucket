"use client";

import { useSession } from "next-auth/react";
import Footer from "../components/footer";
import Navbar from "../components/navbar";
import Sidebar from "../components/sidebar";
import { CourseProvider } from "./course-context";

function InnerLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Navbar showMenuButton={true} className="sticky top-0 z-30" />
      <div className="drawer lg:drawer-open flex-1 min-h-0 overflow-x-hidden">
        <input id="my-drawer-2" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex flex-col overflow-x-hidden">
          <main className="p-4 sm:p-8">
            <div className="max-w-5xl mx-auto w-full">
              {status === "loading" && !session ? (
                <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
                  <div className="skeleton h-8 w-1/3 mb-4"></div>
                  <div className="skeleton h-64 w-full rounded-box"></div>
                  <div className="skeleton h-64 w-full rounded-box"></div>
                </div>
              ) : (
                children
              )}
            </div>
          </main>
        </div>
        <div className="drawer-side z-20 lg:sticky lg:h-full mt-14 lg:mt-0 overflow-x-hidden">
          <label
            htmlFor="my-drawer-2"
            aria-label="close sidebar"
            className="drawer-overlay h-full"
          ></label>
          <Sidebar />
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CourseProvider>
      <InnerLayout>{children}</InnerLayout>
    </CourseProvider>
  );
}

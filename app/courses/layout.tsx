"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import Footer from "../components/footer";
import Modal from "../components/modal";
import Navbar from "../components/navbar";
import Sidebar from "../components/sidebar";
import { CourseProvider } from "./course-context";

function InnerLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardAnon, setOnboardAnon] = useState(false);
  const [onboardTelemetry, setOnboardTelemetry] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;

    const checkOnboard = async () => {
      const query = `query GetUser($id: String!) { users_by_pk(id: $id) { onboarded } }`;
      try {
        const res = await fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query, variables: { id: session.user.id } }),
        });
        const j = await res.json();
        const onboarded = j?.data?.users_by_pk?.onboarded;
        if (!onboarded) {
          setShowOnboarding(true);
        }
      } catch (err) {
        console.error("Failed to check onboarding state:", err);
      }
    };

    checkOnboard();
  }, [session?.user?.id]);

  const confirmOnboarding = async () => {
    if (!session?.user?.id) return setShowOnboarding(false);

    const mutation = `
      mutation UpdateOnboard($id: String!, $consent: Boolean!, $anon: Boolean!, $onboarded: Boolean!) {
        update_users_by_pk(pk_columns: {id: $id}, _set: {telemetry_consent: $consent, anonymous_mode: $anon, onboarded: $onboarded}) {
          id
        }
      }
    `;

    try {
      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: mutation, variables: { id: session.user.id, consent: onboardTelemetry, anon: onboardAnon, onboarded: true } }),
      });

      const json = await res.json();
      if (json?.errors) {
        console.error("Failed to save onboarding (GraphQL errors):", json.errors);
        return; // keep the modal open so user can retry
      }

      // If user requested anon mode, scrub personal info server-side
      if (onboardAnon) {
        const scrubRes = await fetch("/api/user/scrub", { method: "POST" });
        if (!scrubRes.ok) {
          const txt = await scrubRes.text();
          console.error("Failed to scrub personal info:", scrubRes.status, txt);
          // proceed — scrub failing shouldn't prevent onboarding flag from being set
        }
      }

      // Successfully saved onboarding state, close modal
      setShowOnboarding(false);
    } catch (err) {
      console.error("Failed to save onboarding:", err);
      // keep modal open so user can retry
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-x-hidden">
      <Modal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        title="Welcome"
        onConfirm={confirmOnboarding}
        actions={
          <button className="btn btn-primary" onClick={confirmOnboarding}>
            Save
          </button>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-base-content/50">Choose privacy preferences below. For more information on your privacy rights, visit our <Link href="legal/privacy" target="_blank" className="underline" rel="noopener noreferrer">privacy policy</Link>.</p>
          <hr className="border-base-content/20" />
          <div className="label cursor-pointer justify-start gap-2 text-base-content/80 flex">
            <span className="flex-grow label-text">Enable incognito mode</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={onboardAnon}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const checked = e.target.checked;
                setOnboardAnon(checked);
                if (checked) setOnboardTelemetry(false);
              }}
            />
          </div>
          <span className="label-text text-base-content/50 text-sm">Scrubs personal info (name, email, picture) from the user database.</span>
          <hr className="border-base-content/20" />
          <div className="label cursor-pointer justify-start gap-2 text-base-content/80 flex">
            <span className="flex-grow label-text">Send anonymized telemetry (usage data)</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={onboardTelemetry}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const checked = e.target.checked;
                setOnboardTelemetry(checked);
                if (checked) setOnboardAnon(false);
              }}
            />
          </div>
          <span className="label-text text-base-content/50 text-sm">Helps us improve Bucket over time. No personal info is sent.</span>
          <hr className="border-base-content/20" />
        </div>
      </Modal>
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

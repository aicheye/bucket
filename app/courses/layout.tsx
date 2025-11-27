"use client";

import { faArrowTrendUp, faEyeLowVision } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { sendQuery } from "../../lib/graphql";
import Modal from "../components/modal";
import { useCourses } from "../course-context";

function InnerLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const { loading: coursesLoading } = useCourses();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardAnon, setOnboardAnon] = useState(false);
  const [onboardTelemetry, setOnboardTelemetry] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    if (typeof window === "undefined") return;
    if (showOnboarding) return;

    sendQuery({
      query: `
      query GetUserOnboarding($id: String!) {
        users_by_pk(id: $id) {
          onboarded
        }
      }
    `, variables: { id: session.user.id }
    }).then((json) => {
      if (json?.data?.users_by_pk?.onboarded) return;
      setShowOnboarding(true);
    }).catch((err) => {
      console.error("Failed to fetch user onboarding status:", err);
      // On error, show the onboarding modal to ensure preferences are set
      setShowOnboarding(true);
    });
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
      const json = await sendQuery({ query: mutation, variables: { id: session.user.id, consent: onboardTelemetry, anon: onboardAnon, onboarded: true } });
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

      // Notify other UI (profile) to refresh after onboarding update
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("user-profile-updated"));
      }

      // Successfully saved onboarding state, close modal and mark seen locally
      setShowOnboarding(false);
    } catch (err) {
      console.error("Failed to save onboarding:", err);
      // keep modal open so user can retry
    }
  };

  return (
    <div className="flex flex-col items-center justify-start h-full">
      <Modal
        isOpen={showOnboarding}
        onClose={() => {
          setShowOnboarding(false);
        }}
        title="Data & Privacy Preferences"
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
          <div className="label cursor-pointer justify-start text-base-content/80 flex w-full">
            <div className="flex flex-col flex-grow gap-1">
              <span className="label-text"><FontAwesomeIcon icon={faEyeLowVision} aria-hidden="true" /> Incognito Mode</span>
              <span className="flex-wrap label-text text-base-content/50 text-sm">Scrubs name, email, picture from the user database.</span>
            </div>
            <div>
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
          </div>
          <hr className="border-base-content/20" />
          <div className="label cursor-pointer justify-start gap-2 text-base-content/80 flex">
            <div className="flex flex-col flex-grow gap-1">
              <span className="label-text"><FontAwesomeIcon icon={faArrowTrendUp} aria-hidden="true" /> Send Usage Data</span>
              <span className="label-text text-base-content/50 text-sm">Helps us improve Bucket over time. No personal info is sent.</span>
            </div>
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
          <hr className="border-base-content/20" />
        </div>
      </Modal >
      <main className="p-4 sm:p-8 w-full h-full">
        <div className="max-w-5xl mx-auto w-full h-full">
          {(status === "loading" && !session) || coursesLoading ? (
            <div className="flex flex-col gap-6 mx-auto w-full">
              <div className="skeleton h-8 w-1/3 mb-4"></div>
              <div className="skeleton h-64 w-full rounded-box"></div>
              <div className="skeleton h-64 w-full rounded-box"></div>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div >
  );
}

export default function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <InnerLayout>{children}</InnerLayout>;
}

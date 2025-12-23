import {
  faArrowTrendUp,
  faEyeLowVision,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Line } from "recharts";
import { APP_NAME } from "../../../lib/constants";
import sendQuery from "../../../lib/graphql";
import { UPDATE_ONBOARD } from "../../../lib/graphql/mutations";
import { GET_USER_FULL } from "../../../lib/graphql/queries";
import { useCourses } from "../../contexts/CourseContext";
import Modal from "../ui/Modal";

export default function InnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const { loading: coursesLoading } = useCourses();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardAnon, setOnboardAnon] = useState(false);
  const [onboardTelemetry, setOnboardTelemetry] = useState(true);

  useEffect(() => {
    if (!session?.user?.id) return;
    if (typeof window === "undefined") return;
    // If we've just saved onboarding preferences, prefer the local flag
    // to avoid re-opening the modal while the server-side change is
    // still propagating.
    try {
      const seen = window.localStorage.getItem("onboarded_v1");
      if (seen) return;
    } catch {
      // ignore localStorage errors
    }
    if (showOnboarding) return;

    sendQuery({
      query: GET_USER_FULL,
      variables: { id: session.user.id },
    })
      .then((json) => {
        // The `data` JSONB may not always expose an `onboarded` flag in a
        // consistent shape across environments. Check defensively for the
        // flag; if it's missing, fall back to showing the onboarding modal.
        const user = json?.data?.users_by_pk;
        if (user && user.onboarded === true) return;
        setShowOnboarding(true);
      })
      .catch(() => {
        // On error, show the onboarding modal to ensure preferences are set
        setShowOnboarding(true);
      });
  }, [session?.user?.id]);

  const confirmOnboarding = async () => {
    if (!session?.user?.id) return setShowOnboarding(false);

    try {
      // Use a direct fetch for onboarding so the request is sent immediately
      // even if the tab is hidden. `sendQuery` may queue requests when the
      // document is not visible which can lead to the onboarding state not
      // being persisted before a refresh/navigation and the modal reappearing.
      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: UPDATE_ONBOARD,
          variables: {
            id: session.user.id,
            consent: onboardTelemetry,
            anon: onboardAnon,
            onboarded: true,
          },
        }),
      });

      const json = await res.json();
      if (json?.errors) {
        // ignore
        return; // keep the modal open so user can retry
      }

      // If user requested anon mode, scrub personal info server-side
      if (onboardAnon) {
        await fetch("/api/user/scrub", { method: "POST" });
      }

      // Notify other UI (profile) to refresh after onboarding update
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("user-profile-updated"));
      }

      // Successfully saved onboarding state, close modal and mark seen locally
      setShowOnboarding(false);
      try {
        window.localStorage.setItem("onboarded_v1", "1");
      } catch {
        // ignore
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex flex-col justify-start min-h-full w-full">
      <Modal
        isOpen={showOnboarding}
        onClose={() => {
          setShowOnboarding(false);
        }}
        title="Data & Privacy Preferences"
        onConfirm={confirmOnboarding}
        actions={
          <button
            className="btn btn-primary"
            onClick={confirmOnboarding}
            title="Save"
          >
            Save
          </button>
        }
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-base-content/50">
            Choose privacy preferences below. For more information on your
            privacy rights, visit our{" "}
            <Link
              href="legal/privacy"
              target="_blank"
              className="underline"
              rel="noopener noreferrer"
            >
              privacy policy
            </Link>
            .
          </p>
          <Line direction="hor" className="w-full" />
          <div className="label cursor-pointer justify-start text-base-content/80 flex w-full">
            <div className="flex flex-col flex-grow gap-1">
              <span className="label-text">
                <FontAwesomeIcon icon={faEyeLowVision} aria-hidden="true" />{" "}
                Incognito Mode
              </span>
              <span className="flex-wrap label-text text-base-content/50 text-sm">
                Scrubs name, email, picture from the user database.
              </span>
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
          <Line direction="hor" className="w-full" />
          <div className="label cursor-pointer justify-start gap-2 text-base-content/80 flex">
            <div className="flex flex-col flex-grow gap-1">
              <span className="label-text">
                <FontAwesomeIcon icon={faArrowTrendUp} aria-hidden="true" />{" "}
                Send Usage Data
              </span>
              <span className="label-text text-base-content/50 text-sm">
                Helps us improve {APP_NAME} over time. No personal info is sent.
              </span>
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
          <Line direction="hor" className="w-full" />
        </div>
      </Modal>
      <main className="p-4 sm:p-8 w-full flex-1">
        <div className="max-w-5xl mx-auto w-full flex-1">
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
    </div>
  );
}

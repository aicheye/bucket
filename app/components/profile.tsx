"use client";

import { faArrowTrendUp, faCircleUser, faEyeLowVision } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import AuthComponent from "./auth-button";
import { useLoading } from "./loading-context";
import Modal from "./modal";

export default function Profile() {
  const { data: session, status } = useSession();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [telemetryConsent, setTelemetryConsent] = useState<boolean>(false);
  const [anonymousMode, setAnonymousMode] = useState<boolean>(true);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);
  const [privacyChoiceTelemetry, setPrivacyChoiceTelemetry] = useState<boolean>(false);
  const [privacyChoiceIncognito, setPrivacyChoiceIncognito] = useState<boolean>(false);
  const [privacyLoaded, setPrivacyLoaded] = useState<boolean>(false);
  const [userImage, setUserImage] = useState<string | null | undefined>(undefined);
  const [userNameLocal, setUserNameLocal] = useState<string | null | undefined>(undefined);
  const [userEmailLocal, setUserEmailLocal] = useState<string | null | undefined>(undefined);
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: "",
  });

  const { showLoading, hideLoading } = useLoading();

  const fetchUserProfile = async () => {
    if (!session?.user?.id) return;
    const query = `
      query GetUserProfile($id: String!) {
        users_by_pk(id: $id) {
          telemetry_consent
          anonymous_mode
          name
          email
          image
        }
      }
    `;

    try {
      const response = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, variables: { id: session.user.id } }),
      });
      const result = await response.json();
      if (result.data?.users_by_pk) {
        const u = result.data.users_by_pk;
        setTelemetryConsent(u.telemetry_consent ?? false);
        setAnonymousMode(!!u.anonymous_mode);
        setUserImage(u.image ?? null);
        setUserNameLocal(u.name ?? null);
        setUserEmailLocal(u.email ?? null);
        setPrivacyLoaded(true);
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  useEffect(() => {
    if (session?.user?.id) fetchUserProfile();
  }, [session?.user?.id]);

  useEffect(() => {
    // Show privacy modal on first login (once per browser) after we know current settings
    try {
      const shown = window.localStorage.getItem("privacyPromptShown_v1");
      if (
        session?.user?.id &&
        privacyLoaded &&
        !shown &&
        !showPrivacyModal
      ) {
        setPrivacyChoiceTelemetry(telemetryConsent);
        setPrivacyChoiceIncognito(anonymousMode);
        setShowPrivacyModal(true);
      }
    } catch (e) {
      // ignore localStorage errors
    }
  }, [session?.user?.id, privacyLoaded, telemetryConsent, anonymousMode, showPrivacyModal]);

  if (status === "loading")
    return <div className="loading loading-spinner loading-lg"></div>;
  if (!session?.user) return <AuthComponent />;

  const closeAlert = () => setAlertState({ ...alertState, isOpen: false });
  const closeConfirm = () => setShowDeleteConfirm(false);

  const closePrivacyModal = () => {
    try {
      window.localStorage.setItem("privacyPromptShown_v1", "1");
    } catch (e) {
      // ignore
    }
    setShowPrivacyModal(false);
  };

  const savePrivacyChoices = async () => {
    // Apply telemetry choice
    if (privacyChoiceTelemetry !== telemetryConsent) {
      // toggleTelemetry flips the current telemetryConsent value
      await toggleTelemetry();
    }

    // Apply incognito choice
    if (privacyChoiceIncognito !== anonymousMode) {
      // toggleAnonymous handles enabling/disabling and will reload when enabling
      await toggleAnonymous();
      // toggleAnonymous may reload the page; if it does, the rest won't run
    }

    // mark shown and close modal if still open
    try {
      window.localStorage.setItem("privacyPromptShown_v1", "1");
    } catch (e) {
      // ignore
    }
    setShowPrivacyModal(false);
  };

  const toggleTelemetry = async () => {
    const newValue = !telemetryConsent;

    // If enabling telemetry, ensure anonymous mode is turned off (mutual exclusive)
    if (newValue) setAnonymousMode(false);

    setTelemetryConsent(newValue);

    // If enabling telemetry, update both telemetry_consent and anonymous_mode server-side.
    // If disabling telemetry, only update telemetry_consent.
    const mutationEnable = `
            mutation UpdateUserTelemetryAndAnon($id: String!, $consent: Boolean!, $anon: Boolean!) {
                update_users_by_pk(pk_columns: {id: $id}, _set: {telemetry_consent: $consent, anonymous_mode: $anon}) {
                    telemetry_consent
                    anonymous_mode
                }
            }
        `;

    const mutationDisable = `
            mutation UpdateUserTelemetry($id: String!, $consent: Boolean!) {
                update_users_by_pk(pk_columns: {id: $id}, _set: {telemetry_consent: $consent}) {
                    telemetry_consent
                }
            }
        `;

    try {
      const payload = newValue
        ? { query: mutationEnable, variables: { id: session.user.id, consent: newValue, anon: false } }
        : { query: mutationDisable, variables: { id: session.user.id, consent: newValue } };

      const response = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.errors) {
        console.error("Error updating telemetry consent:", result.errors);
        // revert local state
        setTelemetryConsent(!newValue);
        if (newValue) setAnonymousMode(true);
        setAlertState({ isOpen: true, message: "Failed to update telemetry settings." });
        return;
      }

      // If we just enabled telemetry and server cleared anonymous mode, refresh profile data
      if (newValue) {
        try {
          await fetchUserProfile();
        } catch (e) {
          // ignore
        }
      }
    } catch (error) {
      console.error("Error updating telemetry consent:", error);
      setTelemetryConsent(!newValue);
      if (newValue) setAnonymousMode(true);
      setAlertState({ isOpen: true, message: "An error occurred. Please try again." });
    }
  };

  const toggleAnonymous = async () => {
    const newValue = !anonymousMode;

    if (newValue) {
      // Enabling anonymous mode: scrub PII (set name/email/image to null) and disable telemetry
      try {
        setAnonymousMode(true);
        // Ensure telemetry is turned off locally
        setTelemetryConsent(false);
        const res = await fetch("/api/user/scrub", { method: "POST" });
        if (!res.ok) throw new Error("Scrub failed");
        // Refresh profile section from GraphQL so UI updates without a full reload
        await fetchUserProfile();
      } catch (err) {
        console.error("Failed to enable anonymous mode:", err);
        setAlertState({ isOpen: true, message: "Failed to enable anonymous mode." });
        setAnonymousMode(false);
      }
      return;
    }

    // Disabling anonymous mode: push current session PII to the DB
    try {
      const mutation = `
        mutation RestorePII($id: String!, $name: String, $email: String, $image: String, $anon: Boolean!) {
          update_users_by_pk(pk_columns: {id: $id}, _set: {name: $name, email: $email, image: $image, anonymous_mode: $anon}) {
            id
          }
        }
      `;

      const vars = {
        id: session!.user.id,
        name: session!.user.name || null,
        email: session!.user.email || null,
        image: session!.user.image || null,
        anon: false,
      };

      const response = await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: mutation, variables: vars }),
      });

      const result = await response.json();
      if (result.errors) {
        console.error("Error restoring PII:", result.errors);
        setAlertState({ isOpen: true, message: "Failed to disable anonymous mode." });
        return;
      }

      setAnonymousMode(false);
      // Refresh profile section so UI reflects restored PII
      await fetchUserProfile();
    } catch (err) {
      console.error("Failed to disable anonymous mode:", err);
      setAlertState({ isOpen: true, message: "Failed to update anonymous mode." });
    }
  };

  // scrubPersonalInfo removed — anonymous toggle now performs scrubbing

  const deleteAccount = async () => {
    setShowDeleteConfirm(false);

    try {
      showLoading();

      const mutation = `
        mutation DeleteUserEverything($id: String!) {
          delete_items(where: {owner_id: {_eq: $id}}) {
            affected_rows
          }
          delete_courses(where: {owner_id: {_eq: $id}}) {
            affected_rows
          }
          delete_users_by_pk(id: $id) {
            id
          }
        }
      `;

      const response = await fetch("/api/graphql", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: mutation,
          variables: {
            id: session.user.id,
          },
        }),
      });

      const result = await response.json();

      if (result.errors) {
        console.error("Error deleting account:", result.errors);
        setAlertState({
          isOpen: true,
          message: "Failed to delete account. Please try again.",
        });
        return;
      }

      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Error deleting account:", error);
      setAlertState({
        isOpen: true,
        message: "An error occurred. Please try again.",
      });
    } finally {
      try {
        hideLoading();
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="dropdown dropdown-end">
      <Modal
        isOpen={showDeleteConfirm}
        onClose={closeConfirm}
        title="Delete Account"
        onConfirm={deleteAccount}
        actions={
          <>
            <button className="btn" onClick={closeConfirm}>
              Cancel
            </button>
            <button className="btn btn-error" onClick={deleteAccount}>
              Delete
            </button>
          </>
        }
      >
        <p>
          Are you sure you want to delete your account? This action cannot be
          undone.
        </p>
      </Modal>
      <Modal
        isOpen={alertState.isOpen}
        onClose={closeAlert}
        title="Error"
        onConfirm={closeAlert}
        actions={
          <button className="btn" onClick={closeAlert}>
            Close
          </button>
        }
      >
        <p>{alertState.message}</p>
      </Modal>
      <Modal
        isOpen={showPrivacyModal}
        onClose={closePrivacyModal}
        title="Data & Privacy"
        onConfirm={savePrivacyChoices}
        actions={
          <>
            <button className="btn" onClick={closePrivacyModal}>
              Skip
            </button>
            <button className="btn btn-primary" onClick={savePrivacyChoices}>
              Save
            </button>
          </>
        }
      >
        <p className="mb-3">Choose how you want us to handle data for your account.</p>
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex-1">
            <div className="font-semibold">Telemetry</div>
            <div className="text-sm text-base-content/60">Help improve the app — only anonymous usage data is collected, no personal identifiers.</div>
          </div>
          <input
            type="checkbox"
            className="toggle toggle-sm toggle-primary"
            checked={privacyChoiceTelemetry}
            onChange={() => {
              const next = !privacyChoiceTelemetry;
              setPrivacyChoiceTelemetry(next);
              if (next) setPrivacyChoiceIncognito(false);
            }}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1">
            <div className="font-semibold">Incognito</div>
            <div className="text-sm text-base-content/60">Enable to remove name/email/image from your account and disable telemetry.</div>
          </div>
          <input
            type="checkbox"
            className="toggle toggle-sm toggle-primary"
            checked={privacyChoiceIncognito}
            onChange={() => {
              const next = !privacyChoiceIncognito;
              setPrivacyChoiceIncognito(next);
              if (next) setPrivacyChoiceTelemetry(false);
            }}
          />
        </div>
      </Modal>
      <div
        tabIndex={0}
        role="button"
        className="btn btn-ghost btn-circle avatar"
        onMouseDown={(e) => {
          if (document.activeElement === e.currentTarget) {
            e.currentTarget.blur();
            e.preventDefault();
          }
        }}
      >
        <div className="w-10 rounded-full overflow-hidden bg-base-200 flex items-center justify-center">
          {anonymousMode ? (
            <FontAwesomeIcon icon={faCircleUser} className="text-[40px] text-base-content" />
          ) : (
            <Image
              src={userImage ?? session.user.image ?? "/next.svg"}
              alt={userNameLocal ?? session.user.name ?? "Profile"}
              width={40}
              height={40}
            />
          )}
        </div>
      </div>
      <div
        tabIndex={0}
        className="mt-1 dropdown-content z-[1] p-2 shadow-2xl bg-base-300 rounded-box w-52 overflow-y-auto border border-base-content/10"
      >
        <div className="flex px-4 py-2 mt-2 flex-col gap-1">
          <span className="font-bold text-base text-base-content">
            {anonymousMode ? "Anonymous User" : (userNameLocal ?? session.user.name)}
          </span>
          <span className="font-normal text-sm text-base-content/50 truncate w-full">
            {anonymousMode ? "no email" : (userEmailLocal ?? session.user.email)}
          </span>
        </div>
        <div className="divider my-0 px-4"></div>
        <ul className="menu menu-sm w-full px-2 gap-1">
          <li>
            <a onClick={() => toggleTelemetry()} className="justify-between">
              <div>
                <FontAwesomeIcon icon={faArrowTrendUp} className="mr-1" />
                Telemetry
              </div>
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={telemetryConsent}
                readOnly
              />
            </a>
          </li>
          <li>
            <a onClick={() => toggleAnonymous()} className="justify-between">
              <div>
                <FontAwesomeIcon icon={faEyeLowVision} className="mr-1" />
                Incognito
              </div>
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={anonymousMode}
                readOnly
              />
            </a>
          </li>
          <li>
            <a onClick={() => signOut({ callbackUrl: "/" })}>Sign out</a>
          </li>
          <li>
            <a
              onClick={() => setShowDeleteConfirm(true)}
              className="text-error"
            >
              Delete Account
            </a>
          </li>
        </ul>
      </div>
      {/* scrub modal removed — scrubbing occurs when enabling Anonymous Mode */}
    </div>
  );
}

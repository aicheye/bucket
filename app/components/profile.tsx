"use client";

import { faArrowTrendUp, faCircleUser, faEyeLowVision } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
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

  const fetchUserProfile = useCallback(async () => {
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
        // If the DB has no PII but the session does, and the user is not anonymous,
        // write the session PII back to the DB so the profile isn't blank.
        try {
          if (
            !u.anonymous_mode &&
            (u.name == null || u.image == null || u.email == null) &&
            session?.user?.id
          ) {
            const nameToSet = u.name ?? session.user.name ?? null;
            const emailToSet = u.email ?? session.user.email ?? null;
            const imageToSet = u.image ?? session.user.image ?? null;

            // Only attempt update if we have something to write
            if (nameToSet || emailToSet || imageToSet) {
              const mutation = `
                  mutation UpdateMissingPII($id: String!, $name: String, $email: String, $image: String, $anon: Boolean!) {
                    update_users_by_pk(pk_columns: {id: $id}, _set: {name: $name, email: $email, image: $image, anonymous_mode: $anon}) {
                      id
                    }
                  }
                `;



              const resp = await fetch("/api/graphql", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  query: mutation,
                  variables: {
                    id: session.user.id,
                    name: nameToSet,
                    email: emailToSet,
                    image: imageToSet,
                    anon: false,
                  },
                }),
              });

              const updateResult = await resp.json();

              if (!updateResult.errors) {
                // update local state so UI reflects the new values immediately
                setUserNameLocal(nameToSet ?? null);
                setUserEmailLocal(emailToSet ?? null);
                setUserImage(imageToSet ?? null);
                setAnonymousMode(false);
                // notify other parts of the app that profile changed
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new CustomEvent("user-profile-updated"));
                }
              } else {
                console.error("Error updating missing PII:", updateResult.errors);
              }
            }
          }
        } catch (err) {
          console.error("Error attempting to update missing PII:", err);
        }
      }
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) fetchUserProfile();
  }, [session?.user?.id]);

  // Listen for profile refresh requests from other parts of the app
  useEffect(() => {
    const handler = () => {
      if (session?.user?.id) fetchUserProfile();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("user-profile-updated", handler as EventListener);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("user-profile-updated", handler as EventListener);
      }
    };
  }, [session?.user?.id, fetchUserProfile]);

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
        // Back up current PII to localStorage so it can be restored if the
        // user disables incognito later. This is stored only in the browser.
        try {
          const backup = {
            name: session?.user?.name ?? null,
            email: session?.user?.email ?? null,
            image: session?.user?.image ?? null,
          };
          window.localStorage.setItem("user_pii_backup_v1", JSON.stringify(backup));
        } catch (e) {
          // ignore storage errors
        }

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
            name
            email
            image
            anonymous_mode
          }
        }
      `;

      // If the session no longer contains PII (e.g., after a refresh while
      // anonymous), fall back to any backed-up PII we saved before scrubbing.
      let backup: { name?: string | null; email?: string | null; image?: string | null } | null = null;
      try {
        const raw = window.localStorage.getItem("user_pii_backup_v1");
        if (raw) backup = JSON.parse(raw);
      } catch (e) {
        // ignore
      }

      const vars = {
        id: session!.user.id,
        name: session!.user.name || (backup?.name ?? null) || null,
        email: session!.user.email || (backup?.email ?? null) || null,
        image: session!.user.image || (backup?.image ?? null) || null,
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

      // Use the mutation response (authoritative) to update UI immediately
      const updated = result.data?.update_users_by_pk;
      if (updated) {
        setUserNameLocal(updated.name ?? session!.user.name ?? null);
        setUserEmailLocal(updated.email ?? session!.user.email ?? null);
        setUserImage(updated.image ?? session!.user.image ?? null);
        setAnonymousMode(!!updated.anonymous_mode);
        // Remove backup now that PII has been restored into the DB
        try {
          window.localStorage.removeItem("user_pii_backup_v1");
        } catch (e) {
          // ignore
        }
      } else {
        setAnonymousMode(false);
      }
      // Try to refresh the NextAuth client session without a full reload so
      // the session callback runs and restored PII appears in `useSession`.
      try {
        // Dynamic import to avoid SSR/type issues. Try a few approaches to
        // force next-auth's client to refresh its internal session cache.
        const nextAuth = await import("next-auth/react");
        // Preferred: call the internal _getSession with an event hint which
        // next-auth uses to force a refresh across listeners.
        if ((nextAuth as any)?._getSession) {
          try {
            await (nextAuth as any)._getSession({ event: "storage" });
          } catch (e) {
            // ignore
          }
        }

        // Next fallback: call the public getSession with event hint (some
        // next-auth versions accept this).
        if ((nextAuth as any)?.getSession) {
          try {
            await (nextAuth.getSession as any)({ event: "storage" });
          } catch (e) {
            try {
              await nextAuth.getSession();
            } catch (ee) {
              // ignore
            }
          }
        }
      } catch (err) {
        console.error("Failed to refresh next-auth session:", err);
      }

      // Re-fetch profile data so UI reflects restored PII. Use polling to
      // handle any propagation delays and avoid depending on React state
      // update timing.
      try {
        const fetchRawUser = async () => {
          const q = `query GetUserProfile($id: String!) { users_by_pk(id: $id) { telemetry_consent anonymous_mode name email image } }`;
          const r = await fetch("/api/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: q, variables: { id: session!.user.id } }),
          });
          const j = await r.json();
          return j?.data?.users_by_pk ?? null;
        };

        let attempts = 0;
        const maxAttempts = 6;
        const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));
        let fresh: any = null;

        while (attempts < maxAttempts) {
          fresh = await fetchRawUser();
          if (fresh && (!fresh.anonymous_mode) && (fresh.name || fresh.email || fresh.image)) {
            // update local state immediately and break
            setTelemetryConsent(fresh.telemetry_consent ?? false);
            setAnonymousMode(!!fresh.anonymous_mode);
            setUserImage(fresh.image ?? null);
            setUserNameLocal(fresh.name ?? null);
            setUserEmailLocal(fresh.email ?? null);
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("user-profile-updated"));
            }
            break;
          }
          attempts += 1;
          await delay(250);
        }
        // As a last step, call the existing fetchUserProfile to ensure any
        // other state is synchronized.
        try {
          await fetchUserProfile();
        } catch {
          // ignore
        }
      } catch (e) {
        // ignore
      }
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
              src={userImage || session.user.image || "/next.svg"}
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

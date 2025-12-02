"use client";

import {
  faArrowTrendUp,
  faCircleUser,
  faEyeLowVision,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { sendQuery } from "../../../lib/graphql";
import {
  DELETE_USER_EVERYTHING,
  UPDATE_USER_PII,
  UPDATE_USER_TELEMETRY,
  UPDATE_USER_TELEMETRY_AND_ANON,
} from "../../../lib/graphql/mutations";
import { GET_USER_FULL } from "../../../lib/graphql/queries";
import { useLoading } from "../../contexts/LoadingContext";
import { useAlertState } from "../../hooks/useAlertState";
import AuthComponent from "../ui/AuthButton";
import Modal from "../ui/Modal";

export default function Profile() {
  const { data: session, status } = useSession();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [telemetryConsent, setTelemetryConsent] = useState<boolean>(false);
  const [anonymousMode, setAnonymousMode] = useState<boolean>(true);
  const [userImage, setUserImage] = useState<string | null | undefined>(
    undefined,
  );
  const [userNameLocal, setUserNameLocal] = useState<string | null | undefined>(
    undefined,
  );
  const [userEmailLocal, setUserEmailLocal] = useState<
    string | null | undefined
  >(undefined);
  const { alertState, showAlert, closeAlert } = useAlertState();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const { showLoading, hideLoading } = useLoading();

  const fetchUserProfile = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const result = await sendQuery({
        query: GET_USER_FULL,
        variables: { id: session.user.id },
      });
      if (result.data?.users_by_pk) {
        const u = result.data.users_by_pk;
        setTelemetryConsent(u.telemetry_consent ?? false);
        setAnonymousMode(!!u.anonymous_mode);
        setUserImage(u.image ?? null);
        setUserNameLocal(u.name ?? null);
        setUserEmailLocal(u.email ?? null);
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
              const updateResult = await sendQuery({
                query: UPDATE_USER_PII,
                variables: {
                  id: session.user.id,
                  name: nameToSet,
                  email: emailToSet,
                  image: imageToSet,
                  anon: false,
                },
              });

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
                // ignore
              }
            }
          }
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }, [
    session?.user?.id,
    session?.user?.name,
    session?.user?.email,
    session?.user?.image,
  ]);

  useEffect(() => {
    if (session?.user?.id) fetchUserProfile();
  }, [session?.user?.id, fetchUserProfile]);

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
        window.removeEventListener(
          "user-profile-updated",
          handler as EventListener,
        );
      }
    };
  }, [session?.user?.id, fetchUserProfile]);

  // Close dropdown on outside click / escape — keep before early returns so hooks order is stable
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (!rootRef.current.contains(target)) setOpen(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  if (status === "loading")
    return <div className="loading loading-spinner loading-lg"></div>;
  if (!session?.user) return <AuthComponent />;

  const closeConfirm = () => setShowDeleteConfirm(false);

  const toggleTelemetry = async () => {
    setOpen(false);
    const newValue = !telemetryConsent;

    // If enabling telemetry, ensure anonymous mode is turned off (mutual exclusive)
    if (newValue) setAnonymousMode(false);

    setTelemetryConsent(newValue);

    // If enabling telemetry, update both telemetry_consent and anonymous_mode server-side.
    // If disabling telemetry, only update telemetry_consent.
    try {
      const payload = newValue
        ? {
          query: UPDATE_USER_TELEMETRY_AND_ANON,
          variables: { id: session.user.id, consent: newValue, anon: false },
        }
        : {
          query: UPDATE_USER_TELEMETRY,
          variables: { id: session.user.id, consent: newValue },
        };

      const result = await sendQuery(payload);

      if (result.errors) {
        // revert local state
        setTelemetryConsent(!newValue);
        if (newValue) setAnonymousMode(true);
        showAlert("Failed to update telemetry settings.");
        return;
      }

      // If we just enabled telemetry and server cleared anonymous mode, refresh profile data
      if (newValue) {
        try {
          await fetchUserProfile();
        } catch {
          // ignore
        }
      }
    } catch {
      // revert local state
      setTelemetryConsent(!newValue);
      if (newValue) setAnonymousMode(true);
      showAlert("An error occurred. Please try again.");
    }
  };

  const toggleAnonymous = async () => {
    setOpen(false);
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
          window.localStorage.setItem(
            "user_pii_backup_v1",
            JSON.stringify(backup),
          );
        } catch {
          // ignore
        }

        const res = await fetch("/api/user/scrub", { method: "POST" });

        if (!res.ok) throw new Error("Scrub failed");
        // Refresh profile section from GraphQL so UI updates without a full reload
        await fetchUserProfile();
      } catch {
        showAlert("Failed to enable anonymous mode.");
        setAnonymousMode(false);
      }
      return;
    }

    // Disabling anonymous mode: push current session PII to the DB
    try {
      // If the session no longer contains PII (e.g., after a refresh while
      // anonymous), fall back to any backed-up PII we saved before scrubbing.
      let backup: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
      } | null = null;
      try {
        const raw = window.localStorage.getItem("user_pii_backup_v1");
        if (raw) backup = JSON.parse(raw);
      } catch {
        // ignore
      }

      const vars = {
        id: session!.user.id,
        name: session!.user.name || (backup?.name ?? null) || null,
        email: session!.user.email || (backup?.email ?? null) || null,
        image: session!.user.image || (backup?.image ?? null) || null,
        anon: false,
      };

      const result = await sendQuery({
        query: UPDATE_USER_PII,
        variables: vars,
      });
      if (result.errors) {
        showAlert("Failed to disable anonymous mode.");
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
        } catch {
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

        interface NextAuthInternal {
          _getSession: (args: { event: string }) => Promise<void>;
          getSession: (args?: { event: string }) => Promise<void>;
        }

        // Preferred: call the internal _getSession with an event hint which
        // next-auth uses to force a refresh across listeners.
        const na = nextAuth as unknown as NextAuthInternal;
        if (na._getSession) {
          try {
            await na._getSession({ event: "storage" });
          } catch {
            // ignore
          }
        }

        // Next fallback: call the public getSession with event hint (some
        // next-auth versions accept this).
        if (na.getSession) {
          try {
            await na.getSession({ event: "storage" });
          } catch {
            try {
              await nextAuth.getSession();
            } catch {
              // ignore
            }
          }
        }
      } catch {
        // ignore
      }

      // Re-fetch profile data so UI reflects restored PII. Use polling to
      // handle any propagation delays and avoid depending on React state
      // update timing.
      try {
        const fetchRawUser = async () => {
          const j = await sendQuery({
            query: GET_USER_FULL,
            variables: { id: session!.user.id },
          });
          return j?.data?.users_by_pk ?? null;
        };

        let attempts = 0;
        const maxAttempts = 6;
        const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

        interface UserProfile {
          telemetry_consent?: boolean;
          anonymous_mode?: boolean;
          name?: string | null;
          email?: string | null;
          image?: string | null;
        }

        let fresh: UserProfile | null = null;

        while (attempts < maxAttempts) {
          fresh = await fetchRawUser();
          if (
            fresh &&
            !fresh.anonymous_mode &&
            (fresh.name || fresh.email || fresh.image)
          ) {
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
      } catch {
        // ignore
      }
    } catch {
      setAnonymousMode(true);
      showAlert("Failed to update anonymous mode.");
    }
  };

  const deleteAccount = async () => {
    setShowDeleteConfirm(false);
    setOpen(false);

    try {
      showLoading();

      const result = await sendQuery({
        query: DELETE_USER_EVERYTHING,
        variables: { id: session.user.id },
      });

      if (result.errors) {
        showAlert("Failed to delete account. Please try again.");
        return;
      }

      await signOut({ callbackUrl: "/" });
    } catch {
      showAlert("An error occurred. Please try again.");
    } finally {
      try {
        hideLoading();
      } catch {
        // ignore
      }
    }
  };

  

  return (
    <div ref={rootRef} className={`dropdown dropdown-end ${open ? "dropdown-open" : ""}`}>
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
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
        className="btn btn-ghost btn-circle avatar"
        onMouseDown={(e) => {
          // Prevent focus wobble and toggle open state
          if (document.activeElement === e.currentTarget) {
            e.currentTarget.blur();
            e.preventDefault();
          }
          e.preventDefault();
          setOpen((v) => !v);
        }}
        onClick={(e) => e.preventDefault()}
      >
        <div className="w-10 rounded-full overflow-hidden bg-base-200 flex items-center justify-center">
          {anonymousMode ? (
            <FontAwesomeIcon
              icon={faCircleUser}
              className="text-[40px] text-base-content"
            />
          ) : (
            <Image
              src={userImage || session.user.image || "/default-avatar.png"}
              alt={userNameLocal ?? session.user.name ?? "Profile"}
              width={40}
              height={40}
            />
          )}
        </div>
      </button>
      <div
        role="menu"
        aria-label="Profile menu"
        tabIndex={0}
        className="mt-1 dropdown-content z-50 shadow-2xl bg-base-300 rounded-box w-52 overflow-y-auto border border-base-content/10"
      >
        <div className="flex px-4 py-2 mt-2 flex-col gap-1">
          <span className="font-bold text-base text-base-content">
            {anonymousMode
              ? "Anonymous User"
              : (userNameLocal ?? session.user.name)}
          </span>
          <span className="font-normal text-sm text-base-content/50 truncate w-full">
            {anonymousMode
              ? "no email"
              : (userEmailLocal ?? session.user.email)}
          </span>
        </div>
        <div className="divider my-0 px-4"></div>
        <ul className="menu menu-sm w-full px-2 gap-1">
          <li>
            <button
              type="button"
              role="menuitem"
              onClick={() => toggleAnonymous()}
              className="justify-between w-full text-left"
            >
              <div>
                <FontAwesomeIcon
                  icon={faEyeLowVision}
                  className="mr-1"
                  aria-hidden="true"
                />
                Incognito
              </div>
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={anonymousMode}
                readOnly
                aria-hidden="true"
              />
            </button>
          </li>
          <li>
            <button
              type="button"
              role="menuitem"
              onClick={() => toggleTelemetry()}
              className="justify-between w-full text-left"
            >
              <div>
                <FontAwesomeIcon
                  icon={faArrowTrendUp}
                  className="mr-1"
                  aria-hidden="true"
                />
                Telemetry
              </div>
              <input
                type="checkbox"
                className="toggle toggle-sm toggle-primary"
                checked={telemetryConsent}
                readOnly
                aria-hidden="true"
              />
            </button>
          </li>
          <li>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                signOut({ callbackUrl: "/" });
              }}
              className="w-full text-left"
            >
              Sign out
            </button>
          </li>
          <li>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setShowDeleteConfirm(true);
              }}
              className="text-error hover:bg-error hover:text-error-content w-full text-left"
            >
              Delete Account
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}

"use client";

import {
  faArrowTrendUp,
  faCircleUser,
  faEyeLowVision,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { sendQuery } from "../../lib/graphql";
import AuthComponent from "./auth-button";
import { useLoading } from "./loading-context";
import Modal from "./modal";

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
      const result = await sendQuery({
        query,
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
              const mutation = `
                  mutation UpdateMissingPII($id: String!, $name: String, $email: String, $image: String, $anon: Boolean!) {
                    update_users_by_pk(pk_columns: {id: $id}, _set: {name: $name, email: $email, image: $image, anonymous_mode: $anon}) {
                      id
                    }
                  }
                `;

              const updateResult = await sendQuery({
                query: mutation,
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
                console.error(
                  "Error updating missing PII:",
                  updateResult.errors,
                );
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

  if (status === "loading")
    return <div className="loading loading-spinner loading-lg"></div>;
  if (!session?.user) return <AuthComponent />;

  const closeAlert = () => setAlertState({ ...alertState, isOpen: false });
  const closeConfirm = () => setShowDeleteConfirm(false);

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
        ? {
            query: mutationEnable,
            variables: { id: session.user.id, consent: newValue, anon: false },
          }
        : {
            query: mutationDisable,
            variables: { id: session.user.id, consent: newValue },
          };

      const result = await sendQuery(payload);

      if (result.errors) {
        console.error("Error updating telemetry consent:", result.errors);
        // revert local state
        setTelemetryConsent(!newValue);
        if (newValue) setAnonymousMode(true);
        setAlertState({
          isOpen: true,
          message: "Failed to update telemetry settings.",
        });
        return;
      }

      // If we just enabled telemetry and server cleared anonymous mode, refresh profile data
      if (newValue) {
        try {
          await fetchUserProfile();
        } catch (err) {
          console.error("Failed to fetch user profile:", err);
        }
      }
    } catch (error) {
      console.error("Error updating telemetry consent:", error);
      setTelemetryConsent(!newValue);
      if (newValue) setAnonymousMode(true);
      setAlertState({
        isOpen: true,
        message: "An error occurred. Please try again.",
      });
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
          window.localStorage.setItem(
            "user_pii_backup_v1",
            JSON.stringify(backup),
          );
        } catch (err) {
          console.error("Failed to back up PII to localStorage:", err);
        }

        const res = await fetch("/api/user/scrub", { method: "POST" });

        if (!res.ok) throw new Error("Scrub failed");
        // Refresh profile section from GraphQL so UI updates without a full reload
        await fetchUserProfile();
      } catch (err) {
        console.error("Failed to enable anonymous mode:", err);
        setAlertState({
          isOpen: true,
          message: "Failed to enable anonymous mode.",
        });
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
      let backup: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
      } | null = null;
      try {
        const raw = window.localStorage.getItem("user_pii_backup_v1");
        if (raw) backup = JSON.parse(raw);
      } catch (err) {
        console.error("Failed to parse PII backup from localStorage:", err);
      }

      const vars = {
        id: session!.user.id,
        name: session!.user.name || (backup?.name ?? null) || null,
        email: session!.user.email || (backup?.email ?? null) || null,
        image: session!.user.image || (backup?.image ?? null) || null,
        anon: false,
      };

      const result = await sendQuery({ query: mutation, variables: vars });
      if (result.errors) {
        console.error("Error restoring PII:", result.errors);
        setAlertState({
          isOpen: true,
          message: "Failed to disable anonymous mode.",
        });
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
        } catch (err) {
          console.error("Failed to remove PII backup from localStorage:", err);
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
      } catch (err) {
        console.error("Failed to refresh next-auth session:", err);
      }

      // Re-fetch profile data so UI reflects restored PII. Use polling to
      // handle any propagation delays and avoid depending on React state
      // update timing.
      try {
        const fetchRawUser = async () => {
          const q = `query GetUserProfile($id: String!) { users_by_pk(id: $id) { telemetry_consent anonymous_mode name email image } }`;
          const j = await sendQuery({
            query: q,
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
        } catch (err) {
          console.error("Failed to fetch user profile:", err);
        }
      } catch (err) {
        console.error("Failed to disable anonymous mode:", err);
      }
    } catch (error) {
      console.error("Error disabling anonymous mode:", error);
      setAnonymousMode(true);
      setAlertState({
        isOpen: true,
        message: "Failed to update anonymous mode.",
      });
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

      const result = await sendQuery({
        query: mutation,
        variables: { id: session.user.id },
      });

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
      <button
        type="button"
        aria-haspopup="menu"
        aria-label="Open profile menu"
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
            <FontAwesomeIcon
              icon={faCircleUser}
              className="text-[40px] text-base-content"
            />
          ) : (
            <Image
              src={userImage || session.user.image || null}
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
        className="mt-1 dropdown-content z-[1] shadow-2xl bg-base-300 rounded-box w-52 overflow-y-auto border border-base-content/10"
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
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full text-left"
            >
              Sign out
            </button>
          </li>
          <li>
            <button
              type="button"
              role="menuitem"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-error hover:bg-error hover:text-error-content w-full text-left"
            >
              Delete Account
            </button>
          </li>
        </ul>
      </div>
      {/* scrub modal removed — scrubbing occurs when enabling Anonymous Mode */}
    </div>
  );
}

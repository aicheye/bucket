"use client";

import { signOut, useSession } from "next-auth/react";
import Image from "next/image";
import { useState } from "react";
import AuthComponent from "./auth-button";
import Modal from "./modal";

export default function Profile() {
    const { data: session, status } = useSession();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [alertState, setAlertState] = useState<{ isOpen: boolean; message: string }>({
        isOpen: false,
        message: "",
    });

    if (status === "loading") return null;
    if (!session?.user) return <AuthComponent />;

    const closeAlert = () => setAlertState({ ...alertState, isOpen: false });
    const closeConfirm = () => setShowDeleteConfirm(false);

    const deleteAccount = async () => {
        setShowDeleteConfirm(false);
        try {
            const mutation = `
        mutation DeleteUserAndCourses($id: String!) {
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
                setAlertState({ isOpen: true, message: "Failed to delete account. Please try again." });
                return;
            }

            await signOut({ callbackUrl: "/" });
        } catch (error) {
            console.error("Error deleting account:", error);
            setAlertState({ isOpen: true, message: "An error occurred. Please try again." });
        }
    };

    return (
        <div className="dropdown dropdown-end">
            <Modal
                isOpen={showDeleteConfirm}
                onClose={closeConfirm}
                title="Delete Account"
                actions={
                    <>
                        <button className="btn" onClick={closeConfirm}>Cancel</button>
                        <button className="btn btn-error" onClick={deleteAccount}>Delete</button>
                    </>
                }
            >
                <p>Are you sure you want to delete your account? This action cannot be undone.</p>
            </Modal>
            <Modal
                isOpen={alertState.isOpen}
                onClose={closeAlert}
                title="Error"
                actions={<button className="btn" onClick={closeAlert}>Close</button>}
            >
                <p>{alertState.message}</p>
            </Modal>
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                <div className="w-10 rounded-full">
                    <Image
                        src={session.user.image || ""}
                        alt={session.user.name || "Profile"}
                        width={40}
                        height={40}
                    />
                </div>
            </div>
            <div
                tabIndex={0}
                className="mt-2 z-[1] shadow dropdown-content bg-neutral rounded-box w-52"
            >
                <div className="flex px-4 py-2 mt-2 flex-col gap-1">
                    <span className="font-bold text-base text-base-content">{session.user.name}</span>
                    <span className="font-normal text-sm text-base-content/50 truncate w-full">{session.user.email}</span>
                </div>
                <div className="divider my-0 px-4"></div>
                <ul className="menu menu-sm w-full">
                    <li>
                        <a onClick={() => signOut({ callbackUrl: "/" })}>Sign out</a>
                    </li>
                    <li>
                        <a onClick={() => setShowDeleteConfirm(true)} className="text-error">
                            Delete Account
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    );
}

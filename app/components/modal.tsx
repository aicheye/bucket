"use client";
import { useEffect, useRef } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  onConfirm?: () => void;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  actions,
  onConfirm,
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    try {
      if (isOpen) {
        if (!dialog.open) dialog.showModal();
      }
    } catch (err) {
      console.error("Modal show/close failed:", err);
    }

    // Ensure dialog is closed on unmount or when isOpen changes to false
    return () => {
      try {
        // Close this dialog if it's still open
        if (dialog.open) dialog.close();
      } catch (e) {
        // swallow
      }

      // Defensive: ensure no other lingering native dialog backdrops remain
      try {
        if (typeof document !== "undefined") {
          const openDialogs = Array.from(document.querySelectorAll("dialog")).filter((d) => (d as HTMLDialogElement).open) as HTMLDialogElement[];
          openDialogs.forEach((d) => {
            try {
              d.close();
            } catch (err) {
              // swallow
            }
          });
        }
      } catch (err) {
        // swallow
      }
    };
  }, [isOpen]);

  // When the modal is not open, don't render the dialog element.
  // We still call hooks above to preserve hook order.
  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && onConfirm) {
      // Don't trigger if the user is in a textarea (needs newlines)
      if (e.target instanceof HTMLTextAreaElement) return;
      // Don't trigger if the user is on a button (native click handles it)
      if (e.target instanceof HTMLButtonElement) return;
      // Don't trigger if the user is on a link
      if (e.target instanceof HTMLAnchorElement) return;

      e.preventDefault();
      onConfirm();
    }
  };

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose} onKeyDown={handleKeyDown}>
      <div className="modal-box" style={{ position: "relative", zIndex: 50 }}>
        {title && <h3 className="font-bold text-lg">{title}</h3>}
        <div className="py-4">{children}</div>
        <div className="modal-action">{actions}</div>
      </div>
      <form method="dialog" className="modal-backdrop" style={{ zIndex: 40 }}>
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

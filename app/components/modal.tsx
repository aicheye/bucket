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

    if (isOpen) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [isOpen]);

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
    <dialog
      ref={dialogRef}
      className="modal"
      onClose={onClose}
      onKeyDown={handleKeyDown}
    >
      <div className="modal-box">
        {title && <h3 className="font-bold text-lg">{title}</h3>}
        <div className="py-4">{children}</div>
        <div className="modal-action">{actions}</div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

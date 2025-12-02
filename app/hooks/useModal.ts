/**
 * Custom hook for managing modal state
 */

import { useCallback, useState } from "react";

export function useModal(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen,
  };
}

/**
 * Test skeleton for useModal
 *
 * @jest-environment jsdom
 */
// describe("useModal", () => {
//   it("should initialize with default state", () => {
//     // TODO: Implement test
//   });
//
//   it("should open modal", () => {
//     // TODO: Implement test
//   });
//
//   it("should close modal", () => {
//     // TODO: Implement test
//   });
//
//   it("should toggle modal", () => {
//     // TODO: Implement test
//   });
// });

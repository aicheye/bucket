/**
 * Custom hook for managing alert state
 */

import { useCallback, useState } from "react";
import type { ModalState } from "../../lib/types";

export function useAlertState(
  initialState: ModalState = { isOpen: false, message: "" },
) {
  const [alertState, setAlertState] = useState<ModalState>(initialState);

  const showAlert = useCallback((message: string) => {
    setAlertState({ isOpen: true, message });
  }, []);

  const closeAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    alertState,
    showAlert,
    closeAlert,
    setAlertState,
  };
}

/**
 * Test skeleton for useAlertState
 *
 * @jest-environment jsdom
 */
// describe("useAlertState", () => {
//   it("should initialize with default state", () => {
//     // TODO: Implement test
//   });
//
//   it("should show alert with message", () => {
//     // TODO: Implement test
//   });
//
//   it("should close alert", () => {
//     // TODO: Implement test
//   });
// });

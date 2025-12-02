/**
 * Legal page container component
 * Provides consistent layout for all legal pages
 */

import { ReactNode } from "react";

interface ProsePageContainerProps {
  children: ReactNode;
}

export default function ProsePageContainer({
  children,
}: ProsePageContainerProps) {
  return (
    <div className="card flex flex-col flex-1 gap-8 max-w-3xl mx-auto p-12 w-full text-base-content text-left bg-base-100 my-8 shadow-lg">
      {children}
    </div>
  );
}

/**
 * Test skeleton for LegalPageContainer
 *
 * @jest-environment jsdom
 */
// describe("LegalPageContainer", () => {
//   it("should render children within legal page layout", () => {
//     // TODO: Implement test
//   });
//
//   it("should apply correct container classes", () => {
//     // TODO: Implement test
//   });
// });

/**
 * External link component with consistent styling
 */

import { ReactNode } from "react";

interface ExternalLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

export default function ExternalLink({
  href,
  children,
  className = "",
}: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`link link-primary ${className}`}
    >
      {children}
    </a>
  );
}

/**
 * Test skeleton for ExternalLink
 *
 * @jest-environment jsdom
 */
// describe("ExternalLink", () => {
//   it("should render link with target=_blank", () => {
//     // TODO: Implement test
//   });
//
//   it("should have noopener noreferrer", () => {
//     // TODO: Implement test
//   });
//
//   it("should apply custom className", () => {
//     // TODO: Implement test
//   });
// });

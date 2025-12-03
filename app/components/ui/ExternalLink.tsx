/**
 * External link component with consistent styling
 */

import { ReactNode } from "react";

interface ExternalLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  decorations?: string;
  title?: string;
  "aria-label"?: string;
}

export default function ExternalLink({
  href,
  children,
  className = "",
  decorations = "link link-primary",
  title,
  "aria-label": ariaLabel,
}: ExternalLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${decorations} ${className}`}
      title={title}
      aria-label={ariaLabel}
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

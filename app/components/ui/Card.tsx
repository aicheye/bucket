/**
 * Reusable Card component
 */

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
  shadow?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

export default function Card({
  children,
  className = "",
  padding = "md",
  shadow = "md",
  hover = false,
}: CardProps) {
  const paddingClasses = {
    none: "",
    sm: "p-2",
    md: "p-4",
    lg: "p-6",
  };

  const shadowClasses = {
    none: "",
    sm: "shadow-sm",
    md: "shadow-md",
    lg: "shadow-lg",
  };

  return (
    <div
      className={`card bg-base-100 ${paddingClasses[padding]} ${shadowClasses[shadow]} ${hover ? "hover:shadow-lg transition-shadow" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Card with body wrapper
 */
export function CardBody({
  children,
  className = "",
  padding = "md",
}: {
  children: ReactNode;
  className?: string;
  padding?: "sm" | "md" | "lg";
}) {
  const paddingClasses = {
    sm: "p-4",
    md: "p-4 sm:p-8",
    lg: "p-6 sm:p-12",
  };

  return (
    <div className={`card-body ${paddingClasses[padding]} ${className}`}>
      {children}
    </div>
  );
}

/**
 * Test skeleton for Card components
 *
 * @jest-environment jsdom
 */
// describe("Card", () => {
//   it("should render children", () => {
//     // TODO: Implement test
//   });
//
//   it("should apply correct padding classes", () => {
//     // TODO: Implement test
//   });
//
//   it("should apply correct shadow classes", () => {
//     // TODO: Implement test
//   });
//
//   it("should apply hover effect when enabled", () => {
//     // TODO: Implement test
//   });
// });
//
// describe("CardBody", () => {
//   it("should render with correct padding", () => {
//     // TODO: Implement test
//   });
// });

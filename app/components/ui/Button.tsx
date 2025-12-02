/**
 * Reusable Button component
 */

import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "accent" | "ghost" | "soft" | "error";
  size?: "xs" | "sm" | "md" | "lg";
  circle?: boolean;
  square?: boolean;
  loading?: boolean;
  wide?: boolean;
  block?: boolean;
}

export default function Button({
  children,
  variant,
  size = "md",
  circle = false,
  square = false,
  loading = false,
  wide = false,
  block = false,
  className = "",
  disabled = false,
  ...props
}: ButtonProps) {
  // Prefer an explicit title prop, otherwise derive a sensible default
  // when `children` is a plain string (common for simple buttons).
  const explicitTitle = (props as ButtonHTMLAttributes<HTMLButtonElement>)
    .title as string | undefined;
  const derivedTitle = typeof children === "string" ? children : undefined;
  const titleAttr = explicitTitle ?? derivedTitle;
  const variantClass = variant ? `btn-${variant}` : "";
  const sizeClass = size !== "md" ? `btn-${size}` : "";
  const shapeClass = circle ? "btn-circle" : square ? "btn-square" : "";
  const widthClass = wide ? "btn-wide" : block ? "btn-block" : "";
  const loadingClass = loading ? "loading" : "";

  return (
    <button
      className={`btn ${variantClass} ${sizeClass} ${shapeClass} ${widthClass} ${loadingClass} ${className}`}
      // Apply a title attribute for improved accessibility / hover tooltip.
      {...(titleAttr ? { title: titleAttr } : {})}
      disabled={disabled || loading}
      {...props}
    >
      {children}
    </button>
  );
}

/**
 * Test skeleton for Button
 *
 * @jest-environment jsdom
 */
// describe("Button", () => {
//   it("should render button with children", () => {
//     // TODO: Implement test
//   });
//
//   it("should apply variant classes", () => {
//     // TODO: Implement test
//   });
//
//   it("should apply size classes", () => {
//     // TODO: Implement test
//   });
//
//   it("should be disabled when loading", () => {
//     // TODO: Implement test
//   });
//
//   it("should apply circle or square shape", () => {
//     // TODO: Implement test
//   });
// });

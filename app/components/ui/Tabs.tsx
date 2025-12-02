/**
 * Tab navigation component
 */

import Link from "next/link";
import { ReactNode } from "react";

interface Tab {
  label: string;
  href: string;
  active?: boolean;
  icon?: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  boxed?: boolean;
  lifted?: boolean;
}

export default function Tabs({
  tabs,
  className = "",
  size = "md",
  boxed = false,
  lifted = false,
}: TabsProps) {
  const sizeClass = size !== "md" ? `tabs-${size}` : "";
  const boxedClass = boxed ? "tabs-boxed" : "";
  const liftedClass = lifted ? "tabs-lifted" : "";

  return (
    <div
      role="tablist"
      className={`tabs ${sizeClass} ${boxedClass} ${liftedClass} ${className}`}
    >
      {tabs.map((tab, index) => (
        <Link
          key={index}
          href={tab.href}
          role="tab"
          className={`tab ${tab.active ? "tab-active" : ""}`}
        >
          {tab.icon && <span className="mr-2">{tab.icon}</span>}
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

/**
 * Test skeleton for Tabs
 *
 * @jest-environment jsdom
 */
// describe("Tabs", () => {
//   it("should render all tabs", () => {
//     // TODO: Implement test
//   });
//
//   it("should apply active class to active tab", () => {
//     // TODO: Implement test
//   });
//
//   it("should render icons when provided", () => {
//     // TODO: Implement test
//   });
//
//   it("should apply size classes", () => {
//     // TODO: Implement test
//   });
// });

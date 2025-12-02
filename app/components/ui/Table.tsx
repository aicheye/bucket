/**
 * Reusable Table component
 */

import { ReactNode } from "react";

interface TableProps {
  children: ReactNode;
  className?: string;
  size?: "xs" | "sm" | "md" | "lg";
  zebra?: boolean;
  pinRows?: boolean;
  pinCols?: boolean;
}

export default function Table({
  children,
  className = "",
  size = "md",
  zebra = false,
  pinRows = false,
  pinCols = false,
}: TableProps) {
  const sizeClass = size === "xs" || size === "sm" ? `table-${size}` : "";

  return (
    <div className="overflow-x-auto border border-base-content/10 rounded-box">
      <table
        className={`table w-full ${sizeClass} ${zebra ? "table-zebra" : ""} ${pinRows ? "table-pin-rows" : ""} ${pinCols ? "table-pin-cols" : ""} ${className}`}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return <thead>{children}</thead>;
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TableRow({
  children,
  className = "",
  hover = false,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return <tr className={`${hover ? "hover" : ""} ${className}`}>{children}</tr>;
}

/**
 * Test skeleton for Table components
 *
 * @jest-environment jsdom
 */
// describe("Table", () => {
//   it("should render table with children", () => {
//     // TODO: Implement test
//   });
//
//   it("should apply size classes", () => {
//     // TODO: Implement test
//   });
//
//   it("should apply zebra striping", () => {
//     // TODO: Implement test
//   });
// });

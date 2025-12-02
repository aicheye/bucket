/**
 * Skeleton loading components
 */

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  circle?: boolean;
}

export default function Skeleton({
  className = "",
  width,
  height,
  circle = false,
}: SkeletonProps) {
  const widthClass = width ? `w-[${width}]` : "";
  const heightClass = height ? `h-[${height}]` : "";
  const shapeClass = circle ? "rounded-full" : "";

  return (
    <div
      className={`skeleton ${widthClass} ${heightClass} ${shapeClass} ${className}`}
    />
  );
}

/**
 * Page skeleton for loading states
 */
export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <Skeleton className="h-8 w-1/3 mb-4" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-64 w-full rounded-box" />
      ))}
    </div>
  );
}

/**
 * Card skeleton for loading states
 */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full shrink-0" />
      ))}
    </div>
  );
}

/**
 * Test skeleton for Skeleton components
 *
 * @jest-environment jsdom
 */
// describe("Skeleton", () => {
//   it("should render skeleton element", () => {
//     // TODO: Implement test
//   });
//
//   it("should apply custom dimensions", () => {
//     // TODO: Implement test
//   });
//
//   it("should render as circle when enabled", () => {
//     // TODO: Implement test
//   });
// });
//
// describe("PageSkeleton", () => {
//   it("should render correct number of rows", () => {
//     // TODO: Implement test
//   });
// });

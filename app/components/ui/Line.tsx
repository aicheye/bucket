interface LineProps {
  className?: string;
  color?: string;
  direction?: "hor" | "ver";
}

export default function Line({ className, color, direction }: LineProps) {
  const borderClass = direction === "ver" ? "border-l" : "border-t";
  const colorClass = color ?? "border-base-content/10";

  return <div className={`${borderClass} ${colorClass} ${className ?? ""}`} />;
}

"use client";

import { GRADE_CUTOFFS } from "../../../lib/constants";

const successCutoff = GRADE_CUTOFFS.A_MINUS; // 80
const warningCutoff = GRADE_CUTOFFS.C_MINUS; // 60

const bgMap: Record<string, string> = {
  success: "bg-success/70",
  warning: "bg-warning/70",
  error: "bg-error/70",
  accent: "bg-accent/70",
};

const textMap: Record<string, string> = {
  success: "text-success-content",
  warning: "text-warning-content",
  error: "text-error-content",
  accent: "text-neutral-content",
};

export default function GradeBadge({
  grade,
  gpa,
  disabled = false,
  size,
}: {
  grade?: number;
  gpa?: number;
  disabled?: boolean;
  size?: "sm" | "lg";
}) {
  let colorKey = "accent";

  if (grade !== undefined) {
    if (grade >= successCutoff) {
      colorKey = "success";
    } else if (grade >= warningCutoff) {
      colorKey = "warning";
    } else {
      colorKey = "error";
    }
  } else {
    colorKey = "accent";
  }

  let bgClass = bgMap[colorKey];
  let textClass = textMap[colorKey];

  // If this badge is displaying a GPA, always use neutral background
  // and neutral text so the GPA appearance is consistent.
  if (gpa !== undefined) {
    bgClass = "bg-neutral/70";
    textClass = "text-neutral-content";
  }

  if (disabled) {
    textClass = "text-white";
  }

  if (size === "sm") {
    return (
      <div className="flex items-center gap-2">
        <div
          className={`badge ${bgClass} text-sm font-bold ${textClass} border-none`}
        >
          {grade !== undefined
            ? grade.toFixed(1) + "%"
            : gpa !== undefined
              ? gpa.toFixed(2)
              : "-"}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`card card-xl h-full font-black tracking-tighter leading-none ${bgClass}`}
    >
      <div
        className={`flex card-body px-2 p-1 text-2xl text-center ${textClass}`}
      >
        <div>
          {gpa !== undefined ? (
            <span>{gpa.toFixed(2)}</span>
          ) : grade !== undefined ? (
            <>
              {grade.toFixed(1)}
              <span className={"text-[18px] opacity-80 ml-0.5"}>%</span>
            </>
          ) : (
            <span className="opacity-50">-</span>
          )}
        </div>
      </div>
    </div>
  );
}

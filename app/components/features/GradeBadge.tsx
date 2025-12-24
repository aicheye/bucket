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

function LegendTooltip() {
  return (
    <div className="z-[3] absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden peer-hover:block z-50 w-48 p-3 bg-base-300 text-base-content text-xs card shadow-2xl border border-base-content/5">
      <div className="text-left font-bold mb-2 border-b border-base-content/10 pb-1">
        Legend
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success"></div>
          <span>≥ {successCutoff}%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-warning"></div>
          <span>≥ {warningCutoff}%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-error"></div>
          <span>&lt; {warningCutoff}%</span>
        </div>
      </div>
    </div>
  );
}

export default function GradeBadge({
  grade,
  gpa,
  disabled = false,
  size,
  toFixed = 1,
}: {
  grade?: number;
  gpa?: number;
  disabled?: boolean;
  size?: "sm" | "lg";
  toFixed?: number;
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
    bgClass = "bg-base-content/10";
    textClass = "text-base-content opacity-70";
  }

  if (size === "sm") {
    if (!grade && !gpa) {
      return null;
    }

    return (
      <div className="flex items-center gap-2">
        <div
          className={`badge ${bgClass} text-sm font-bold ${textClass} border-none`}
        >
          {grade !== undefined
            ? grade.toFixed(toFixed) + "%"
            : gpa !== undefined
              ? gpa.toFixed(2)
              : "-"}
        </div>
      </div>
    );
  }

  if (gpa !== undefined) {
    disabled = true;
  }

  return (
    <div className="relative">
      <div
        className={`peer ${!disabled ? "cursor-help" : ""} card card-xl h-full font-black tracking-tighter leading-none ${bgClass}`}
      >
        <div
          className={`flex card-body px-2 p-1 text-2xl text-center ${textClass}`}
        >
          <div className="relative">
            {gpa !== undefined ? (
              <span>{gpa.toFixed(2)}</span>
            ) : grade !== undefined ? (
              <>
                {grade.toFixed(toFixed)}
                <span className={"text-[18px] opacity-80 ml-0.5"}>%</span>
              </>
            ) : (
              <span className="opacity-50">-</span>
            )}
          </div>
        </div>
      </div>
      {!disabled && <LegendTooltip />}
    </div>
  );
}

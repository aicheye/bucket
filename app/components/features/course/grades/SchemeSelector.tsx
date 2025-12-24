/* eslint-disable @typescript-eslint/no-explicit-any */
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getCategoryColor } from "../../../../contexts/CourseContext";
import GradeBadge from "../../GradeBadge";
import RangeBadge from "../../RangeBadge";
import ReqAvgBadge from "../../ReqAvgBadge";
import ReqOfficialBadge from "../../ReqOfficialBadge";

interface SchemeSelectorProps {
  schemes: any[][];
  bestOriginalIndex: number | null;
  activeSchemeIndex: number | null;
  setActiveSchemeIndex: (idx: number) => void;
  calculateDetails: (scheme: any[]) => {
    currentGrade: number | null;
    currentScore: number;
    totalSchemeWeight: number;
    totalWeightGraded: number;
    totalWeightCompleted?: number;
    bonusPercent?: number;
    baseCurrentGrade?: number | null;
  };
  calculateRequired: (scheme: any[]) => number | null;
  getCourseTypes: () => string[];
  onSelectPersist?: (index: number) => Promise<void> | void;
  officialGrade?: number;
  isCompleted?: boolean;
}

export default function SchemeSelector({
  schemes,
  bestOriginalIndex,
  activeSchemeIndex,
  setActiveSchemeIndex,
  calculateDetails,
  calculateRequired,
  getCourseTypes,
  onSelectPersist,
  officialGrade,
  isCompleted: courseCompleted,
}: SchemeSelectorProps) {
  const sortable = schemes
    .map((scheme, idx) => {
      const details = calculateDetails(scheme);
      const bonus = details.bonusPercent || 0;
      let required = calculateRequired(scheme);

      if (officialGrade !== undefined) {
        const remainingWeight =
          details.totalSchemeWeight - details.totalWeightGraded;

        if (remainingWeight > 0) {
          const effectiveTarget = officialGrade - 0.5 - bonus;
          required =
            (effectiveTarget * details.totalSchemeWeight -
              details.currentScore * 100) /
            remainingWeight;
        } else {
          required = null;
        }
      }

      const isFilled =
        (details.totalWeightCompleted ?? details.totalWeightGraded) >=
        details.totalSchemeWeight - 0.01;

      return {
        scheme,
        originalIndex: idx,
        details,
        required,
        isFilled,
      };
    })
    .filter(
      (item) =>
        item.details.currentGrade !== null || officialGrade !== undefined,
    )
    .sort((a, b) => {
      // 1. Filled schemes first
      if (a.isFilled && !b.isFilled) return -1;
      if (!a.isFilled && b.isFilled) return 1;

      // If both filled, sort by current grade high-low
      if (a.isFilled && b.isFilled) {
        const gradeA = a.details.currentGrade ?? -1;
        const gradeB = b.details.currentGrade ?? -1;
        return gradeB - gradeA;
      }

      // 2. Unfilled schemes: sort by required average low-high
      if (a.required !== null && b.required !== null) {
        return a.required - b.required;
      }

      if (a.required !== null && b.required === null) return -1;
      if (a.required === null && b.required !== null) return 1;

      // Both null required, sort by current grade high-low
      const gradeA = a.details.currentGrade ?? -1;
      const gradeB = b.details.currentGrade ?? -1;
      return gradeB - gradeA;
    });

  return (
    <div className="bg-base-200/40 card p-4 border border-base-content/5 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-4xl">
        {officialGrade !== undefined && (
          <div className="relative group w-full">
            <div className="h-[6rem] flex flex-row justify-between items-stretch p-4 bg-primary/5 card border border-primary/20 shadow-md w-full">
              <div className="flex flex-col justify-between h-full">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-primary">
                    OFFICIAL GRADE
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <GradeBadge grade={officialGrade} toFixed={0} />
                </div>
              </div>
            </div>
          </div>
        )}
        {sortable.map(({ scheme, originalIndex, details, required }) => {
          const isActive =
            officialGrade === undefined &&
            (activeSchemeIndex !== null
              ? originalIndex === activeSchemeIndex
              : originalIndex === bestOriginalIndex);

          const bonus = details.bonusPercent || 0;
          const minRaw = details.currentScore + bonus;
          const maxRaw =
            details.currentScore +
            bonus +
            (details.totalSchemeWeight - details.totalWeightGraded);

          const min = Math.min(100, Math.max(32, minRaw));
          const max = Math.min(100, maxRaw);

          const isCompleted = courseCompleted;

          const isDisabled = officialGrade !== undefined;

          return (
            <div key={originalIndex} className="relative group w-full">
              <button
                type="button"
                onClick={async () => {
                  if (isDisabled) return;
                  setActiveSchemeIndex(originalIndex);
                  try {
                    await onSelectPersist?.(originalIndex);
                  } catch {
                    // ignore
                  }
                }}
                disabled={isDisabled}
                aria-pressed={isActive}
                title={
                  isDisabled ? null : `Activate scheme ${originalIndex + 1}`
                }
                className={`h-[6rem] flex flex-row justify-between items-stretch p-4 bg-base-100 card border border-base-content/10 shadow-sm hover:shadow-md transition-all w-full ${isDisabled ? "cursor-default" : "cursor-pointer"} ${!isActive && !isDisabled ? "opacity-60 grayscale" : ""}`}
              >
                <div className="flex flex-col justify-between h-full">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold opacity-50">
                      Scheme {originalIndex + 1}
                    </span>
                    <FontAwesomeIcon
                      icon={faInfoCircle}
                      className="text-xs opacity-20"
                    />
                  </div>
                  <div className="flex items-baseline gap-1">
                    {isActive ? (
                      <GradeBadge grade={details.currentGrade ?? undefined} />
                    ) : (
                      <GradeBadge
                        grade={details.currentGrade ?? undefined}
                        disabled={true}
                      />
                    )}
                  </div>
                </div>
                {(!isCompleted || officialGrade !== undefined) &&
                  (required === null ? (
                    officialGrade === undefined ? (
                      <div className="flex items-end h-full self-end">
                        <RangeBadge rangeMin={min} rangeMax={max} />
                      </div>
                    ) : null
                  ) : (
                    <div className="flex flex-col items-end gap-2 min-w-[140px] text-sm self-end">
                      {officialGrade !== undefined ? (
                        <div
                          className="tooltip tooltip-bottom"
                          data-tip="Average on remaining items to achieve official grade"
                        >
                          <ReqOfficialBadge requiredAverage={required} />
                        </div>
                      ) : (
                        <ReqAvgBadge
                          requiredAverage={required}
                          average={details.currentGrade ?? 0}
                        />
                      )}
                      {officialGrade === undefined && (
                        <RangeBadge rangeMin={min} rangeMax={max} />
                      )}
                    </div>
                  ))}
              </button>

              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-[1] w-64 p-4 bg-base-300 text-base-content text-xs card shadow-2xl border border-base-content/5">
                <div className="font-bold mb-3 border-b border-base-content/10 pb-2 text-sm">
                  Scheme Breakdown
                </div>
                <div className="flex flex-col gap-2">
                  {scheme.map((s: any, i: number) => (
                    <div key={i} className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div
                          className={`badge badge-xs ${getCategoryColor(s.Component, getCourseTypes())}`}
                        ></div>
                        <span className="font-medium">{s.Component}</span>
                      </div>
                      <span className="opacity-70 font-mono">{s.Weight}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

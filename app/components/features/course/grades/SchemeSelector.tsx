/* eslint-disable @typescript-eslint/no-explicit-any */
import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getCategoryColor } from "../../../../contexts/CourseContext";
import GradeBadge from "../../GradeBadge";
import RangeBadge from "../../RangeBadge";
import ReqAvgBadge from "../../ReqAvgBadge";

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
  };
  calculateRequired: (scheme: any[]) => number | null;
  getCourseTypes: () => string[];
  onSelectPersist?: (index: number) => Promise<void> | void;
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
}: SchemeSelectorProps) {
  const sortable = schemes
    .map((scheme, idx) => ({
      scheme,
      originalIndex: idx,
      details: calculateDetails(scheme),
    }))
    .filter((item) => item.details.currentGrade !== null)
    .sort((a, b) => b.details.currentGrade! - a.details.currentGrade!);

  return (
    <div className="bg-base-200/40 card p-4 border border-base-content/5 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-4xl">
        {sortable.map(({ scheme, originalIndex, details }) => {
          const isActive =
            activeSchemeIndex !== null
              ? originalIndex === activeSchemeIndex
              : originalIndex === bestOriginalIndex;

          const min = details.currentScore;
          const max =
            details.currentScore +
            (details.totalSchemeWeight - details.totalWeightGraded);
          const required = calculateRequired(scheme);

          return (
            <div key={originalIndex} className="relative group w-full">
              <button
                type="button"
                onClick={async () => {
                  setActiveSchemeIndex(originalIndex);
                  try {
                    await onSelectPersist?.(originalIndex);
                  } catch {
                    // ignore
                  }
                }}
                aria-pressed={isActive}
                title={`Activate scheme ${originalIndex + 1}`}
                className={`h-[6rem] flex flex-row justify-between items-stretch p-4 bg-base-100 card border border-base-content/10 shadow-sm hover:shadow-md transition-all w-full cursor-pointer ${!isActive ? "opacity-60 grayscale" : ""}`}
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
                      <GradeBadge grade={details.currentGrade!} />
                    ) : (
                      <GradeBadge
                        grade={details.currentGrade!}
                        disabled={true}
                      />
                    )}
                  </div>
                </div>
                {required === null ? (
                  <div className="flex items-end h-full self-end">
                    <RangeBadge rangeMin={min} rangeMax={max} />
                  </div>
                ) : (
                  <div className="flex flex-col items-end gap-2 min-w-[140px] text-sm self-end">
                    <ReqAvgBadge
                      requiredAverage={required}
                      average={details.currentGrade!}
                    />
                    <RangeBadge rangeMin={min} rangeMax={max} />
                  </div>
                )}
              </button>

              <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-[1] w-64 p-4 bg-base-300 text-base-content text-xs card shadow-2xl border border-base-content/10">
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

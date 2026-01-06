/* eslint-disable @typescript-eslint/no-explicit-any */
import { faCheck, faInfoCircle, faPen, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useState } from "react";
import { getCategoryColor } from "../../../../contexts/CourseContext";
import Line from "../../../ui/Line";
import GradeBadge from "../../GradeBadge";
import RangeBadge from "../../RangeBadge";
import ReqAvgBadge from "../../ReqAvgBadge";
import ReqOfficialBadge from "../../ReqOfficialBadge";
import SchemeEditor from "../info/SchemeEditor";

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
  onUpdateSchemes?: (schemes: any[][]) => Promise<void> | void;
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
  onUpdateSchemes,
  isCompleted: courseCompleted,
}: SchemeSelectorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localSchemes, setLocalSchemes] = useState<any[][]>(schemes);
  const [editOfficialValue, setEditOfficialValue] = useState<string>(officialGrade?.toString() || "");

  const startEditing = () => {
    setLocalSchemes(JSON.parse(JSON.stringify(schemes)));
    setEditOfficialValue(officialGrade?.toString() || "");
    setIsEditing(true);
  };

  useEffect(() => {
    // keep localSchemes in sync with prop changes when not actively editing
    if (!isEditing) {
      setLocalSchemes(JSON.parse(JSON.stringify(schemes)));
      setEditOfficialValue(officialGrade?.toString() || "");
    }
  }, [schemes, officialGrade, isEditing]);

  const updateComponentWeight = (schemeIndex: number, componentIndex: number, value: string) => {
    setLocalSchemes((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (!copy[schemeIndex]) return prev;
      if (!copy[schemeIndex][componentIndex]) return prev;
      copy[schemeIndex][componentIndex].Weight = value;
      return copy;
    });
  };

  // Update a component name across all schemes so components remain aligned
  const updateComponentName = (componentIndex: number, newName: string) => {
    setLocalSchemes((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      return copy.map((scheme: any[]) => {
        if (!scheme[componentIndex]) return scheme;
        scheme[componentIndex] = {
          ...scheme[componentIndex],
          Component: newName,
        };
        return scheme;
      });
    });
  };

  // Add a component to every scheme so all schemes stay in sync
  const addComponent = () => {
    setLocalSchemes((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      return copy.map((scheme: any[]) => [...scheme, { Component: "New Component", Weight: "0" }]);
    });
  };

  // Create a new scheme that copies the component structure from the first scheme
  // so we don't create a new component globally when adding a scheme.
  const addSchemeLocal = () => {
    setLocalSchemes((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      const template = copy && copy.length > 0 ? copy[0] : [];
      const newScheme = template.map((c: any) => ({ Component: c.Component, Weight: "" }));
      copy.push(newScheme);
      return copy;
    });
  };

  // Remove a component at index across all schemes
  const removeComponent = (componentIndex: number) => {
    setLocalSchemes((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      return copy.map((scheme: any[]) => {
        const s = [...scheme];
        s.splice(componentIndex, 1);
        return s;
      });
    });
  };

  const removeScheme = (schemeIndex: number) => {
    setLocalSchemes((prev) => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy.splice(schemeIndex, 1);
      return copy;
    });
  };

  const saveAll = () => {
    // Close editor immediately for snappy UX, persist in background
    setIsEditing(false);
    if (onUpdateSchemes) {
      void (async () => {
        try {
          await onUpdateSchemes(localSchemes);
        } catch {
          // ignore errors here; UI already updated optimistically
        }
      })();
    }
  };

  // Note: no separate cancel; edits are kept locally until Done is pressed


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
    <div className="bg-base-200 card p-4 border border-base-content/5 flex flex-col gap-3 shadow-lg">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 b">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider">Marking Schemes</h3>
            <div className="text-xs opacity-50">Choose how grades are calculated</div>
          </div>
          {/* Official grade shown next to Goal in header; don't render here */}
        </div>
        <div>
          {!isEditing ? (
            <button
              className="btn btn-sm btn-soft"
              onClick={startEditing}
              title="Edit grading schemes"
            >
              <FontAwesomeIcon icon={faPen} /> Edit
            </button>
          ) : (
            <div className="flex gap-2">
              <button className="btn btn-sm btn-success" onClick={saveAll}>
                <FontAwesomeIcon icon={faCheck} />
                Done
              </button>
            </div>
          )}
        </div>
      </div>
      <Line />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-4xl items-start">
        {isEditing ? (
          <>
            {localSchemes.map((scheme, idx) => (
              <div key={idx} className="relative w-full">
                <SchemeEditor
                  scheme={scheme}
                  index={idx}
                  isEditing={true}
                  onUpdateWeight={(compIdx, val) => updateComponentWeight(idx, compIdx, val)}
                  onUpdateComponentName={(compIdx, name) => updateComponentName(compIdx, name)}
                  onAddComponent={addComponent}
                  onRemoveComponent={(compIdx) => removeComponent(compIdx)}
                  onRemoveScheme={() => removeScheme(idx)}
                  allComponents={getCourseTypes()}
                  canAdd={true}
                />
              </div>
            ))}
            <div className="flex flex-col gap-2 items-center justify-center border border-dashed border-base-content/20 card min-h-[200px]">
              <button
                className="btn btn-ghost"
                onClick={addSchemeLocal}
                title="Add Scheme"
              >
                <FontAwesomeIcon
                  icon={faPlus}
                  className="mr-2"
                  aria-hidden="true"
                />{" "}
                Add Scheme
              </button>
            </div>
          </>
        ) : (
          sortable.map(({ scheme, originalIndex, details, required }) => {
            const isActive =
              activeSchemeIndex !== null
                ? originalIndex === activeSchemeIndex
                : originalIndex === bestOriginalIndex;

            const bonus = details.bonusPercent || 0;
            const minRaw = details.currentScore + bonus;
            const maxRaw =
              details.currentScore +
              bonus +
              (details.totalSchemeWeight - details.totalWeightGraded);

            const min = Math.min(100, Math.max(32, minRaw));
            const max = Math.min(100, maxRaw);

            const isCompleted = courseCompleted;

            const isDisabled = false;

            return (
              <div key={originalIndex} className="relative w-full">
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
                  className={`h-[6rem] flex flex-row justify-between items-stretch p-4 bg-base-100 card border border-base-content/10 shadow-sm hover:shadow-md transition-all w-full overflow-visible ${isDisabled ? "cursor-default" : "cursor-pointer"} ${!isActive && !isDisabled ? "opacity-60 grayscale" : ""}`}
                >
                  <div className="flex flex-col justify-between h-full">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-[10px] uppercase tracking-wider font-bold opacity-50">
                        Scheme {originalIndex + 1}
                      </span>
                      <span className="relative group/tooltip leading-none">
                        <FontAwesomeIcon
                          icon={faInfoCircle}
                          className="text-xs opacity-20 hover:opacity-100 transition-opacity"
                        />
                        <div
                          className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block z-[100] w-64 p-4 bg-base-300 text-base-content text-xs card shadow-2xl border border-base-content/5 cursor-auto text-left"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="font-bold mb-3 border-b border-base-content/10 pb-2 text-sm">
                            Scheme Breakdown
                          </div>
                          <div className="flex flex-col gap-2">
                            {scheme.map((s: any, i: number) => (
                              <div
                                key={i}
                                className="flex justify-between items-center"
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`badge badge-xs ${getCategoryColor(s.Component, getCourseTypes())}`}
                                  ></div>
                                  <span className="font-medium">
                                    {s.Component}
                                  </span>
                                </div>
                                <span className="opacity-70 font-mono">
                                  {s.Weight}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      {details.currentGrade !== null ? (
                        isActive ? (
                          <GradeBadge grade={details.currentGrade} />
                        ) : (
                          <GradeBadge
                            grade={details.currentGrade}
                            disabled={true}
                          />
                        )
                      ) : (
                        <span className="text-sm italic opacity-50">
                          No Grades
                        </span>
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
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

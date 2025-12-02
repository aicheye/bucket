/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  faCopy,
  faEdit,
  faInfoCircle,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { Item } from "../../../../lib/types";
import { getCategoryColor } from "../../../contexts/CourseContext";

interface GradeTableProps {
  items: Item[];
  hasDueDates: boolean;
  usedDroppedItemIds: string[];
  componentMap: Map<string, any>;
  categoryKeptCountMap: Map<string, number>;
  getCourseTypes: () => string[];
  onEditItem: (item: Item) => void;
  onDuplicateItem: (item: Item) => void;
  onDeleteItem: (item: Item) => void;
}

export default function GradeTable({
  items,
  hasDueDates,
  usedDroppedItemIds,
  componentMap,
  categoryKeptCountMap,
  getCourseTypes,
  onEditItem,
  onDuplicateItem,
  onDeleteItem,
}: GradeTableProps) {
  return (
    <div className="overflow-x-auto border border-base-content/10 rounded-box">
      <table className="table w-full">
        <thead>
          <tr>
            <th className="whitespace-nowrap min-w-fit text-right">Grade</th>
            <th className="whitespace-nowrap min-w-fit text-right">
              Contribution
            </th>
            <th className="whitespace-nowrap min-w-fit w-full">Name</th>
            <th className="whitespace-nowrap w-fit">Type</th>
            {hasDueDates && (
              <th className="whitespace-nowrap min-w-fit">Due Date</th>
            )}
            <th className="whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={hasDueDates ? 6 : 5}
                className="text-center text-base-content/50 py-8"
              >
                No grades found. Add one to get started!
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const isDropped = usedDroppedItemIds.includes(item.id);
              const isNoGrade = !item.data.grade && !item.data.isPlaceholder;
              const isGreyedOut = isDropped || isNoGrade;

              let reason = "";
              if (isDropped) reason = "Dropped: Lowest grade in category";
              else if (isNoGrade) reason = "Not included: Not yet graded";

              return (
                <tr
                  key={item.id}
                  className={`${item.data.isPlaceholder ? "bg-base-200/30 italic opacity-70" : ""} ${isGreyedOut ? "bg-base-300 opacity-50" : ""}`}
                >
                  <td>
                    {item.data.grade ? (
                      <div className="flex flex-col w-full items-end">
                        {item.data.max_grade &&
                          !isNaN(parseFloat(item.data.grade)) &&
                          !isNaN(parseFloat(item.data.max_grade)) &&
                          parseFloat(item.data.max_grade) !== 0 && (
                            <span
                              className={`font-bold font-mono ${isDropped ? "line-through" : ""}`}
                            >
                              {(
                                (parseFloat(item.data.grade) /
                                  parseFloat(item.data.max_grade)) *
                                100
                              ).toFixed(2)}
                              %
                            </span>
                          )}
                        <span
                          className={`text-xs opacity-50 ${isDropped ? "line-through decoration-base-content/50" : ""}`}
                        >
                          {item.data.grade}
                          {item.data.max_grade ? (
                            <span className="text-base-content/50">
                              {" "}
                              / {item.data.max_grade}
                            </span>
                          ) : (
                            ""
                          )}
                        </span>
                      </div>
                    ) : (
                      <span className="text-base-content/30 justify-end flex w-full gap-1">
                        -
                        {item.data.max_grade ? (
                          <span className="text-base-content/50">
                            {" "}
                            / {item.data.max_grade}
                          </span>
                        ) : (
                          ""
                        )}
                      </span>
                    )}
                  </td>
                  <td>
                    {(() => {
                      const comp = componentMap.get(item.data.type);
                      const keptCount = categoryKeptCountMap.get(
                        item.data.type,
                      );
                      const gradeRaw = parseFloat(item.data.grade || "0");
                      const maxRaw = parseFloat(item.data.max_grade || "0");

                      if (!comp) {
                        return (
                          <span className="text-base-content/30 justify-end flex w-full">
                            -
                          </span>
                        );
                      }

                      const compWeight = parseFloat(comp.Weight) || 0;
                      const totalContribution = compWeight / keptCount!;
                      const earnedContribution =
                        item.data.grade === "" ||
                        isNaN(gradeRaw) ||
                        isNaN(maxRaw) ||
                        maxRaw === 0
                          ? NaN
                          : (gradeRaw / maxRaw) * totalContribution;

                      if (isNaN(earnedContribution)) {
                        return (
                          <div className="flex w-full items-end justify-end">
                            <span className="text-base-content/50">
                              / {totalContribution.toFixed(2)}%
                            </span>
                          </div>
                        );
                      }

                      const percentLost =
                        totalContribution - earnedContribution;

                      return (
                        <div className="flex flex-col w-full items-end min-w-fit">
                          {isDropped ? (
                            <span className="font-mono font-bold">-</span>
                          ) : percentLost > 0 ? (
                            <span
                              className={`font-mono font-bold ${isDropped ? " line-through" : ""}`}
                            >
                              -{percentLost.toFixed(2)}%
                            </span>
                          ) : (
                            <span
                              className={`font-mono opacity-50 ${isDropped ? " line-through" : ""}`}
                            >
                              {earnedContribution.toFixed(2)}%
                            </span>
                          )}
                          <span
                            className={`font-mono text-xs opacity-50 ${isDropped ? "line-through decoration-base-content/50" : ""}`}
                          >
                            / {totalContribution.toFixed(2)}%
                          </span>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="font-medium whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={
                          isDropped
                            ? "line-through decoration-base-content/50"
                            : ""
                        }
                      >
                        {item.data.name}
                      </span>
                      {isGreyedOut && (
                        <div
                          className="tooltip tooltip-right z-[1]"
                          data-tip={reason}
                        >
                          <FontAwesomeIcon
                            icon={faInfoCircle}
                            className="text-xs opacity-50 hover:opacity-100 cursor-help"
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <div
                      className={`badge ${getCategoryColor(item.data.type, getCourseTypes())} text-white border-none max-w-[120px] truncate block lg:max-w-none lg:whitespace-nowrap lg:h-auto ${isDropped ? "opacity-50" : ""}`}
                    >
                      {item.data.type}
                    </div>
                  </td>
                  {hasDueDates && (
                    <td>
                      {item.data.due_date
                        ? new Date(
                            item.data.due_date + "T00:00:00",
                          ).toLocaleDateString()
                        : "-"}
                    </td>
                  )}
                  <td>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-ghost btn-xs"
                        onClick={() => onEditItem(item)}
                        title="Edit"
                        aria-label="Edit item"
                      >
                        <FontAwesomeIcon icon={faEdit} aria-hidden="true" />
                      </button>
                      <button
                        className={`btn btn-ghost btn-xs ${item.data.isPlaceholder ? "invisible" : ""}`}
                        onClick={() =>
                          !item.data.isPlaceholder && onDuplicateItem(item)
                        }
                        title="Duplicate"
                        aria-label="Duplicate item"
                      >
                        <FontAwesomeIcon icon={faCopy} aria-hidden="true" />
                      </button>
                      <button
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => onDeleteItem(item)}
                        title="Delete"
                        aria-label="Delete item"
                      >
                        <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

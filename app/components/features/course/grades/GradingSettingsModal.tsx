/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Item } from "../../../../../lib/types";
import { getCategoryColor } from "../../../../contexts/CourseContext";
import Modal from "../../../ui/Modal";

interface GradingSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  dropLowest: Record<string, number>;
  setDropLowest: (drops: Record<string, number>) => void;
  placeholderGrades: Record<string, number>;
  setPlaceholderGrades: (grades: Record<string, number>) => void;
  getCourseTypes: () => string[];
  courseItems: Item[];
}

export default function GradingSettingsModal({
  isOpen,
  onClose,
  onSave,
  dropLowest,
  setDropLowest,
  placeholderGrades,
  setPlaceholderGrades,
  getCourseTypes,
  courseItems,
}: GradingSettingsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Grading Settings"
      onConfirm={onSave}
      actions={
        <>
          <button className="btn" onClick={onClose} title="Cancel">
            Cancel
          </button>
          <button className="btn btn-primary" onClick={onSave} title="Save">
            Save
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm opacity-70">
          Configure grading rules for each category.
        </p>
        <div className="overflow-x-auto">
          <table className="table table-sm w-full">
            <thead>
              <tr>
                <th>Category</th>
                <th className="text-center w-32">Drop Lowest</th>
                <th className="text-center w-32">Placeholder %</th>
              </tr>
            </thead>
            <tbody>
              {getCourseTypes().map((t: any) => {
                const hasGrades = courseItems.some(
                  (i) => i.data.type === t && i.data.grade,
                );
                return (
                  <tr key={t}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className={`badge badge-xs ${getCategoryColor(t, getCourseTypes())}`}
                        ></div>
                        <span className="font-medium">{t}</span>
                      </div>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        className="input input-bordered input-sm w-full text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={dropLowest[t] ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "") {
                            const newDrops = { ...dropLowest };
                            delete newDrops[t];
                            setDropLowest(newDrops);
                          } else {
                            const parsed = parseInt(val);
                            if (!isNaN(parsed)) {
                              setDropLowest({ ...dropLowest, [t]: parsed });
                            }
                          }
                        }}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="input input-bordered input-sm w-full text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        value={placeholderGrades[t] ?? ""}
                        placeholder={hasGrades ? "Grades exist" : "-"}
                        disabled={hasGrades}
                        title={
                          hasGrades
                            ? "Cannot add placeholder when grades exist"
                            : ""
                        }
                        onChange={(e) => {
                          const val =
                            e.target.value === ""
                              ? undefined
                              : parseFloat(e.target.value);
                          const newPlaceholders = { ...placeholderGrades };
                          if (val === undefined) delete newPlaceholders[t];
                          else newPlaceholders[t] = val;
                          setPlaceholderGrades(newPlaceholders);
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  );
}

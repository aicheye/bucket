/* eslint-disable @typescript-eslint/no-explicit-any */
import { sendTelemetry } from "../../../../../lib/telemetry";
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
  bonusPercent?: number;
  setBonusPercent: (b?: number) => void;
  officialGrade?: number;
  setOfficialGrade: (g?: number) => void;
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
  bonusPercent,
  setBonusPercent,
  officialGrade,
  setOfficialGrade,
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
        <div className="flex items-center gap-4 bg-base-200 p-4 py-2 rounded-md border border-base-content/10">
          <div className="flex flex-col flex-1">
            <label className="text-sm opacity-80 uppercase font-bold ">
              Bonus
            </label>
            <span className="text-xs opacity-50">
              Add a flat bonus to displayed grades
            </span>
          </div>
          <div className="input-group flex items-center">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              className="input input-sm input-bordered w-20 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={bonusPercent ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  setBonusPercent(undefined);
                } else {
                  const parsed = parseFloat(v);
                  if (!isNaN(parsed)) setBonusPercent(parsed);
                }
                sendTelemetry("set_bonus", {
                  bonusPercent: v,
                });
              }}
              title="Add a flat bonus percentage to the displayed scheme grades"
            />
            <span className="px-2">%</span>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-base-200 p-4 py-2 rounded-md border border-base-content/10">
          <div className="flex flex-col">
            <label className="text-sm opacity-80 uppercase font-bold ">
              Official / Final Grade
            </label>
            <span className="text-xs opacity-50">
              Overrides all calculations
            </span>
          </div>
          <div className="input-group flex items-center ml-auto">
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              className="input input-sm input-bordered w-20 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              value={officialGrade ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "") {
                  setOfficialGrade(undefined);
                } else {
                  const parsed = parseFloat(v);
                  if (!isNaN(parsed)) setOfficialGrade(parsed);
                }
                sendTelemetry("set_official_grade", {
                  officialGrade: v,
                });
              }}
              title="Set the official final grade for this course"
              placeholder="-"
            />
            <span className="px-2">%</span>
          </div>
        </div>
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

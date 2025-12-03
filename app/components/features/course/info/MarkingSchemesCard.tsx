/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  faCheck,
  faEdit,
  faPlus,
  faRotateRight,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getCategoryColor } from "../../../../contexts/CourseContext";

interface MarkingSchemesCardProps {
  markingSchemes?: any[][];
  isEditing: boolean;
  onToggleEdit: () => void;
  tempMarkingSchemes: any[][];
  onUpdateWeight: (
    schemeIndex: number,
    componentIndex: number,
    value: string,
  ) => void;
  onUpdateComponentName: (componentIndex: number, newName: string) => void;
  onAddComponent: () => void;
  onRemoveComponent: (index: number) => void;
  onAddScheme: () => void;
  onRemoveScheme: (index: number) => void;
  onResetToDefault: () => void;
  allComponents: string[];
}

export default function MarkingSchemesCard({
  markingSchemes,
  isEditing,
  onToggleEdit,
  tempMarkingSchemes,
  onUpdateWeight,
  onUpdateComponentName,
  onAddComponent,
  onRemoveComponent,
  onAddScheme,
  onRemoveScheme,
  onResetToDefault,
  allComponents,
}: MarkingSchemesCardProps) {
  if (!markingSchemes && !isEditing) return null;

  const displayedSchemes = isEditing
    ? tempMarkingSchemes
    : markingSchemes || [];

  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body p-4 sm:p-8">
        <div className="flex justify-between items-center mb-2">
          <h2 className="card-title text-2xl">Marking Schemes</h2>
          <button
            className={
              "btn btn-sm btn-soft" + (isEditing ? " btn-success" : "")
            }
            onClick={onToggleEdit}
            title={isEditing ? "Done" : "Edit Schemes"}
          >
            {isEditing ? (
              <>
                Done{" "}
                <FontAwesomeIcon
                  icon={faCheck}
                  className="w-4 h-4"
                  aria-hidden="true"
                />
              </>
            ) : (
              <>
                <FontAwesomeIcon
                  icon={faEdit}
                  className="w-4 h-4"
                  aria-hidden="true"
                />{" "}
                Edit Schemes
              </>
            )}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {displayedSchemes.map((scheme: any[], i: number) => (
            <div key={i} className="relative group">
              {isEditing && i > 0 && (
                <button
                  className="btn btn-xs btn-circle btn-error border-base-content/20 absolute -top-2 -right-2 z-10 shadow-md"
                  onClick={() => onRemoveScheme(i)}
                  title="Remove scheme"
                >
                  ✕
                </button>
              )}
              {isEditing && i === 0 && (
                <button
                  className="btn btn-xs btn-circle btn-ghost border-base-content/20 absolute -top-2 -right-2 z-10 shadow-md bg-base-100"
                  onClick={onResetToDefault}
                  title="Reset to default"
                >
                  <FontAwesomeIcon
                    icon={faRotateRight}
                    className="w-3 h-3 text-base-content/50"
                  />
                </button>
              )}
              <div className="overflow-x-auto border border-base-content/10 rounded-box">
                <table className="table table-md w-full">
                  <thead>
                    <tr>
                      <th>Component</th>
                      <th className="text-right">Weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheme.map((item: any, j: number) => (
                      <tr key={j}>
                        <td>
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <button
                                className="btn btn-sm btn-circle btn-soft text-error flex items-center justify-center mr-2"
                                onClick={() => onRemoveComponent(j)}
                                title="Remove Component"
                              >
                                <FontAwesomeIcon
                                  icon={faTrash}
                                  className="w-3 h-3"
                                />
                              </button>
                              <input
                                className="input input-sm text-sm input-bordered w-full"
                                value={item.Component}
                                onChange={(e) =>
                                  onUpdateComponentName(j, e.target.value)
                                }
                              />
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div
                                className={`badge badge-xs 
                                  ${getCategoryColor(item.Component, allComponents)}`}
                              ></div>
                              {item.Component}
                            </div>
                          )}
                        </td>
                        <td className="text-right">
                          {isEditing ? (
                            <div className="flex justify-end items-center gap-1">
                              <input
                                className="input input-sm text-sm input-bordered w-24 text-right"
                                value={item.Weight}
                                onChange={(e) =>
                                  onUpdateWeight(i, j, e.target.value)
                                }
                              />
                              <span className="w-4">
                                {!isNaN(Number(item.Weight)) &&
                                item.Weight !== ""
                                  ? "%"
                                  : ""}
                              </span>
                            </div>
                          ) : !isNaN(Number(item.Weight)) &&
                            item.Weight !== "" ? (
                            `${item.Weight}%`
                          ) : (
                            item.Weight
                          )}
                        </td>
                      </tr>
                    ))}
                    {isEditing && (
                      <tr
                        className="hover:bg-base-200 cursor-pointer border-t border-dashed border-base-content/20"
                        onClick={onAddComponent}
                      >
                        <td
                          colSpan={2}
                          className="text-center text-base-content/50 py-2"
                        >
                          <FontAwesomeIcon
                            icon={faPlus}
                            className="mr-2"
                            aria-hidden="true"
                          />{" "}
                          Add Component
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-base-200">
                      <td className="font-bold">Total</td>
                      <td className="text-right font-bold">
                        {scheme.reduce((acc, item) => {
                          const weight = Number(item.Weight);
                          return !isNaN(weight) && item.Weight !== ""
                            ? acc + weight
                            : acc;
                        }, 0)}
                        %
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
          {isEditing && (
            <div className="flex flex-col gap-2 items-center justify-center border border-dashed border-base-content/20 card min-h-[200px]">
              <button
                className="btn btn-ghost"
                onClick={onAddScheme}
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
          )}
        </div>
      </div>
    </div>
  );
}

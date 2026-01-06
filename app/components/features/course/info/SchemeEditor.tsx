/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  faPlus,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getCategoryColor } from "../../../../contexts/CourseContext";

interface SchemeEditorProps {
  scheme: any[];
  index: number;
  isEditing: boolean;
  onUpdateWeight: (componentIndex: number, value: string) => void;
  onUpdateComponentName: (componentIndex: number, newName: string) => void;
  onAddComponent: () => void;
  onRemoveComponent: (componentIndex: number) => void;
  onRemoveScheme?: () => void;
  allComponents: string[];
  canAdd?: boolean;
}

export default function SchemeEditor({
  scheme,
  index,
  isEditing,
  onUpdateWeight,
  onUpdateComponentName,
  onAddComponent,
  onRemoveComponent,
  onRemoveScheme,
  allComponents,
  canAdd = true,
}: SchemeEditorProps) {
  return (
    <div className="relative group">
      {isEditing && onRemoveScheme && (
        <button
          className="btn btn-xs btn-circle btn-error border-base-content/20 absolute -top-2 -right-2 z-10 shadow-md"
          onClick={onRemoveScheme}
          title="Remove scheme"
        >
          ✕
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
                          onUpdateWeight(j, e.target.value)
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
            {isEditing && canAdd && (
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
  );
}

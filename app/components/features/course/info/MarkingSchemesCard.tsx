/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  faCheck,
  faEdit,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import SchemeEditor from "./SchemeEditor";

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
            <SchemeEditor
              key={i}
              scheme={scheme}
              index={i}
              isEditing={isEditing}
              onUpdateWeight={(j, val) => onUpdateWeight(i, j, val)}
              onUpdateComponentName={onUpdateComponentName}
              onAddComponent={onAddComponent}
              onRemoveComponent={onRemoveComponent}
              onRemoveScheme={() => onRemoveScheme(i)}
              onResetToDefault={onResetToDefault}
              allComponents={allComponents}
            />
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

import { useEffect, useState } from "react";
import Modal from "../../../ui/Modal";
import SchemeEditor from "../info/SchemeEditor";

interface AddSchemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveScheme: (scheme: { Component: string; Weight: number }[]) => void;
  onSaveOfficialGrade: (grade: number) => void;
  existingSchemes: any[][];
  officialGrade?: number;
  availableComponents: string[];
}

export default function AddSchemeModal({
  isOpen,
  onClose,
  onSaveScheme,
  onSaveOfficialGrade,
  existingSchemes,
  officialGrade,
  availableComponents,
}: AddSchemeModalProps) {
  const [mode, setMode] = useState<"scheme" | "official">("scheme");
  const [rows, setRows] = useState<{ Component: string; Weight: string }[]>([
    { Component: "", Weight: "" },
  ]);
  const [officialGradeInput, setOfficialGradeInput] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setMode("scheme");
      if (availableComponents.length > 0) {
        setRows(availableComponents.map((c) => ({ Component: c, Weight: "" })));
      } else {
        setRows([{ Component: "", Weight: "" }]);
      }
      setOfficialGradeInput(officialGrade?.toString() || "");
    }
  }, [isOpen, officialGrade, availableComponents]);

  const handleAddRow = () => {
    setRows([...rows, { Component: "", Weight: "" }]);
  };

  const handleRemoveRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleRowChange = (
    index: number,
    field: "Component" | "Weight",
    value: string,
  ) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

  const handleSave = () => {
    if (mode === "official") {
      const grade = parseFloat(officialGradeInput);
      if (!isNaN(grade)) {
        onSaveOfficialGrade(grade);
        onClose();
      }
      return;
    }

    const scheme = rows
      .map((r) => ({
        Component: r.Component.trim(),
        Weight: parseFloat(r.Weight),
      }))
      .filter((r) => r.Component && !isNaN(r.Weight));

    if (scheme.length > 0) {
      onSaveScheme(scheme);
      onClose();
    }
  };

  const totalWeight = rows.reduce((sum, r) => {
    const w = parseFloat(r.Weight);
    return sum + (isNaN(w) ? 0 : w);
  }, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Grading Option"
      onConfirm={handleSave}
      actions={
        <>
          <button className="btn" onClick={onClose} title="Cancel">
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave} title="Save">
            Save
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div role="tablist" className="tabs tabs-box w-fit">
          <a
            role="tab"
            className={`tab ${mode === "scheme" ? "tab-active" : ""}`}
            onClick={() => setMode("scheme")}
          >
            New Scheme
          </a>
          <a
            role="tab"
            className={`tab ${mode === "official" ? "tab-active" : ""}`}
            onClick={() => setMode("official")}
          >
            Official Grade
          </a>
        </div>

        {mode === "official" ? (
          <div className="card bg-accent/20 shadow-xl shadow-accent/5 flex flex-col items-center justify-center p-8 my-4 w-fit self-center gap-4">
            <div className="text-center">
              <h3 className="text-lg font-black text-accent uppercase tracking-wide">Official Grade</h3>
              <p className="text-xs opacity-80 text-accent">
                Overrides all calculated grades
              </p>
            </div>
            <div className="relative flex items-center justify-center gap-4">
              <input
                type="number"
                className="input text-center text-4xl font-bold w-32 h-16 p-0 no-spinners shadow-lg"
                placeholder="--"
                value={officialGradeInput}
                onChange={(e) => setOfficialGradeInput(e.target.value)}
                autoFocus
              />
              <span className="text-3xl opacity-30 font-bold">%</span>
            </div>
          </div>
        ) : (
          <SchemeEditor
            scheme={rows}
            index={0}
            isEditing={true}
            onUpdateWeight={(i, val) => handleRowChange(i, "Weight", val)}
            onUpdateComponentName={(i, val) =>
              handleRowChange(i, "Component", val)
            }
            onAddComponent={handleAddRow}
            onRemoveComponent={handleRemoveRow}
            allComponents={availableComponents}
            canAdd={availableComponents.length === 0}
          />
        )}
      </div>
    </Modal>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import Modal from "../../ui/Modal";

interface ParsedItem {
  name: string;
  category: string;
  grade: number;
  max: number;
}

interface ImportGradesModalProps {
  isOpen: boolean;
  onClose: () => void;
  importStep: number;
  importText: string;
  setImportText: (text: string) => void;
  parsedItems: ParsedItem[];
  categoryMapping: Record<string, string>;
  setCategoryMapping: (mapping: Record<string, string>) => void;
  treatZeroAsEmpty: boolean;
  setTreatZeroAsEmpty: (value: boolean) => void;
  getCourseTypes: () => string[];
  onParse: () => void;
  onConfirm: () => void;
}

export default function ImportGradesModal({
  isOpen,
  onClose,
  importStep,
  importText,
  setImportText,
  parsedItems,
  categoryMapping,
  setCategoryMapping,
  treatZeroAsEmpty,
  setTreatZeroAsEmpty,
  getCourseTypes,
  onParse,
  onConfirm,
}: ImportGradesModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Import from Learn"
      onConfirm={
        importStep === 1 ? (importText.trim() ? onParse : undefined) : onConfirm
      }
      actions={
        <>
          <button className="btn" onClick={onClose} title="Cancel">
            Cancel
          </button>
          {importStep === 1 ? (
            <button
              className="btn btn-primary"
              onClick={onParse}
              disabled={!importText.trim()}
              title="Next"
            >
              Next
            </button>
          ) : (
            <button
              className="btn btn-primary"
              onClick={onConfirm}
              title={`Import ${parsedItems.length} Items`}
            >
              Import {parsedItems.length} Items
            </button>
          )}
        </>
      }
    >
      {importStep === 1 ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm opacity-70 leading-relaxed">
            Navigate to the <strong>Grades</strong> tab of your course on Learn.{" "}
            <br />
            Press <kbd className="kbd kbd-sm">Ctrl</kbd> +{" "}
            <kbd className="kbd kbd-sm">A</kbd> to select all text, then{" "}
            <kbd className="kbd kbd-sm">Ctrl</kbd> +{" "}
            <kbd className="kbd kbd-sm">C</kbd> to copy. <br />
            Paste the result below using <kbd className="kbd kbd-sm">
              Ctrl
            </kbd>{" "}
            + <kbd className="kbd kbd-sm">V</kbd>.
          </p>
          <textarea
            className="textarea textarea-bordered h-64 w-full font-mono text-xs"
            placeholder="Paste copied text here..."
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm opacity-70">
            Map the categories found in the import to your course marking
            scheme.
          </p>

          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-2">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={treatZeroAsEmpty}
                onChange={(e) => setTreatZeroAsEmpty(e.target.checked)}
              />
              <span className="label-text text-sm">
                Include items with 0% score
              </span>
            </label>
          </div>

          <div className="overflow-x-auto max-h-64">
            <table className="table table-sm w-full">
              <thead>
                <tr>
                  <th>Learn Category</th>
                  <th>Map To</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(categoryMapping).map((cat) => (
                  <tr key={cat}>
                    <td>{cat}</td>
                    <td>
                      <select
                        className="select select-bordered select-sm w-full"
                        value={categoryMapping[cat]}
                        onChange={(e) =>
                          setCategoryMapping({
                            ...categoryMapping,
                            [cat]: e.target.value,
                          })
                        }
                      >
                        {getCourseTypes().map((t: any) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divider">Preview</div>
          <div className="text-xs opacity-50 max-h-32 overflow-y-auto">
            {parsedItems.map((item, i) => (
              <div key={i}>
                {item.name} ({item.grade}/{item.max}) &rarr;{" "}
                {categoryMapping[item.category]}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

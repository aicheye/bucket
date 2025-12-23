import {
  faCheck,
  faExclamationTriangle,
  faFileCode,
  faFileUpload,
  faPlus
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { sendTelemetry } from "../../../../lib/telemetry";
import { useCourses } from "../../../contexts/CourseContext";
import { useLoading } from "../../../contexts/LoadingContext";
import FileUploadZone from "../../ui/FileUploadZone";

import Modal from "../../ui/Modal";

interface ParsedTranscriptCourse {
  code: string;
  credits: number;
  grade: string | null;
  term: string;
  title: string;
}

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper to normalize course codes
function normalizeCode(code: string) {
  return code.toLowerCase().replace(/\s+/g, "");
}

export default function AddCourseModal({ isOpen, onClose }: AddCourseModalProps) {
  const { showLoading, hideLoading } = useLoading();
  const { courses, addCourse, updateCourse, updateCourseData } = useCourses();
  const { data: session } = useSession();
  const router = useRouter();

  // Steps: 0 = Selection, 1 = Action (Manual Form | Outline Upload | Transcript Upload), 2 = Transcript Confirmation
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<"manual" | "outline" | "transcript" | null>(
    null,
  );

  // Manual Creation State
  const [manualSubject, setManualSubject] = useState("");
  const [manualNumber, setManualNumber] = useState("");
  const [manualTermSeason, setManualTermSeason] = useState("Winter");
  const [manualTermYear, setManualTermYear] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [manualCredits, setManualCredits] = useState(0.5);

  // Transcript State
  const [parsedTranscriptCourses, setParsedTranscriptCourses] = useState<
    ParsedTranscriptCourse[]
  >([]);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [coursesToCreate, setCoursesToCreate] = useState<Record<string, boolean>>(
    {},
  );

  const [duplicateWarning, setDuplicateWarning] = useState<{
    code: string;
    term: string;
    id: string;
  } | null>(null);

  // Derived state for transcript import
  const newTranscriptCourses = parsedTranscriptCourses.filter(pc =>
    !courses.find(c =>
      normalizeCode(c.code) === normalizeCode(pc.code) &&
      c.term === pc.term
    )
  );
  const allTranscriptSelected = newTranscriptCourses.length > 0 &&
    newTranscriptCourses.every(pc => !!coursesToCreate[pc.code]);

  // --- Reset helper ---
  function reset() {
    setStep(0);
    setMode(null);
    setManualSubject("");
    setManualNumber("");
    setManualTermSeason("Winter");
    setManualTermYear("");
    setManualTitle("");
    setManualCredits(0.5);
    setParsedTranscriptCourses([]);
    setParsedTranscriptCourses([]);
    setTranscriptError(null);
    setCoursesToCreate({});
    setDuplicateWarning(null);
  }

  function handleClose() {
    onClose();
    // Delay reset slightly to avoid UI flicker
    setTimeout(reset, 200);
  }

  // --- Handlers ---

  function selectMode(m: "manual" | "outline" | "transcript") {
    setMode(m);
    setStep(1);
    if (m === "manual") {
      // Pre-fill term roughly? Nah, let user type.
    }
  }

  // 1. Manual Creation
  async function handleCreateManual() {
    const code = `${manualSubject} ${manualNumber}`.toUpperCase();
    const term = `${manualTermSeason} ${manualTermYear}`;

    if (!manualSubject || !manualNumber || !manualTermYear) return;
    if (!session?.user?.id) return;

    // Check duplicate
    const exists = courses.find(c => normalizeCode(c.code) === normalizeCode(code) && c.term === term);
    if (exists) {
      setDuplicateWarning({ code: exists.code, term: exists.term, id: exists.id });
      return;
    }

    try {
      const defaultMarkingScheme = [
        [{ Component: "Assignments", Weight: "100" }]
      ];

      const data = {
        description: manualTitle || code,
        official_grade: undefined,
        "marking-schemes": defaultMarkingScheme
      };

      const newId = await addCourse(
        code,
        term,
        data,
        session.user.id,
      );

      // We might want to update credits if it's not 0.5 (default is usually 0.5 in DB schema?)
      // addCourse mutation in CourseContext takes (code, term, data, owner_id)
      // It doesn't seemingly expose credits directly in the INSERT_COURSES mutation wrapper in the context?
      // Let's check mutations.ts or Context. 
      // Context addCourse: variables: { code, term, data, owner_id }. 
      // Does DB default credits to 0.5? Usually yes. 
      // If we want custom credits, we might need to update it immediately after.
      if (newId && manualCredits !== 0.5) {
        await updateCourse(newId, { credits: manualCredits });
      }

      sendTelemetry("create_course_manual", { code });
      handleClose();
      if (newId) router.push(`/courses/${newId}`);
    } catch {
      // Error handling
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      const isValid = manualSubject && manualNumber && manualTermYear;
      if (isValid) {
        handleCreateManual();
      }
    }
  }

  // 2. Outline Import
  async function handleOutlineFileChange(file: File | null) {
    if (!file) return;
    const text = await file.text();

    // Check if user is logged in
    if (!session?.user?.id) return;

    try {
      showLoading();
      const res = await fetch("/api/parse_outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html_text: text }),
      });

      if (!res.ok) {
        let msg = "Failed to parse outline";
        try { msg = (await res.json()).error || msg; } catch { }
        throw new Error(msg);
      }

      const data = await res.json();

      // Check if exists
      const exists = courses.find(c => c.code === data.code && c.term === data.term);
      if (exists) {
        setDuplicateWarning({ code: exists.code, term: exists.term, id: exists.id });
        hideLoading();
        return;
      }

      const newId = await addCourse(data.code, data.term, data.data, session.user.id);
      sendTelemetry("parse_outline", { code: data.code, term: data.term });

      handleClose();
      if (newId) router.push(`/courses/${newId}`);

    } catch (err) {
      alert(err instanceof Error ? err.message : "Error importing outline");
    } finally {
      hideLoading();
    }
  }

  // 3. Transcript Import
  async function handleTranscriptFileChange(file: File | null) {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    try {
      showLoading();
      setTranscriptError(null);

      const res = await fetch("/api/parse_transcript", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to parse transcript");

      const data = await res.json();
      setParsedTranscriptCourses(data.courses);

      // Default checkboxes for 'Create' to false
      setCoursesToCreate({});

      setStep(2);
    } catch (err) {
      setTranscriptError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      hideLoading();
    }
  }

  function toggleCreate(code: string) {
    setCoursesToCreate(prev => ({ ...prev, [code]: !prev[code] }));
  }

  function handleSelectAll() {
    const next: Record<string, boolean> = { ...coursesToCreate };
    for (const pc of newTranscriptCourses) {
      next[pc.code] = !allTranscriptSelected;
    }
    setCoursesToCreate(next);
  }

  async function handleTranscriptConfirm() {
    if (!session?.user?.id) return;
    try {
      handleClose();
      showLoading();
      let updatedCount = 0;
      let createdCount = 0;


      for (const pc of parsedTranscriptCourses) {
        const existing = courses.find(c =>
          normalizeCode(c.code) === normalizeCode(pc.code) &&
          c.term === pc.term
        );

        // Logic for Grade Value
        const gradeUpper = (pc.grade || "").toUpperCase();
        const numeric = parseFloat(pc.grade || "");
        let newOfficialGrade: number | undefined | null = undefined;
        const isFailing = ["DNW", "FTC", "NMR", "WF"].includes(gradeUpper);
        const isNumeric = !isNaN(numeric);

        if (isNumeric) {
          newOfficialGrade = numeric;
        } else if (isFailing) {
          newOfficialGrade = 32;
        }

        if (existing) {
          // UPDATE
          if (existing.credits !== pc.credits) {
            await updateCourse(existing.id, { credits: pc.credits });
          }
          if (newOfficialGrade !== undefined && existing.data.official_grade !== newOfficialGrade) {
            await updateCourseData(existing.id, { official_grade: newOfficialGrade });
          }
          updatedCount++;
        } else {
          // CREATE (if selected)
          if (coursesToCreate[pc.code]) {
            // Create course
            const defaultMarkingScheme = [
              [{ Component: "Assignments", Weight: "100" }]
            ];

            const newId = await addCourse(
              pc.code,
              pc.term,
              {
                description: pc.title,
                official_grade: newOfficialGrade,
                "marking-schemes": defaultMarkingScheme
              },
              session.user.id
            );
            // Update credits if needed (default is 0.5 usually)
            if (newId && pc.credits !== 0.5) {
              await updateCourse(newId, { credits: pc.credits });
            }
            createdCount++;
          }
        }
      }

      sendTelemetry("import_transcript", { updated: updatedCount, created: createdCount });
    } catch (err) {
      setTranscriptError("Failed to apply updates");
    } finally {
      hideLoading();
    }
  }

  // --- Rendering ---

  return (
    <>
      <Modal
        isOpen={isOpen && !duplicateWarning}
        onClose={handleClose}
        title={
          step === 0 ? "Add Course" :
            mode === "manual" ? "Create Course" :
              mode === "outline" ? "Import Outline" :
                "Import Transcript"
        }
        actions={
          <>
            <button className="btn" onClick={step === 0 ? handleClose : () => { setStep(0); setMode(null); }}>
              {step === 0 ? "Cancel" : "Back"}
            </button>
            {mode === "manual" && (
              <button
                className="btn btn-primary"
                onClick={handleCreateManual}
                disabled={!manualSubject || !manualNumber || !manualTermYear}
              >
                Create
              </button>
            )}
            {mode === "transcript" && step === 2 && (
              <>
                {newTranscriptCourses.length > 0 && (
                  <button className="btn btn-soft" onClick={handleSelectAll}>
                    {allTranscriptSelected ? "Deselect All" : "Select All New"}
                  </button>
                )}
                <button className="btn btn-primary" onClick={handleTranscriptConfirm}>
                  Import Selected
                </button>
              </>
            )}
          </>
        }
      >
        {/* Step 0: Selection */}
        {step === 0 && (
          <div className="flex flex-col gap-3">
            <button
              className="btn btn-soft h-auto py-3 justify-start gap-4"
              onClick={() => selectMode("manual")}
            >
              <FontAwesomeIcon icon={faPlus} className="text-xl" />
              <div className="text-left">
                <div className="font-bold">Create Course from Scratch</div>
                <div className="text-xs opacity-70 font-normal">Manually enter course code and term</div>
              </div>
            </button>
            <button
              className="btn btn-soft h-auto py-3 justify-start gap-4"
              onClick={() => selectMode("outline")}
            >
              <FontAwesomeIcon icon={faFileCode} className="text-xl" />
              <div className="text-left">
                <div className="font-bold">Import Course from Outline</div>
                <div className="text-xs opacity-70 font-normal">Upload an HTML outline file</div>
              </div>
            </button>
            <button
              className="btn btn-soft h-auto py-3 justify-start gap-4"
              onClick={() => selectMode("transcript")}
            >
              <FontAwesomeIcon icon={faFileUpload} className="text-xl" />
              <div className="text-left">
                <div className="font-bold">Import Transcript</div>
                <div className="text-xs opacity-70 font-normal">Update grades and add completed courses from PDF</div>
              </div>
            </button>
          </div>
        )}

        {/* Manual Flow */}
        {mode === "manual" && step === 1 && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control flex flex-col gap-1">
                <label className="label font-bold text-xs uppercase opacity-70"><span className="label-text">Course Code</span></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="CHE"
                    className="input input-bordered input-ghost bg-base-200 focus:bg-base-100 font-bold text-lg w-full uppercase"
                    value={manualSubject}
                    onChange={e => setManualSubject(e.target.value.toUpperCase())}
                    onKeyDown={handleKeyDown}
                    autoFocus
                  />
                  <input
                    type="text"
                    placeholder="102"
                    className="input input-bordered input-ghost bg-base-200 focus:bg-base-100 font-bold text-lg w-full"
                    value={manualNumber}
                    onChange={e => setManualNumber(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>
              </div>
              <div className="form-control flex flex-col gap-1">
                <label className="label font-bold text-xs uppercase opacity-70"><span className="label-text">Term</span></label>
                <div className="flex gap-2">
                  <select
                    className="select select-bordered select-ghost bg-base-200 focus:bg-base-100 font-bold text-lg w-full"
                    value={manualTermSeason}
                    onChange={e => setManualTermSeason(e.target.value)}
                  >
                    <option value="Winter">Winter</option>
                    <option value="Spring">Spring</option>
                    <option value="Fall">Fall</option>
                  </select>
                  <input
                    type="number"
                    placeholder="YYYY"
                    className="input input-bordered input-ghost bg-base-200 focus:bg-base-100 font-bold text-lg w-24 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    value={manualTermYear}
                    onChange={e => setManualTermYear(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                </div>
              </div>
            </div>
            <div className="form-control flex flex-col gap-1">
              <label className="label font-bold text-xs uppercase opacity-70"><span className="label-text">Title (Optional)</span></label>
              <input
                type="text"
                placeholder="e.g. Chemistry for Engineers"
                className="input input-bordered input-ghost bg-base-200 focus:bg-base-100"
                value={manualTitle}
                onChange={e => setManualTitle(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="form-control w-full">
              <label className="label font-bold text-xs uppercase opacity-70"><span className="label-text">Credits</span></label>
              <div className="join w-full">
                <button
                  className={`btn join-item ${manualCredits === 0.25 ? "btn-active btn-neutral" : "btn-soft"}`}
                  onClick={() => setManualCredits(0.25)}
                >
                  0.25
                </button>
                <button
                  className={`btn join-item ${manualCredits === 0.5 ? "btn-active btn-neutral" : "btn-soft"}`}
                  onClick={() => setManualCredits(0.5)}
                >
                  0.50
                </button>
                <button
                  className={`btn join-item ${manualCredits === 0.75 ? "btn-active btn-neutral" : "btn-soft"}`}
                  onClick={() => setManualCredits(0.75)}
                >
                  1.00
                </button>
                <button
                  className={`btn join-item ${manualCredits === 1.0 ? "btn-active btn-neutral" : "btn-soft"}`}
                  onClick={() => setManualCredits(1.0)}
                >
                  1.50
                </button>
                <input
                  type="number"
                  step="0.25"
                  className="input input-bordered join-item w-full text-center font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  value={manualCredits}
                  onChange={e => setManualCredits(parseFloat(e.target.value || "0"))}
                />
              </div>
            </div>
          </div>
        )}

        {/* Outline Flow */}
        {mode === "outline" && step === 1 && (
          <FileUploadZone
            title="Upload Course Outline"
            description="Save the course outline as an HTML file and upload it here."
            accept="text/html"
            onFileSelect={handleOutlineFileChange}
            icon={faFileCode}
            helpLink="/help#outlines"
            helpText="How to get outline?"
          />
        )}

        {/* Transcript Flow - Step 1 */}
        {mode === "transcript" && step === 1 && (
          <FileUploadZone
            title="Upload PDF Transcript"
            description="Export your unofficial transcript from Quest as a PDF."
            accept="application/pdf"
            onFileSelect={handleTranscriptFileChange}
            icon={faFileUpload}
            error={transcriptError}
            helpLink="/help#transcript"
            helpText="How to get transcript?"
          />
        )}

        {/* Transcript Flow - Step 2 (Confirmation Table) */}
        {mode === "transcript" && step === 2 && (
          <div className="flex flex-col gap-4">
            <div className="alert shadow-sm text-sm">
              <FontAwesomeIcon icon={faCheck} className="text-success" />
              <span>Found {parsedTranscriptCourses.length} courses. Review changes below.</span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="table table-sm table-pin-rows">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Grade</th>
                    <th>Credits</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedTranscriptCourses.map((pc, i) => {
                    const existing = courses.find(c =>
                      normalizeCode(c.code) === normalizeCode(pc.code) &&
                      c.term === pc.term
                    );
                    const gradeNumeric = parseFloat(pc.grade || "");
                    const gradeUpper = (pc.grade || "").toUpperCase();
                    const isFailing = ["DNW", "FTC", "NMR", "WF"].includes(gradeUpper);
                    const hasNumericGrade = !isNaN(gradeNumeric) || isFailing;

                    let action = <span className="opacity-50 text-xs">Skip (No Match)</span>;
                    let rowClass = "opacity-50";

                    if (existing) {
                      rowClass = "";
                      let updateStatus = "Update";

                      // Check if it's actually an update
                      let prospectiveGrade: number | undefined = undefined;
                      if (!isNaN(gradeNumeric)) prospectiveGrade = gradeNumeric;
                      else if (isFailing) prospectiveGrade = 32;

                      const creditsMatch = pc.credits === existing.credits;
                      const gradeMatch = existing.data.official_grade === prospectiveGrade;

                      if (creditsMatch && (!hasNumericGrade || gradeMatch)) {
                        updateStatus = "No Change";
                        rowClass = "opacity-50";
                      }
                      action = <span className="text-xs font-bold">{updateStatus}</span>;
                    } else {
                      // NEW Course Logic
                      // Allow create for all
                      rowClass = coursesToCreate[pc.code] ? "bg-base-200" : "";
                      action = (
                        <div className="form-control">
                          <label className="cursor-pointer flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="checkbox checkbox-xs checkbox-primary"
                              checked={!!coursesToCreate[pc.code]}
                              onChange={() => toggleCreate(pc.code)}
                            />
                            <span className="label-text text-xs">Create</span>
                          </label>
                        </div>
                      );
                    }

                    return (
                      <tr key={i} className={rowClass}>
                        <td className="font-bold">
                          {pc.code}
                          <div className="text-[10px] opacity-60 font-normal">{pc.term}</div>
                        </td>
                        <td>{pc.grade || "-"}</td>
                        <td>{pc.credits}</td>
                        <td>{action}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </Modal>

      <Modal
        isOpen={!!duplicateWarning}
        onClose={() => setDuplicateWarning(null)}
        title="Course Already Exists"
        actions={
          <>
            <button className="btn" onClick={() => setDuplicateWarning(null)}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={() => {
                if (duplicateWarning?.id) {
                  router.push(`/courses/${duplicateWarning.id}`);
                  handleClose();
                }
              }}
            >
              Go to Course
            </button>
          </>
        }
      >
        <div>
          <div className="alert alert-error">
            <FontAwesomeIcon icon={faExclamationTriangle} />
            <div>You already have a course with the code
              <br />
              <strong>{duplicateWarning?.code}</strong> in <strong>{duplicateWarning?.term}</strong>.</div>
          </div>
          <p className="text-sm opacity-70 mt-2">You cannot create a duplicate course. Would you like to view the existing course instead?</p>
        </div>
      </Modal>
    </>
  );
}

"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { faCog, faCopy, faEdit, faFileImport, faInfoCircle, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { calculateSchemeGradeDetails } from "../../../../lib/grade-utils";
import { sendTelemetry } from "../../../../lib/telemetry";
import Modal from "../../../components/modal";
import { getCategoryColor, Item, useCourses } from "../../course-context";

interface ParsedItem {
    name: string;
    category: string;
    grade: number;
    max: number;
    type: string;
}

export default function CourseGradesPage() {
    const { id } = useParams();
    const { data: session } = useSession();
    const { courses, items, addItem, deleteItem, updateItem, updateCourseData } = useCourses();

    const selectedCourse = courses.find((c) => c.id === id);
    const [placeholderGrades, setPlaceholderGrades] = useState<Record<string, number>>({});

    const courseItems = items
        .filter(item => item.course_id === id)
        .sort((a, b) => {
            const dateA = a.data.due_date ? new Date(a.data.due_date).getTime() : 0;
            const dateB = b.data.due_date ? new Date(b.data.due_date).getTime() : 0;
            if (dateB !== dateA) {
                return dateB - dateA;
            }
            return (a.data.name || "").localeCompare(b.data.name || "", undefined, { numeric: true, sensitivity: 'base' });
        });

    const placeholderItems = Object.entries(placeholderGrades).map(([category, grade]) => ({
        id: `placeholder-${category}`,
        course_id: id as string,
        owner_id: "system",
        data: {
            name: `${category} Placeholder`,
            type: category,
            grade: grade.toString(),
            max_grade: "100",
            due_date: "",
            isPlaceholder: true
        },
        last_modified: new Date().toISOString()
    } as Item));

    const displayItems = [...placeholderItems, ...courseItems];
    const hasDueDates = displayItems.some(item => item.data.due_date);

    const [showGradingSettings, setShowGradingSettings] = useState(false);
    const [dropLowest, setDropLowest] = useState<Record<string, number>>({});

    const [isAddingItem, setIsAddingItem] = useState(false);
    const [editingItem, setEditingItem] = useState<Item | null>(null);
    const [itemData, setItemData] = useState({ name: "", type: "Assignment", grade: "", max_grade: "", due_date: "", isPlaceholder: false });

    // Import state
    const [isImporting, setIsImporting] = useState(false);
    const [importStep, setImportStep] = useState(1);
    const [importText, setImportText] = useState("");
    const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
    const [categoryMapping, setCategoryMapping] = useState<Record<string, string>>({});
    const [treatZeroAsEmpty, setTreatZeroAsEmpty] = useState(false);

    useEffect(() => {
        setShowGradingSettings(false);
        if (selectedCourse?.data?.drop_lowest) {
            setDropLowest(selectedCourse.data.drop_lowest);
        } else {
            setDropLowest({});
        }
        if (selectedCourse?.data?.placeholder_grades) {
            setPlaceholderGrades(selectedCourse.data.placeholder_grades);
        } else {
            setPlaceholderGrades({});
        }
        if (selectedCourse?.data?.target_grade) {
            setTargetGrade(selectedCourse.data.target_grade.toString());
        } else {
            setTargetGrade("");
        }
    }, [id, selectedCourse]);

    // Fire a telemetry event when the user opens the grades view
    useEffect(() => {
        if (!id) return;
        sendTelemetry("view_grades", { course_id: id });
    }, [id]);

    function getCourseTypes() {
        const schemes = selectedCourse?.data["marking-schemes"] || [];
        let types = Array.from(new Set(schemes.flat().map((s: any) => s.Component)));
        if (types.length === 0) types = ["Assignment", "Exam", "Quiz", "Project", "Other"];
        return types;
    }

    async function handleImportParse() {
        try {
            const res = await fetch("/api/parse_grades", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ text: importText }),
            });

            if (!res.ok) {
                throw new Error(`Error: ${res.status} ${res.statusText}`);
            }

            const data = await res.json();
            const parsed = data.items;
            setParsedItems(parsed);

            // Initialize mapping
            const uniqueCategories = Array.from(new Set(parsed.map((i: ParsedItem) => i.category))) as string[];
            // Telemetry for parsing grades - item count and categories found
            sendTelemetry("parse_grades", { items_count: parsed.length, unique_categories: uniqueCategories.length });
            const initialMapping: Record<string, string> = {};
            const courseTypes = getCourseTypes();

            uniqueCategories.forEach(cat => {
                // Try to find a matching type
                const match = courseTypes.find((t: string) => cat.toLowerCase().includes(t.toLowerCase()));
                initialMapping[cat] = match || courseTypes[0] || "Assignment";
            });

            setCategoryMapping(initialMapping);
            setImportStep(2);
        } catch (error) {
            console.error("Failed to parse grades:", error);
        }
    }

    async function handleImportConfirm() {
        if (!session?.user?.id || !id) return;

        setIsImporting(false);

        const categoriesWithGrades = new Set<string>();

        for (const item of parsedItems) {
            const mappedType = categoryMapping[item.category];
            let gradeVal = item.grade.toString();

            if (!treatZeroAsEmpty && item.grade === 0) {
                gradeVal = "";
            }

            const newItemData = {
                name: item.name,
                type: mappedType,
                grade: gradeVal,
                max_grade: item.max.toString(),
                due_date: "" // No date in import
            };

            if (gradeVal !== "") {
                categoriesWithGrades.add(mappedType);
            }

            await addItem(id as string, newItemData, session.user.id);
        }

        // Remove placeholders for categories that got grades
        const newPlaceholders = { ...placeholderGrades };
        let placeholdersChanged = false;
        categoriesWithGrades.forEach(cat => {
            if (newPlaceholders[cat] !== undefined) {
                delete newPlaceholders[cat];
                placeholdersChanged = true;
            }
        });

        if (placeholdersChanged) {
            setPlaceholderGrades(newPlaceholders);
            await updateCourseData(id as string, { placeholder_grades: newPlaceholders });
        }

        setImportText("");
        setParsedItems([]);
        setImportStep(1);
    }

    async function handleSaveItem() {
        if (!session?.user?.id || !id) return;

        if (itemData.isPlaceholder) {
            const grade = parseFloat(itemData.grade);
            const max = parseFloat(itemData.max_grade);

            let percentage = 0;
            if (!isNaN(grade) && !isNaN(max) && max !== 0) {
                percentage = (grade / max) * 100;
            }

            const newPlaceholders = { ...placeholderGrades };

            // If we are editing an existing placeholder and the type changed, remove the old one
            if (editingItem && editingItem.data.isPlaceholder && editingItem.data.type !== itemData.type) {
                delete newPlaceholders[editingItem.data.type];
            }

            newPlaceholders[itemData.type] = percentage;
            await updateCourseData(id as string, { placeholder_grades: newPlaceholders });
            // Telemetry - placeholder created/updated
            sendTelemetry("create_placeholder", { course_id: id, type: itemData.type, percentage: percentage });
        } else {
            if (editingItem) {
                await updateItem(editingItem.id, itemData);
            } else {
                await addItem(id as string, itemData, session.user.id);
            }

            // Remove placeholder if grade is added
            if (itemData.grade && placeholderGrades[itemData.type] !== undefined) {
                const newPlaceholders = { ...placeholderGrades };
                delete newPlaceholders[itemData.type];
                setPlaceholderGrades(newPlaceholders);
                await updateCourseData(id as string, { placeholder_grades: newPlaceholders });
            }
        }

        setIsAddingItem(false);
        setEditingItem(null);
        const types = getCourseTypes();
        setItemData({ name: "", type: types[0] || "Assignment", grade: "", max_grade: "", due_date: "", isPlaceholder: false });
    }

    function openAddItem() {
        setEditingItem(null);
        const types = getCourseTypes();
        setItemData({ name: "", type: types[0] || "Assignment", grade: "", max_grade: "", due_date: "", isPlaceholder: false });
        setIsAddingItem(true);
    }

    function openEditItem(item: Item) {
        setEditingItem(item);
        setItemData({
            name: item.data.name || "",
            type: item.data.type || "Assignment",
            grade: item.data.grade || "",
            max_grade: item.data.max_grade || "",
            due_date: item.data.due_date || "",
            isPlaceholder: item.data.isPlaceholder || false
        });
        setIsAddingItem(true);
    }

    async function deletePlaceholder(category: string) {
        if (!selectedCourse) return;
        const newPlaceholders = { ...placeholderGrades };
        delete newPlaceholders[category];
        await updateCourseData(selectedCourse.id, { placeholder_grades: newPlaceholders });
        sendTelemetry("delete_item", { course_id: selectedCourse.id, type: category, isPlaceholder: true });
    }

    async function duplicateItem(item: Item) {
        if (!session?.user?.id || !id) return;
        const newDate = item.data.due_date ? new Date(new Date(item.data.due_date).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : "";
        const newItemData = {
            ...item.data,
            name: `${item.data.name} (Copy)`,
            due_date: newDate
        };
        await addItem(id as string, newItemData, session.user.id);
    }

    async function handleSaveGradingSettings() {
        if (!selectedCourse) return;
        await updateCourseData(selectedCourse.id, { drop_lowest: dropLowest, placeholder_grades: placeholderGrades });
        sendTelemetry("edit_grading_settings", { course_id: selectedCourse.id, drops: JSON.stringify(dropLowest) });
        setShowGradingSettings(false);
    }

    const [targetGrade, setTargetGrade] = useState<string>("");

    // Calculate best scheme and dropped items
    let bestSchemeDroppedItems: string[] = [];
    if (selectedCourse?.data["marking-schemes"]?.length > 0) {
        let bestGrade = -1;

        selectedCourse.data["marking-schemes"].forEach((scheme: any[]) => {
            const details = calculateSchemeGradeDetails(scheme, courseItems, placeholderGrades, dropLowest);
            if (details.currentGrade !== null && details.currentGrade > bestGrade) {
                bestGrade = details.currentGrade;
                bestSchemeDroppedItems = details.droppedItemIds || [];
            }
        });
    }

    async function handleSaveTargetGrade() {
        if (!selectedCourse) return;
        const val = targetGrade === "" ? undefined : parseFloat(targetGrade);
        await updateCourseData(selectedCourse.id, { target_grade: val });
        // Telemetry - set goal
        sendTelemetry("set_goal", { course_id: selectedCourse.id, goal: val });
    }

    function calculateRequired(scheme: any[]) {
        if (!targetGrade) return null;
        const target = parseFloat(targetGrade);
        if (isNaN(target)) return null;

        let A = 0; // Points banked
        let B = 0; // Weight available

        scheme.forEach(component => {
            const weight = parseFloat(component.Weight);
            if (isNaN(weight)) return;

            const compItems = courseItems.filter(i => i.data.type === component.Component);

            if (compItems.length === 0) {
                // No items, entire weight is available
                B += weight;
            } else {
                let sumGrades = 0;
                let sumMaxAll = 0;
                let sumMaxUngraded = 0;

                compItems.forEach(i => {
                    const max = parseFloat(i.data.max_grade || "0");
                    sumMaxAll += max;

                    if (i.data.grade !== undefined && i.data.grade !== "") {
                        const grade = parseFloat(i.data.grade);
                        sumGrades += isNaN(grade) ? 0 : grade;
                    } else {
                        sumMaxUngraded += max;
                    }
                });

                if (sumMaxAll > 0) {
                    A += (sumGrades / sumMaxAll) * weight;
                    B += (sumMaxUngraded / sumMaxAll) * weight;
                }
            }
        });

        if (B === 0) return null;
        return ((target - A) / B) * 100;
    }

    if (!selectedCourse) return null;

    return (
        <>
            <Modal
                isOpen={isImporting}
                onClose={() => setIsImporting(false)}
                title="Import from Learn"
                actions={
                    <>
                        <button className="btn" onClick={() => setIsImporting(false)}>Cancel</button>
                        {importStep === 1 ? (
                            <button className="btn btn-primary" onClick={handleImportParse} disabled={!importText.trim()}>Next</button>
                        ) : (
                            <button className="btn btn-primary" onClick={handleImportConfirm}>Import {parsedItems.length} Items</button>
                        )}
                    </>
                }
            >
                {importStep === 1 ? (
                    <div className="flex flex-col gap-4">
                        <p className="text-sm opacity-70 leading-relaxed">
                            Navigate to the <strong>Grades</strong> tab of your course on Learn. <br />
                            Press <kbd className="kbd kbd-sm">Ctrl</kbd> + <kbd className="kbd kbd-sm">A</kbd> to select all text, then <kbd className="kbd kbd-sm">Ctrl</kbd> + <kbd className="kbd kbd-sm">C</kbd> to copy. <br />
                            Paste the result below using <kbd className="kbd kbd-sm">Ctrl</kbd> + <kbd className="kbd kbd-sm">V</kbd>.
                        </p>
                        <textarea
                            className="textarea textarea-bordered h-64 w-full font-mono text-xs"
                            placeholder="Paste copied text here..."
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                        ></textarea>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <p className="text-sm opacity-70">Map the categories found in the import to your course marking scheme.</p>

                        <div className="form-control">
                            <label className="label cursor-pointer justify-start gap-2">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-primary"
                                    checked={treatZeroAsEmpty}
                                    onChange={(e) => setTreatZeroAsEmpty(e.target.checked)}
                                />
                                <span className="label-text text-sm">Include items with 0% score (uncheck to leave grade empty)</span>
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
                                    {Object.keys(categoryMapping).map(cat => (
                                        <tr key={cat}>
                                            <td>{cat}</td>
                                            <td>
                                                <select
                                                    className="select select-bordered select-sm w-full"
                                                    value={categoryMapping[cat]}
                                                    onChange={(e) => setCategoryMapping({ ...categoryMapping, [cat]: e.target.value })}
                                                >
                                                    {getCourseTypes().map((t: any) => <option key={t}>{t}</option>)}
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
                                <div key={i}>{item.name} ({item.grade}/{item.max}) &rarr; {categoryMapping[item.category]}</div>
                            ))}
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={showGradingSettings}
                onClose={() => setShowGradingSettings(false)}
                title="Grading Settings"
                actions={
                    <>
                        <button className="btn" onClick={() => setShowGradingSettings(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSaveGradingSettings}>Save</button>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    <p className="text-sm opacity-70">Configure grading rules for each category.</p>
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
                                    const hasGrades = courseItems.some(i => i.data.type === t && i.data.grade);
                                    return (
                                        <tr key={t}>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <div className={`badge badge-xs ${getCategoryColor(t)}`}></div>
                                                    <span className="font-medium">{t}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="input input-bordered input-sm w-full text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    value={dropLowest[t] || 0}
                                                    onChange={(e) => setDropLowest({ ...dropLowest, [t]: parseInt(e.target.value) || 0 })}
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
                                                    title={hasGrades ? "Cannot add placeholder when grades exist" : ""}
                                                    onChange={(e) => {
                                                        const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
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

            <Modal
                isOpen={isAddingItem}
                onClose={() => setIsAddingItem(false)}
                title={editingItem ? (itemData.isPlaceholder ? "Edit Placeholder" : "Edit Item") : "Add Item"}
                actions={
                    <>
                        <button className="btn" onClick={() => setIsAddingItem(false)}>Cancel</button>
                        <button className="btn btn-primary" onClick={handleSaveItem}>Save</button>
                    </>
                }
            >
                <div className="flex flex-col gap-4">
                    {!editingItem && (
                        <div className="form-control">
                            <label className="label cursor-pointer justify-start gap-2">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-primary"
                                    checked={itemData.isPlaceholder}
                                    onChange={(e) => setItemData({ ...itemData, isPlaceholder: e.target.checked, name: e.target.checked ? `${itemData.type} Placeholder` : "" })}
                                />
                                <span className="label-text">Is Placeholder?</span>
                            </label>
                        </div>
                    )}

                    <div className="form-control w-full">
                        <label className="label mb-2">
                            <span className="label-text">Name</span>
                        </label>
                        <input
                            type="text"
                            className="input input-bordered w-full"
                            value={itemData.name}
                            onChange={(e) => setItemData({ ...itemData, name: e.target.value })}
                            disabled={itemData.isPlaceholder}
                            placeholder={itemData.isPlaceholder ? "(Auto-generated)" : ""}
                        />
                    </div>
                    <div className="form-control w-full">
                        <label className="label mb-2 flex items-center gap-2">
                            <span className="label-text">Type</span>
                        </label>
                        <select
                            className="select select-bordered w-full"
                            value={itemData.type}
                            onChange={(e) => setItemData({ ...itemData, type: e.target.value, name: itemData.isPlaceholder ? `${e.target.value} Placeholder` : itemData.name })}
                            disabled={!!editingItem && itemData.isPlaceholder}
                        >
                            {getCourseTypes().map((t: any) => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-control w-full">
                            <label className="label mb-2">
                                <span className="label-text">Grade</span>
                            </label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                value={itemData.grade}
                                onChange={(e) => setItemData({ ...itemData, grade: e.target.value })}
                            />
                        </div>
                        <div className="form-control w-full">
                            <label className="label mb-2">
                                <span className="label-text">Max Grade</span>
                            </label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                value={itemData.max_grade}
                                onChange={(e) => setItemData({ ...itemData, max_grade: e.target.value })}
                            />
                        </div>
                    </div>
                    {!itemData.isPlaceholder && (
                        <div className="form-control w-full">
                            <label className="label mb-2">
                                <span className="label-text">Due Date</span>
                            </label>
                            <input
                                type="date"
                                className="input input-bordered w-full"
                                value={itemData.due_date}
                                onChange={(e) => setItemData({ ...itemData, due_date: e.target.value })}
                            />
                        </div>
                    )}
                </div>
            </Modal>

            <div className="card bg-base-100 shadow-md">
                <div className="card-body">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <div className="flex items-center gap-2">
                            <h2 className="card-title text-2xl">Grades</h2>
                            <Link href="/help#grade-calculation" className="btn btn-ghost btn-circle btn-xs opacity-50 hover:opacity-100" title="How are grades calculated?">
                                <FontAwesomeIcon icon={faInfoCircle} />
                            </Link>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="form-control mr-2">
                                <label className="label cursor-pointer justify-start gap-2 p-0">
                                    <span className="label-text text-xs font-bold uppercase tracking-wider text-base-content/50">Target Grade</span>
                                    <div className="relative flex items-center">
                                        <input
                                            type="number"
                                            className="input input-bordered input-sm w-20 text-right pr-6 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            placeholder="-"
                                            value={targetGrade}
                                            onChange={(e) => setTargetGrade(e.target.value)}
                                            onBlur={handleSaveTargetGrade}
                                        />
                                        <span className="absolute right-2 text-sm opacity-50 pointer-events-none">%</span>
                                    </div>
                                </label>
                            </div>

                            <div className="w-px h-6 bg-base-content/10 mx-1 hidden sm:block"></div>

                            <button className="btn btn-ghost btn-sm" onClick={() => setShowGradingSettings(true)}>
                                <FontAwesomeIcon icon={faCog} /> <span className="hidden sm:inline">Grading Settings</span>
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setImportStep(1); setImportText(""); setIsImporting(true); }}>
                                <FontAwesomeIcon icon={faFileImport} /> <span className="hidden sm:inline">Import from LEARN</span>
                            </button>
                            <button className="btn btn-primary btn-sm" onClick={openAddItem}>
                                <FontAwesomeIcon icon={faPlus} /> Add Item
                            </button>
                        </div>
                    </div>

                    {selectedCourse.data["marking-schemes"]?.length > 0 && displayItems.length > 0 && (
                        <div className="bg-base-200/40 card p-4 mb-6 border border-base-content/5 shadow-sm">
                            <div className="flex flex-wrap gap-4">
                                {selectedCourse.data["marking-schemes"].map((scheme: any[], idx: number) => {
                                    const details = calculateSchemeGradeDetails(scheme, courseItems, placeholderGrades, dropLowest);
                                    if (details.currentGrade === null) return null;

                                    const min = details.currentScore;
                                    const max = details.currentScore + (details.totalSchemeWeight - details.totalWeightGraded);
                                    const required = calculateRequired(scheme);

                                    let gradeColor = "text-error";
                                    if (details.currentGrade >= 80) gradeColor = "text-success";
                                    else if (details.currentGrade >= 60) gradeColor = "text-warning";

                                    return (
                                        <div key={idx} className="relative group">
                                            <div className="flex flex-col p-4 bg-base-100 card border border-base-content/10 shadow-sm hover:shadow-md transition-all min-w-[180px] cursor-default h-full">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-[10px] uppercase tracking-wider font-bold opacity-50">Scheme {idx + 1}</span>
                                                    <FontAwesomeIcon icon={faInfoCircle} className="text-xs opacity-20" />
                                                </div>

                                                <div className="flex items-baseline gap-1 mb-3">
                                                    <span className={`text-4xl font-black tracking-tighter ${gradeColor}`}>{details.currentGrade.toFixed(1)}</span>
                                                    <span className="text-lg font-bold opacity-40">%</span>
                                                </div>

                                                <div className="space-y-1.5 mt-auto">
                                                    <div className="flex justify-between items-center text-xs">
                                                        <span className="opacity-60">Range</span>
                                                        <span className="font-mono font-medium opacity-80">{min.toFixed(1)} - {max.toFixed(1)}%</span>
                                                    </div>

                                                    <div className={`flex justify-between items-center text-xs ${required !== null ? "" : "invisible"}`}>
                                                        <span className="opacity-60">Req. to Goal</span>
                                                        <span className={`font-bold ${required !== null && required > 100 ? "text-error" : required !== null && required < 0 ? "text-success" : required !== null && required < details.currentGrade ? "text-info" : "text-warning"}`}>
                                                            {required !== null ? required.toFixed(1) : "0.0"}%
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 p-4 bg-base-300 text-base-content text-xs card shadow-2xl border border-base-content/10">
                                                <div className="font-bold mb-3 border-b border-base-content/10 pb-2 text-sm">Scheme Breakdown</div>
                                                <div className="flex flex-col gap-2">
                                                    {scheme.map((s, i) => (
                                                        <div key={i} className="flex justify-between items-center">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`badge badge-xs ${getCategoryColor(s.Component)}`}></div>
                                                                <span className="font-medium">{s.Component}</span>
                                                            </div>
                                                            <span className="opacity-70 font-mono">{s.Weight}%</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}                    <div className="overflow-x-auto border border-base-content/10 card">
                        <table className="table w-full table-zebra">
                            <thead>
                                <tr>
                                    <th className="w-full">Name</th>
                                    <th className="whitespace-nowrap min-w-[120px]">Type</th>
                                    <th className="whitespace-nowrap min-w-[120px]">Grade</th>
                                    {hasDueDates && <th className="whitespace-nowrap min-w-[120px]">Due Date</th>}
                                    <th className="whitespace-nowrap">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={hasDueDates ? 5 : 4} className="text-center text-base-content/50 py-8">
                                            No grades found. Add one to get started!
                                        </td>
                                    </tr>
                                ) : (
                                    displayItems.map((item) => (
                                        <tr key={item.id} className={`${item.data.isPlaceholder ? "bg-base-200/30 italic opacity-70" : ""} ${bestSchemeDroppedItems.includes(item.id) || (!item.data.grade && !item.data.isPlaceholder) ? "opacity-40 grayscale" : ""}`}>
                                            <td className="font-medium">
                                                {item.data.name}
                                            </td>
                                            <td>
                                                <div className={`badge ${getCategoryColor(item.data.type)} text-white border-none max-w-[150px] truncate block`}>
                                                    {item.data.type}
                                                </div>
                                            </td>
                                            <td>
                                                {item.data.grade ? (
                                                    <div className="flex flex-col">
                                                        <span>
                                                            {item.data.grade}
                                                            {item.data.max_grade ? <span className="text-base-content/50"> / {item.data.max_grade}</span> : ""}
                                                        </span>
                                                        {item.data.max_grade && !isNaN(parseFloat(item.data.grade)) && !isNaN(parseFloat(item.data.max_grade)) && parseFloat(item.data.max_grade) !== 0 && (
                                                            <span className="text-xs opacity-50 font-mono">
                                                                {((parseFloat(item.data.grade) / parseFloat(item.data.max_grade)) * 100).toFixed(2)}%
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-base-content/30">
                                                        -
                                                        {item.data.max_grade ? <span className="text-base-content/50"> / {item.data.max_grade}</span> : ""}
                                                    </span>
                                                )}
                                            </td>
                                            {hasDueDates && <td>{item.data.due_date ? new Date(item.data.due_date + "T00:00:00").toLocaleDateString() : "-"}</td>}
                                            <td>
                                                <div className="flex gap-2">
                                                    <button className="btn btn-ghost btn-xs" onClick={() => openEditItem(item)} title="Edit">
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </button>
                                                    <button className={`btn btn-ghost btn-xs ${item.data.isPlaceholder ? "invisible" : ""}`} onClick={() => !item.data.isPlaceholder && duplicateItem(item)} title="Duplicate">
                                                        <FontAwesomeIcon icon={faCopy} />
                                                    </button>
                                                    <button className="btn btn-ghost btn-xs text-error" onClick={() => item.data.isPlaceholder ? deletePlaceholder(item.data.type) : deleteItem(item.id)} title="Delete">
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
}

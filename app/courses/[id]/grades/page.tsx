"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  faCog,
  faCopy,
  faEdit,
  faFileImport,
  faInfoCircle,
  faPlus,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { calculateSchemeGradeDetails } from "../../../../lib/grade-utils";
import { sendTelemetry } from "../../../../lib/telemetry";
import GoalInput from "../../../components/goal-input";
import GradeBadge from "../../../components/grade-badge";
import { useLoading } from "../../../components/loading-context";
import Modal from "../../../components/modal";
import RangeBadge from "../../../components/range-badge";
import ReqAvgBadge from "../../../components/req-avg-badge";
import { getCategoryColor, Item, useCourses } from "../../../course-context";
import { get } from "http";

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
  const { courses, items, addItem, deleteItem, updateItem, updateCourseData } =
    useCourses();

  const selectedCourse = courses.find((c) => c.id === id);
  const [placeholderGrades, setPlaceholderGrades] = useState<
    Record<string, number>
  >({});

  // Build a base list of items for this course. We don't sort yet because
  // sorting depends on component weights and kept counts which are derived
  // from the marking scheme. Ensure `data` exists and provide a default
  // `weight` so downstream code can safely parse it.
  const baseCourseItems = items
    .filter((item) => item.course_id === id)
    .map((item) => {
      const data = {
        ...(item.data || {}),
        // Ensure required fields exist with sensible defaults so TS treats this as an Item
        name: item.data?.name ?? "",
        type: item.data?.type ?? "Assignment",
        grade: item.data?.grade ?? "",
        max_grade: item.data?.max_grade ?? "",
        due_date: item.data?.due_date ?? "",
        isPlaceholder: item.data?.isPlaceholder ?? false,
        weight:
          item?.data && item.data.weight !== undefined && item.data.weight !== null
            ? item.data.weight
            : "0",
      };
      return {
        ...item,
        data,
      } as Item;
    });

  // We'll compute `courseItems` (the sorted list) after we build
  // `componentMap` and `categoryKeptCountMap` below to avoid accessing
  // those maps before initialization.

  const placeholderItems = Object.entries(placeholderGrades).map(
    ([category, grade]) =>
      ({
        id: `placeholder-${category}`,
        course_id: id as string,
        owner_id: "system",
        data: {
          name: `${category} Placeholder`,
          type: category,
          grade: grade.toString(),
          max_grade: "100",
          due_date: "",
          isPlaceholder: true,
        },
        last_modified: new Date().toISOString(),
      }) as Item,
  );


  const [showGradingSettings, setShowGradingSettings] = useState(false);
  const [dropLowest, setDropLowest] = useState<Record<string, number>>({});

  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemData, setItemData] = useState({
    name: "",
    type: "Assignment",
    grade: "",
    max_grade: "",
    due_date: "",
    isPlaceholder: false,
  });

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importStep, setImportStep] = useState(1);
  const [importText, setImportText] = useState("");
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [categoryMapping, setCategoryMapping] = useState<
    Record<string, string>
  >({});
  const [treatZeroAsEmpty, setTreatZeroAsEmpty] = useState(false);

  const { showLoading, hideLoading } = useLoading();

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
    let types = Array.from(
      new Set(schemes.flat().map((s: any) => s.Component)),
    );
    if (types.length === 0)
      types = ["Assignment", "Exam", "Quiz", "Project", "Other"];
    return types;
  }

  async function handleImportParse() {

    try {
      showLoading();
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
      const uniqueCategories = Array.from(
        new Set(parsed.map((i: ParsedItem) => i.category)),
      ) as string[];
      // Telemetry for parsing grades - item count and categories found
      sendTelemetry("parse_grades", {
        items_count: parsed.length,
        unique_categories: uniqueCategories.length,
      });
      const initialMapping: Record<string, string> = {};
      const courseTypes = getCourseTypes();

      uniqueCategories.forEach((cat) => {
        // Try to find a matching type
        const match = courseTypes.find((t: string) =>
          cat.toLowerCase().includes(t.toLowerCase()),
        );
        initialMapping[cat] = match || courseTypes[0] || "Assignment";
      });

      setCategoryMapping(initialMapping);
      setImportStep(2);
    } catch (error) {
      console.error("Failed to parse grades:", error);
    } finally {
      try {
        hideLoading();
      } catch {
        // ignore
      }
    }
  }

  async function handleImportConfirm() {
    if (!session?.user?.id || !id) return;

    setIsImporting(false);
    showLoading();

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
        due_date: "", // No date in import
      };

      if (gradeVal !== "") {
        categoriesWithGrades.add(mappedType);
      }

      await addItem(id as string, newItemData, session.user.id);
    }

    // Remove placeholders for categories that got grades
    const newPlaceholders = { ...placeholderGrades };
    let placeholdersChanged = false;
    categoriesWithGrades.forEach((cat) => {
      if (newPlaceholders[cat] !== undefined) {
        delete newPlaceholders[cat];
        placeholdersChanged = true;
      }
    });

    if (placeholdersChanged) {
      setPlaceholderGrades(newPlaceholders);
      await updateCourseData(id as string, {
        placeholder_grades: newPlaceholders,
      });
    }

    setImportText("");
    setParsedItems([]);
    setImportStep(1);
    try {
      // nothing
    } finally {
      try {
        hideLoading();
      } catch {
        // ignore
      }
    }
  }

  async function handleSaveItem() {
    if (!session?.user?.id || !id) return;

    if (itemData.isPlaceholder) {
      const grade = parseFloat(itemData.grade);

      const newPlaceholders = { ...placeholderGrades };

      // If we are editing an existing placeholder and the type changed, remove the old one
      if (
        editingItem &&
        editingItem.data.isPlaceholder &&
        editingItem.data.type !== itemData.type
      ) {
        delete newPlaceholders[editingItem.data.type];
      }

      newPlaceholders[itemData.type] = grade;
      await updateCourseData(id as string, {
        placeholder_grades: newPlaceholders,
      });
      // Telemetry - placeholder created/updated
      sendTelemetry("create_placeholder", {
        course_id: id,
        type: itemData.type,
        percentage: grade,
      });
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
        await updateCourseData(id as string, {
          placeholder_grades: newPlaceholders,
        });
      }
    }

    setIsAddingItem(false);
    setEditingItem(null);
    const types = getCourseTypes();
    setItemData({
      name: "",
      type: types[0] || "Assignment",
      grade: "",
      max_grade: "",
      due_date: "",
      isPlaceholder: false,
    });
  }

  function openAddItem() {
    setEditingItem(null);
    const types = getCourseTypes();
    setItemData({
      name: "",
      type: types[0] || "Assignment",
      grade: "",
      max_grade: "",
      due_date: "",
      isPlaceholder: false,
    });
    setIsAddingItem(true);
  }

  function openEditItem(item: Item) {
    setEditingItem(item);
    setItemData({
      name: item.data.name || "",
      type: item.data.type || "Assignment",
      grade: item.data.grade || "",
      max_grade: item.data.isPlaceholder ? "100" : (item.data.max_grade || ""),
      due_date: item.data.due_date || "",
      isPlaceholder: item.data.isPlaceholder || false,
    });
    setIsAddingItem(true);
  }

  async function deletePlaceholder(category: string) {
    if (!selectedCourse) return;
    const newPlaceholders = { ...placeholderGrades };
    delete newPlaceholders[category];
    await updateCourseData(selectedCourse.id, {
      placeholder_grades: newPlaceholders,
    });
    sendTelemetry("delete_item", {
      course_id: selectedCourse.id,
      type: category,
      isPlaceholder: true,
    });
  }

  async function duplicateItem(item: Item) {
    if (!session?.user?.id || !id) return;
    const newDate = item.data.due_date
      ? new Date(
        new Date(item.data.due_date).getTime() + 7 * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .split("T")[0]
      : "";
    const newItemData = {
      ...item.data,
      name: `${item.data.name} (Copy)`,
      due_date: newDate,
    };
    await addItem(id as string, newItemData, session.user.id);
  }

  async function handleSaveGradingSettings() {
    if (!selectedCourse) return;
    await updateCourseData(selectedCourse.id, {
      drop_lowest: dropLowest,
      placeholder_grades: placeholderGrades,
    });
    sendTelemetry("edit_grading_settings", {
      course_id: selectedCourse.id,
      drops: JSON.stringify(dropLowest),
    });
    setShowGradingSettings(false);
  }

  const [targetGrade, setTargetGrade] = useState<string>("");
  const [activeSchemeIndex, setActiveSchemeIndex] = useState<number | null>(
    null,
  );

  // Find best scheme index (used as default active) and its dropped items
  let bestSchemeDroppedItems: string[] = [];
  let bestScheme: any[] | null = null;
  let bestOriginalIndex: number | null = null;
  if (selectedCourse?.data["marking-schemes"]?.length > 0) {
    let bestGrade = -1;

    selectedCourse.data["marking-schemes"].forEach((scheme: any[], idx: number) => {
      const details = calculateSchemeGradeDetails(
        scheme,
        baseCourseItems,
        placeholderGrades,
        dropLowest,
      );
      if (details.currentGrade !== null && details.currentGrade > bestGrade) {
        bestGrade = details.currentGrade;
        bestSchemeDroppedItems = details.droppedItemIds || [];
        bestScheme = scheme;
        bestOriginalIndex = idx;
      }
    });
  }

  // If no active scheme chosen by user, default to best scheme
  useEffect(() => {
    // Prefer persisted preferred-marking-scheme if present
    if (activeSchemeIndex === null) {
      const rawPref = selectedCourse?.data?.["preferred-marking-scheme"];
      if (rawPref !== undefined && rawPref !== null) {
        const parsedPref = typeof rawPref === "number" ? rawPref : parseInt(rawPref, 10);
        if (
          Number.isInteger(parsedPref) &&
          selectedCourse?.data["marking-schemes"] &&
          parsedPref >= 0 &&
          parsedPref < selectedCourse.data["marking-schemes"].length
        ) {
          setActiveSchemeIndex(parsedPref);
          return;
        }
      }

      if (bestOriginalIndex !== null) {
        setActiveSchemeIndex(bestOriginalIndex);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bestOriginalIndex, selectedCourse?.id, selectedCourse?.data?.["preferred-marking-scheme"]]);

  const categoryKeptCountMap = new Map<string, number>();
  const componentMap = new Map<string, any>();

  // Use the active scheme (selected by user) if available, otherwise fallback to bestScheme
  const usedScheme =
    activeSchemeIndex !== null && selectedCourse?.data["marking-schemes"]
      ? selectedCourse.data["marking-schemes"][activeSchemeIndex]
      : bestScheme;

  const usedDetails =
    usedScheme && selectedCourse
      ? calculateSchemeGradeDetails(
        usedScheme,
        baseCourseItems,
        placeholderGrades,
        dropLowest,
      )
      : null;

  const usedDroppedItemIds = usedDetails?.droppedItemIds || [];

  if (usedScheme) {
    usedScheme.forEach((c) => componentMap.set(c.Component, c));

    for (const component of usedScheme) {
      const category = component.Component;
      // Include incomplete (ungraded) items in the per-item weight calculation
      // but exclude items that are explicitly dropped. We derive the number of
      // items that actually share the component weight as: (total items in
      // category) - (drop count). Note: dropping is determined elsewhere and
      // `usedDetails.droppedItemIds` contains the dropped item ids for display,
      // but drop counts configured per-category are used here.
      const compItemsAll = baseCourseItems.filter(
        (i) => i.data.type === category
      );

      const dropCount = dropLowest[category] || 0;
      const totalCount = Math.max(compItemsAll.length - dropCount, 0);

      if (totalCount === 0) continue;

      categoryKeptCountMap.set(category, totalCount);
    }
  }

  // Now that we have `componentMap` and `categoryKeptCountMap` we can
  // produce the final `courseItems` array, sorted by per-item total
  // contribution (descending), then due date (ascending), then name.
  const courseItems = [...baseCourseItems].sort((a, b) => {
    const compA = componentMap.get(a.data.type);
    const compB = componentMap.get(b.data.type);

    const weightA = compA ? parseFloat(compA.Weight) || 0 : 0;
    const weightB = compB ? parseFloat(compB.Weight) || 0 : 0;

    const keptA = Math.max(categoryKeptCountMap.get(a.data.type) || 0, 0);
    const keptB = Math.max(categoryKeptCountMap.get(b.data.type) || 0, 0);

    const totalContributionA = keptA > 0 ? weightA / keptA : 0;
    const totalContributionB = keptB > 0 ? weightB / keptB : 0;

    if (totalContributionB !== totalContributionA) {
      return totalContributionB - totalContributionA; // descending
    }

    const dateA = a.data.due_date ? new Date(a.data.due_date).getTime() : 0;
    const dateB = b.data.due_date ? new Date(b.data.due_date).getTime() : 0;
    if (dateA !== dateB) return dateA - dateB;

    return (b.data.name || "").localeCompare(a.data.name || "", undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });

  const displayItems = [...placeholderItems, ...courseItems];
  const hasDueDates = displayItems.some((item) => item.data.due_date);

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

    const details = calculateSchemeGradeDetails(
      scheme,
      courseItems,
      placeholderGrades,
      dropLowest,
    );

    const remainingWeight =
      details.totalSchemeWeight - details.totalWeightGraded;
    if (remainingWeight <= 0) return null;

    const neededTotal =
      (target * details.totalSchemeWeight - details.currentGrade! * details.totalWeightGraded) /
      remainingWeight;

    return neededTotal;
  }

  const currentTypeHasGrades = courseItems.some(
    (i) => i.data.type === itemData.type && i.data.grade,
  );
  const allTypes = getCourseTypes();
  const validPlaceholderCategories = allTypes.filter(
    (t: string) => !courseItems.some((i) => i.data.type === t && i.data.grade),
  );
  const canAddPlaceholder = validPlaceholderCategories.length > 0;

  if (!selectedCourse) return null;

  // Compute per-type aggregates for the "Item Types Averages" table
  const showRemaining = allTypes.length > 1;

  const typeStats = (usedScheme ? usedScheme.map((c: any) => c.Component) : allTypes).map((category: string) => {
    const comp = componentMap.get(category);
    const compWeight = comp ? parseFloat(comp.Weight) || 0 : 0;
    const keptCount = Math.max(categoryKeptCountMap.get(category) || 0, 0);

    // Items to consider include placeholders (from displayItems) and real items
    const itemsInCategory = displayItems.filter((i) => i.data.type === category);

    // Exclude dropped items from contribution/average calculations
    const includedItems = itemsInCategory.filter((i) => !usedDroppedItemIds.includes(i.id));

    // Graded items are those with a non-empty grade
    const gradedItems = includedItems.filter((i) => i.data.grade !== "");

    // Average percent across graded items (grade/max * 100)
    const gradePercents = gradedItems
      .map((it) => {
        const g = parseFloat(it.data.grade || "0");
        const m = parseFloat(it.data.max_grade || "0");
        if (isNaN(g) || isNaN(m) || m === 0) return NaN;
        return (g / m) * 100;
      })
      .filter((v) => !isNaN(v));

    const averagePercent =
      gradePercents.length > 0
        ? gradePercents.reduce((a, b) => a + b, 0) / gradePercents.length
        : null;

    const markedCount = itemsInCategory.filter((i) => i.data.grade !== "" && !i.data.isPlaceholder).length;
    const remainingCount = itemsInCategory.filter((i) => i.data.grade === "" && !i.data.isPlaceholder).length;

    // Contribution: sum of per-item earned contributions using same logic as item rows
    const perItemContribution = markedCount > 0 ? compWeight / markedCount : 0;

    let earnedContributionSum = 0;
    let hasAnyContribution = false;

    includedItems.forEach((it) => {
      const g = parseFloat(it.data.grade || "0");
      const m = parseFloat(it.data.max_grade || "0");
      if (it.data.grade === "" || isNaN(g) || isNaN(m) || m === 0) return;
      earnedContributionSum += (g / m) * perItemContribution;
      hasAnyContribution = true;
    });

    const totalComponent = compWeight;

    return {
      category,
      compWeight,
      keptCount,
      averagePercent,
      earnedContributionSum: hasAnyContribution ? earnedContributionSum : null,
      totalComponent,
      markedCount,
      remainingCount,
      itemsCount: itemsInCategory.length,
    };
  });

  return (
    <>
      <Modal
        isOpen={isImporting}
        onClose={() => setIsImporting(false)}
        title="Import from Learn"
        onConfirm={
          importStep === 1
            ? importText.trim()
              ? handleImportParse
              : undefined
            : handleImportConfirm
        }
        actions={
          <>
            <button className="btn" onClick={() => setIsImporting(false)}>
              Cancel
            </button>
            {importStep === 1 ? (
              <button
                className="btn btn-primary"
                onClick={handleImportParse}
                disabled={!importText.trim()}
              >
                Next
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleImportConfirm}>
                Import {parsedItems.length} Items
              </button>
            )}
          </>
        }
      >
        {importStep === 1 ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm opacity-70 leading-relaxed">
              Navigate to the <strong>Grades</strong> tab of your course on
              Learn. <br />
              Press <kbd className="kbd kbd-sm">Ctrl</kbd> +{" "}
              <kbd className="kbd kbd-sm">A</kbd> to select all text, then{" "}
              <kbd className="kbd kbd-sm">Ctrl</kbd> +{" "}
              <kbd className="kbd kbd-sm">C</kbd> to copy. <br />
              Paste the result below using{" "}
              <kbd className="kbd kbd-sm">Ctrl</kbd> +{" "}
              <kbd className="kbd kbd-sm">V</kbd>.
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

      <Modal
        isOpen={showGradingSettings}
        onClose={() => setShowGradingSettings(false)}
        title="Grading Settings"
        onConfirm={handleSaveGradingSettings}
        actions={
          <>
            <button
              className="btn"
              onClick={() => setShowGradingSettings(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveGradingSettings}
            >
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

      <Modal
        isOpen={isAddingItem}
        onClose={() => setIsAddingItem(false)}
        title={
          editingItem
            ? itemData.isPlaceholder
              ? "Edit Placeholder"
              : "Edit Item"
            : "Add Item"
        }
        onConfirm={handleSaveItem}
        actions={
          <>
            <button className="btn" onClick={() => setIsAddingItem(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSaveItem}>
              Save
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {!editingItem && (
            <div
              className="form-control"
              title={!canAddPlaceholder ? "All categories have grades" : ""}
            >
              <label className="label cursor-pointer justify-start gap-2">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary"
                  checked={itemData.isPlaceholder}
                  disabled={!canAddPlaceholder}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    let newType = itemData.type;

                    if (isChecked && currentTypeHasGrades) {
                      // Find a valid type
                      const validType = validPlaceholderCategories[0];
                      if (validType) {
                        newType = validType;
                      }
                    }

                    setItemData({
                      ...itemData,
                      isPlaceholder: isChecked,
                      type: newType,
                      name: isChecked ? `${newType} Placeholder` : "",
                      max_grade: isChecked ? "100" : itemData.max_grade,
                    });
                  }}
                />
                <span
                  className={`label-text ${!canAddPlaceholder ? "opacity-50" : ""}`}
                >
                  Is Placeholder?
                </span>
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
              onChange={(e) =>
                setItemData({ ...itemData, name: e.target.value })
              }
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
              onChange={(e) => {
                const newType = e.target.value;
                const typeHasGrades = courseItems.some(
                  (i) => i.data.type === newType && i.data.grade,
                );
                const newIsPlaceholder = typeHasGrades ? false : itemData.isPlaceholder;
                setItemData({
                  ...itemData,
                  type: newType,
                  name: newIsPlaceholder ? `${newType} Placeholder` : itemData.name,
                  isPlaceholder: newIsPlaceholder,
                  max_grade: newIsPlaceholder ? "100" : itemData.max_grade,
                });
              }}
              disabled={!!editingItem && itemData.isPlaceholder}
            >
              {(itemData.isPlaceholder
                ? validPlaceholderCategories
                : getCourseTypes()
              ).map((t: any) => (
                <option key={t}>{t}</option>
              ))}
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
                onChange={(e) =>
                  setItemData({ ...itemData, grade: e.target.value })
                }
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
                onChange={(e) =>
                  setItemData({ ...itemData, max_grade: e.target.value })
                }
                disabled={itemData.isPlaceholder}
                title={itemData.isPlaceholder ? "Placeholder max is fixed at 100" : ""}
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
                onChange={(e) =>
                  setItemData({ ...itemData, due_date: e.target.value })
                }
              />
            </div>
          )}
        </div>
      </Modal>

      <div className="card bg-base-100 shadow-md">
        <div className="card-body p-4 sm:p-8 gap-4 sm:gap-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <h2 className="card-title text-2xl">Grades</h2>
                <div
                  className="tooltip tooltip-up"
                  data-tip={"How are grades calculated?"}
                >
                  <Link
                    href="/help#grade-calculation"
                    className="text-base opacity-30 hover:opacity-100 transition-opacity"
                  >
                    <FontAwesomeIcon icon={faInfoCircle} />
                  </Link>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-start gap-2 bg-base-200/50 p-1.5 card flex-row border border-base-content/5 w-full sm:w-auto shadow-sm">
                <GoalInput
                  handleSaveTargetGrade={handleSaveTargetGrade}
                  targetGrade={targetGrade}
                  setTargetGrade={setTargetGrade}
                />
              </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <button
                className="btn btn-soft btn-md flex-1 sm:flex-none"
                onClick={() => setShowGradingSettings(true)}
              >
                <FontAwesomeIcon icon={faCog} /> Grading
              </button>
              <button
                className="btn btn-soft btn-md flex-1 sm:flex-none"
                onClick={() => setIsImporting(true)}
              >
                <FontAwesomeIcon icon={faFileImport} /> Import
              </button>
              <button
                className="btn btn-primary btn-md flex-1 sm:flex-none"
                onClick={openAddItem}
              >
                <FontAwesomeIcon icon={faPlus} /> Add
              </button>
            </div>
          </div>
          {selectedCourse.data["marking-schemes"]?.length > 0 &&
            displayItems.length > 0 && (
              <div className="bg-base-200/40 card p-4 border border-base-content/5 shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-4xl">
                  {selectedCourse.data["marking-schemes"]
                    .map((scheme: any[], idx: number) => ({
                      scheme,
                      originalIndex: idx,
                      details: calculateSchemeGradeDetails(
                        scheme,
                        courseItems,
                        placeholderGrades,
                        dropLowest,
                      ),
                    }))
                    .filter((item: any) => item.details.currentGrade !== null)
                    .sort(
                      (a: any, b: any) =>
                        b.details.currentGrade - a.details.currentGrade,
                    )
                    .map((item: any, idx: number) => {
                      const { scheme, originalIndex, details } = item;
                      const isHighest = idx === 0;
                      const isActive =
                        activeSchemeIndex !== null
                          ? originalIndex === activeSchemeIndex
                          : originalIndex === bestOriginalIndex;

                      const min = details.currentScore;
                      const max =
                        details.currentScore +
                        (details.totalSchemeWeight - details.totalWeightGraded);
                      const required = calculateRequired(scheme);

                      return (
                        <div
                          key={originalIndex}
                          className="relative group w-full"
                        >
                          <button
                            type="button"
                            onClick={async () => {
                              setActiveSchemeIndex(originalIndex);
                              try {
                                if (selectedCourse) {
                                  await updateCourseData(selectedCourse.id, {
                                    "preferred-marking-scheme": originalIndex,
                                  });
                                  sendTelemetry("select_marking_scheme", {
                                    course_id: selectedCourse.id,
                                    scheme_index: originalIndex,
                                  });
                                }
                              } catch (e) {
                                // ignore persistence/telemetry errors
                              }
                            }}
                            aria-pressed={isActive}
                            title={`Activate scheme ${originalIndex + 1}`}
                            className={`h-[6rem] flex flex-row justify-between items-stretch p-4 bg-base-100 card border border-base-content/10 shadow-sm hover:shadow-md transition-all w-full cursor-pointer ${!isActive ? "opacity-60 grayscale" : ""}`}
                          >
                            <div className="flex flex-col justify-between h-full">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] uppercase tracking-wider font-bold opacity-50">
                                  Scheme {originalIndex + 1}
                                </span>
                                <FontAwesomeIcon
                                  icon={faInfoCircle}
                                  className="text-xs opacity-20"
                                />
                              </div>

                              <div className="flex items-baseline gap-1">
                                {!isActive ? (
                                  <GradeBadge
                                    grade={details.currentGrade!}
                                    disabled={true}
                                  />
                                ) : (
                                  <GradeBadge grade={details.currentGrade!} />
                                )}
                              </div>
                            </div>

                            {required === null ? (
                              <div className="flex items-end h-full self-end">
                                {min !== null && max !== null && (
                                  <RangeBadge rangeMin={min} rangeMax={max} />
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-end gap-2 min-w-[140px] text-sm self-end">
                                {required !== null && (
                                  <ReqAvgBadge
                                    requiredAverage={required}
                                    average={details.currentGrade}
                                    showTooltip={isActive}
                                  />
                                )}
                                {min !== null && max !== null && (
                                  <RangeBadge rangeMin={min} rangeMax={max} />
                                )}
                              </div>
                            )}
                          </button>

                          <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-[1] w-64 p-4 bg-base-300 text-base-content text-xs card shadow-2xl border border-base-content/10">
                            <div className="font-bold mb-3 border-b border-base-content/10 pb-2 text-sm">
                              Scheme Breakdown
                            </div>
                            <div className="flex flex-col gap-2">
                              {scheme.map((s: any, i: number) => (
                                <div
                                  key={i}
                                  className="flex justify-between items-center"
                                >
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`badge badge-xs ${getCategoryColor(s.Component, getCourseTypes())}`}
                                    ></div>
                                    <span className="font-medium">
                                      {s.Component}
                                    </span>
                                  </div>
                                  <span className="opacity-70 font-mono">
                                    {s.Weight}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

          <div className="overflow-x-auto border border-base-content/10 rounded-box">
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="text-right">Avg Grade</th>
                  <th className="text-right">Contribution</th>
                  <th className="w-full">Type</th>
                  <th>Marked</th>
                  {showRemaining && <th>Remaining</th>}
                </tr>
              </thead>
              <tbody>
                {typeStats.map((s) => (
                  <tr key={s.category}>
                    <td className="text-right">
                      {s.averagePercent === null ? (
                        <span className="text-base-content/50">-</span>
                      ) : (
                        <span className="font-mono font-bold">{s.averagePercent.toFixed(2)}%</span>
                      )}
                    </td>
                    <td className="text-right">
                      {s.earnedContributionSum === null ? (
                        <span className="text-base-content/50 font-mono">/{s.totalComponent.toFixed(2)}%</span>
                      ) : (
                        <div className="flex flex-col items-end">
                          {s.earnedContributionSum - s.totalComponent < 0 ? (
                            <span className="font-mono font-bold">{(s.earnedContributionSum - s.totalComponent).toFixed(2)}%</span>
                          ) : (
                            <span className="font-mono opacity-50">{s.earnedContributionSum.toFixed(2)}%</span>
                          )
                          }
                          <span className="text-xs opacity-50">/ {s.totalComponent.toFixed(2)}%</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className={`badge badge-xs ${getCategoryColor(s.category, getCourseTypes())}`}></div>
                        <span className="font-medium">{s.category}</span>
                      </div>
                    </td>
                    <td>
                      <span className="font-mono">{s.markedCount}</span>
                    </td>
                    {showRemaining && (
                      <td>
                        <span className="font-mono">{s.remainingCount}</span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="overflow-x-auto border border-base-content/10 rounded-box">
            <table className="table w-full">
              <thead>
                <tr>
                  <th className="whitespace-nowrap min-w-fit text-right">
                    Grade
                  </th>
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
                {displayItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={hasDueDates ? 6 : 5}
                      className="text-center text-base-content/50 py-8"
                    >
                      No grades found. Add one to get started!
                    </td>
                  </tr>
                ) : (
                  displayItems.map((item) => {
                    const isDropped = usedDroppedItemIds.includes(item.id);
                    const isNoGrade =
                      !item.data.grade && !item.data.isPlaceholder;
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
                          {/* Contribution: earnedContribution/totalContribution */}
                          {(() => {
                            const comp = componentMap.get(item.data.type);
                            const keptCount = categoryKeptCountMap.get(item.data.type);
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

                            // Each kept item in the category has equal share of the component weight
                            const totalContribution = compWeight / keptCount;

                            // Earned contribution = (grade / itemMax) * totalContribution
                            const earnedContribution =
                              item.data.grade === "" || isNaN(gradeRaw) || isNaN(maxRaw) || maxRaw === 0
                                ? NaN
                                : (gradeRaw / maxRaw) * totalContribution;

                            if (isNaN(earnedContribution)) {
                              return (
                                <div className="flex w-full items-end justify-end gap-1 font-mono">
                                  <span className="text-base-content/50">/{totalContribution.toFixed(2)}%</span>
                                </div>
                              );
                            }

                            const percentLost = totalContribution - earnedContribution;

                            return (
                              <div className="flex flex-col w-full items-end min-w-fit">
                                {isDropped ? (
                                  <span className="font-mono font-bold">
                                    -
                                  </span>
                                ) : (percentLost > 0 ? (
                                  <span
                                    className={`font-mono font-bold ${isDropped ? " line-through" : ""}`}
                                  >
                                    -{percentLost.toFixed(2)}%
                                  </span>
                                ) : (
                                  <span className={`font-mono opacity-50 ${isDropped ? " line-through" : ""}`}>
                                    {earnedContribution.toFixed(2)}%
                                  </span>)
                                )}
                                <span className={`font-mono text-xs opacity-50 ${isDropped ? "line-through decoration-base-content/50" : ""}`}>
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
                        {
                          hasDueDates && (
                            <td>
                              {item.data.due_date
                                ? new Date(
                                  item.data.due_date + "T00:00:00",
                                ).toLocaleDateString()
                                : "-"}
                            </td>
                          )
                        }
                        <td>
                          <div className="flex gap-2">
                            <button
                              className="btn btn-ghost btn-xs"
                              onClick={() => openEditItem(item)}
                              title="Edit"
                              aria-label="Edit item"
                            >
                              <FontAwesomeIcon icon={faEdit} aria-hidden="true" />
                            </button>
                            <button
                              className={`btn btn-ghost btn-xs ${item.data.isPlaceholder ? "invisible" : ""}`}
                              onClick={() =>
                                !item.data.isPlaceholder && duplicateItem(item)
                              }
                              title="Duplicate"
                              aria-label="Duplicate item"
                            >
                              <FontAwesomeIcon icon={faCopy} aria-hidden="true" />
                            </button>
                            <button
                              className="btn btn-ghost btn-xs text-error"
                              onClick={() =>
                                item.data.isPlaceholder
                                  ? deletePlaceholder(item.data.type)
                                  : deleteItem(item.id)
                              }
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
        </div>
      </div >
    </>
  );
}

"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  faCog,
  faFileImport,
  faInfoCircle,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { getCourseTypes as getCourseTypesUtil } from "../../../../lib/course-utils";
import {
  buildCategoryKeptCountMap,
  buildComponentMap,
  calculateRequiredForTarget,
  calculateSchemeGradeDetails,
  computeTypeStats,
  sortCourseItems,
} from "../../../../lib/grade-utils";
import { sendTelemetry } from "../../../../lib/telemetry";
import type { Course, ItemFormData } from "../../../../lib/types";
import GoalInput from "../../../components/features/GoalInput";
import GradeTable from "../../../components/features/grades/GradeTable";
import GradingSettingsModal from "../../../components/features/grades/GradingSettingsModal";
import ImportGradesModal from "../../../components/features/grades/ImportGradesModal";
import SchemeSelector from "../../../components/features/grades/SchemeSelector";
import TypeStatsTable from "../../../components/features/grades/TypeStatsTable";
import ItemFormModal from "../../../components/features/ItemFormModal";
import { Item, useCourses } from "../../../contexts/CourseContext";
import { useLoading } from "../../../contexts/LoadingContext";

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
  const baseCourseItems = useMemo(() => {
    return items
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
            item?.data &&
              item.data.weight !== undefined &&
              item.data.weight !== null
              ? item.data.weight
              : "0",
        };
        return {
          ...item,
          data,
        } as Item;
      });
  }, [items, id]);

  // We'll compute `courseItems` (the sorted list) after we build
  // `componentMap` and `categoryKeptCountMap` below to avoid accessing
  // those maps before initialization.

  const placeholderItems = useMemo(() => {
    return Object.entries(placeholderGrades).map(
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
  }, [placeholderGrades, id]);

  const [showGradingSettings, setShowGradingSettings] = useState(false);
  const [dropLowest, setDropLowest] = useState<Record<string, number>>({});

  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [itemData, setItemData] = useState<ItemFormData>({
    course_id: (id as string) || "",
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

  function getCourseTypes(): string[] {
    const course = selectedCourse || null;
    return getCourseTypesUtil(course as Course | null);
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
    } catch {
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
      course_id: (id as string) || "",
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
      course_id: (id as string) || "",
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
      course_id: (id as string) || "",
      name: item.data.name || "",
      type: item.data.type || "Assignment",
      grade: item.data.grade || "",
      max_grade: item.data.isPlaceholder ? "100" : item.data.max_grade || "",
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
  const { bestScheme, bestOriginalIndex } = useMemo(() => {
    let bestScheme: any[] | null = null;
    let bestOriginalIndex: number | null = null;
    if (selectedCourse?.data["marking-schemes"]?.length > 0) {
      let bestGrade = -1;

      selectedCourse.data["marking-schemes"].forEach(
        (scheme: any[], idx: number) => {
          const details = calculateSchemeGradeDetails(
            scheme,
            baseCourseItems,
            placeholderGrades,
            dropLowest,
          );
          if (
            details.currentGrade !== null &&
            details.currentGrade > bestGrade
          ) {
            bestGrade = details.currentGrade;
            bestScheme = scheme;
            bestOriginalIndex = idx;
          }
        },
      );
    }
    return { bestScheme, bestOriginalIndex };
  }, [
    selectedCourse?.data,
    baseCourseItems,
    placeholderGrades,
    dropLowest,
  ]);

  const preferredScheme = selectedCourse?.data?.["preferred-marking-scheme"];

  // If no active scheme chosen by user, default to best scheme
  useEffect(() => {
    // Prefer persisted preferred-marking-scheme if present
    if (activeSchemeIndex === null) {
      if (preferredScheme !== undefined && preferredScheme !== null) {
        const parsedPref =
          typeof preferredScheme === "number"
            ? preferredScheme
            : parseInt(preferredScheme, 10);
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
  }, [bestOriginalIndex, selectedCourse?.id, preferredScheme]);

  // Use the active scheme (selected by user) if available, otherwise fallback to bestScheme
  const usedScheme = useMemo(() => {
    return activeSchemeIndex !== null && selectedCourse?.data["marking-schemes"]
      ? selectedCourse.data["marking-schemes"][activeSchemeIndex]
      : bestScheme;
  }, [activeSchemeIndex, selectedCourse?.data, bestScheme]);

  const usedDetails = useMemo(() => {
    return usedScheme && selectedCourse
      ? calculateSchemeGradeDetails(
        usedScheme,
        baseCourseItems,
        placeholderGrades,
        dropLowest,
      )
      : null;
  }, [usedScheme, selectedCourse, baseCourseItems, placeholderGrades, dropLowest]);

  const usedDroppedItemIds = usedDetails?.droppedItemIds || [];

  const componentMap = useMemo(() => buildComponentMap(usedScheme), [usedScheme]);
  const categoryKeptCountMap = useMemo(() => buildCategoryKeptCountMap(
    usedScheme,
    baseCourseItems,
    dropLowest,
  ), [usedScheme, baseCourseItems, dropLowest]);

  const courseItems = useMemo(() => sortCourseItems(
    baseCourseItems,
    componentMap,
    categoryKeptCountMap,
  ), [baseCourseItems, componentMap, categoryKeptCountMap]);

  const displayItems = useMemo(() => [...placeholderItems, ...courseItems], [placeholderItems, courseItems]);
  const hasDueDates = useMemo(() => displayItems.some((item) => item.data.due_date), [displayItems]);

  async function handleSaveTargetGrade() {
    if (!selectedCourse) return;
    const val = targetGrade === "" ? undefined : parseFloat(targetGrade);
    await updateCourseData(selectedCourse.id, { target_grade: val });
    // Telemetry - set goal
    sendTelemetry("set_goal", { course_id: selectedCourse.id, goal: val });
  }

  function calculateRequired(scheme: any[]) {
    return calculateRequiredForTarget(
      scheme,
      targetGrade,
      courseItems,
      placeholderGrades,
      dropLowest,
    );
  }

  const allTypes = useMemo(() => getCourseTypes(), [selectedCourse]);

  if (!selectedCourse) return null;

  // Compute per-type aggregates for the "Item Types Averages" table
  const showRemaining = allTypes.length > 1;

  const typeStats = useMemo(() => computeTypeStats(
    usedScheme ? usedScheme.map((c: any) => c.Component) : allTypes,
    displayItems,
    componentMap,
    categoryKeptCountMap,
    usedDroppedItemIds,
  ), [usedScheme, allTypes, displayItems, componentMap, categoryKeptCountMap, usedDroppedItemIds]);

  return (
    <>
      <ImportGradesModal
        isOpen={isImporting}
        onClose={() => setIsImporting(false)}
        importStep={importStep}
        importText={importText}
        setImportText={setImportText}
        parsedItems={parsedItems}
        categoryMapping={categoryMapping}
        setCategoryMapping={setCategoryMapping}
        treatZeroAsEmpty={treatZeroAsEmpty}
        setTreatZeroAsEmpty={setTreatZeroAsEmpty}
        getCourseTypes={getCourseTypes}
        onParse={handleImportParse}
        onConfirm={handleImportConfirm}
      />

      <GradingSettingsModal
        isOpen={showGradingSettings}
        onClose={() => setShowGradingSettings(false)}
        onSave={handleSaveGradingSettings}
        dropLowest={dropLowest}
        setDropLowest={setDropLowest}
        placeholderGrades={placeholderGrades}
        setPlaceholderGrades={setPlaceholderGrades}
        getCourseTypes={getCourseTypes}
        courseItems={courseItems}
      />

      <ItemFormModal
        isOpen={isAddingItem}
        onClose={() => setIsAddingItem(false)}
        onSave={handleSaveItem}
        editingItem={editingItem}
        addingItemCourseId={id as string}
        itemData={itemData}
        setItemData={setItemData}
        getCourseTypes={() => getCourseTypes()}
        courses={courses}
      />

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
                title="Grading settings"
              >
                <FontAwesomeIcon icon={faCog} /> Grading
              </button>
              <button
                className="btn btn-soft btn-md flex-1 sm:flex-none"
                onClick={() => setIsImporting(true)}
                title="Import grades"
              >
                <FontAwesomeIcon icon={faFileImport} /> Import
              </button>
              <button
                className="btn btn-primary btn-md flex-1 sm:flex-none"
                onClick={openAddItem}
                title="Add item"
              >
                <FontAwesomeIcon icon={faPlus} /> Add
              </button>
            </div>
          </div>
          {selectedCourse.data["marking-schemes"]?.length > 0 &&
            displayItems.length > 0 && (
              <SchemeSelector
                schemes={selectedCourse.data["marking-schemes"]}
                bestOriginalIndex={bestOriginalIndex}
                activeSchemeIndex={activeSchemeIndex}
                setActiveSchemeIndex={setActiveSchemeIndex}
                calculateDetails={(scheme) =>
                  calculateSchemeGradeDetails(
                    scheme,
                    courseItems,
                    placeholderGrades,
                    dropLowest,
                  )
                }
                calculateRequired={(scheme) => calculateRequired(scheme)}
                getCourseTypes={getCourseTypes}
                onSelectPersist={async (index: number) => {
                  if (!selectedCourse) return;
                  await updateCourseData(selectedCourse.id, {
                    "preferred-marking-scheme": index,
                  });
                  sendTelemetry("select_marking_scheme", {
                    course_id: selectedCourse.id,
                    scheme_index: index,
                  });
                }}
              />
            )}

          <TypeStatsTable
            stats={typeStats}
            showRemaining={showRemaining}
            getCourseTypes={getCourseTypes}
          />

          <GradeTable
            items={displayItems}
            hasDueDates={hasDueDates}
            usedDroppedItemIds={usedDroppedItemIds}
            componentMap={componentMap}
            categoryKeptCountMap={categoryKeptCountMap}
            getCourseTypes={getCourseTypes}
            onEditItem={(item) => openEditItem(item)}
            onDuplicateItem={(item) => duplicateItem(item)}
            onDeleteItem={(item) =>
              item.data.isPlaceholder
                ? deletePlaceholder(item.data.type)
                : deleteItem(item.id)
            }
          />
        </div>
      </div>
    </>
  );
}

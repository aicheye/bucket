/* eslint-disable @typescript-eslint/no-explicit-any */
import { Course, Item } from "../app/contexts/CourseContext";
import { GPA_SCALE, GRADE_CUTOFFS } from "./constants";

export function calculateSchemeGradeDetails(
  scheme: any[],
  courseItems: Item[],
  placeholderGrades: Record<string, number>,
  dropLowest: Record<string, number>,
  bonusPercent?: number,
) {
  let totalWeightGraded = 0;
  let totalScore = 0;
  let totalSchemeWeight = 0;
  let totalWeightCompleted = 0;
  const droppedItemIds: string[] = [];

  scheme.forEach((component) => {
    const weight = parseFloat(component.Weight);
    if (isNaN(weight)) return;
    totalSchemeWeight += weight;

    const compItems = courseItems.filter(
      (i) =>
        i.data.type === component.Component && i.data.grade && i.data.max_grade,
    );

    // Calculate weight completed based on counted items
    const allCompItems = courseItems.filter(
      (i) => i.data.type === component.Component,
    );
    const totalItemsCount = allCompItems.length;
    const dropCount = dropLowest[component.Component] || 0;
    const maxCounted = Math.max(totalItemsCount - dropCount, 0);
    const markedItemsCount = compItems.length;

    if (compItems.length === 0) {
      // Use placeholder if available
      const placeholder = placeholderGrades[component.Component];
      if (placeholder !== undefined && !isNaN(placeholder)) {
        totalScore += (placeholder / 100) * weight;
        totalWeightGraded += weight;
        totalWeightCompleted += weight;
      }
      return;
    }

    if (maxCounted > 0) {
      const effectiveCount = Math.min(markedItemsCount, maxCounted);
      totalWeightCompleted += weight * (effectiveCount / maxCounted);
    }

    const scores = compItems.map((i) => {
      const g = parseFloat(i.data.grade || "0");
      const m = parseFloat(i.data.max_grade || "0");
      return { id: i.id, grade: g, max: m, ratio: m > 0 ? g / m : 0 };
    });

    // Sort by ratio ascending (worst first)
    scores.sort((a, b) => a.ratio - b.ratio);

    // Identify dropped items
    for (let i = 0; i < dropCount && i < scores.length; i++) {
      droppedItemIds.push(scores[i].id);
    }

    const keptScores = scores.slice(dropCount);

    if (keptScores.length === 0) {
      if (scores.length > 0) {
        // All items were dropped, treat as 100%
        totalScore += weight;
        totalWeightGraded += weight;
        // If we treat it as 100% graded for score, maybe we should for completion too?
        // But based on user request, we use the counted logic above.
        // If maxCounted is 0, totalWeightCompleted is 0.
      }
      return;
    }

    // Calculate component score
    const sumGrade = keptScores.reduce((acc, s) => acc + s.grade, 0);
    const sumMax = keptScores.reduce((acc, s) => acc + s.max, 0);

    if (sumMax > 0) {
      const componentScore = (sumGrade / sumMax) * weight;
      totalScore += componentScore;
      totalWeightGraded += weight;
    }
  });

  const baseCurrentGrade =
    totalWeightGraded > 0 ? (totalScore / totalWeightGraded) * 100 : null;

  const adjustedGrade =
    baseCurrentGrade !== null &&
    bonusPercent !== undefined &&
    !isNaN(bonusPercent)
      ? Math.min(100, baseCurrentGrade + bonusPercent)
      : baseCurrentGrade;

  const currentGrade =
    adjustedGrade !== null ? Math.max(32, adjustedGrade) : null;

  return {
    // `currentGrade` is the adjusted grade (includes bonus and 32% floor)
    currentGrade: currentGrade,
    // `baseCurrentGrade` is the grade computed from weights (no bonus)
    baseCurrentGrade: baseCurrentGrade,
    currentScore: totalScore,
    totalWeightGraded: totalWeightGraded,
    totalSchemeWeight: totalSchemeWeight,
    totalWeightCompleted: totalWeightCompleted,
    droppedItemIds: droppedItemIds,
    bonusPercent: bonusPercent,
  };
}

export function calculateSchemeGrade(
  scheme: any[],
  courseItems: Item[],
  placeholderGrades: Record<string, number>,
  dropLowest: Record<string, number>,
  bonusPercent?: number,
): number | null {
  const details = calculateSchemeGradeDetails(
    scheme,
    courseItems,
    placeholderGrades,
    dropLowest,
    bonusPercent,
  );
  return details.currentGrade;
}

export function buildComponentMap(scheme: any[] | null) {
  const componentMap = new Map<string, any>();
  if (!scheme) return componentMap;
  scheme.forEach((c) => componentMap.set(c.Component, c));
  return componentMap;
}

export function buildCategoryKeptCountMap(
  scheme: any[] | null,
  baseCourseItems: Item[],
  dropLowest: Record<string, number>,
) {
  const categoryKeptCountMap = new Map<string, number>();
  if (!scheme) return categoryKeptCountMap;

  for (const component of scheme) {
    const category = component.Component;
    const compItemsAll = baseCourseItems.filter(
      (i) => i.data.type === category,
    );

    const dropCount = dropLowest[category] || 0;
    const totalCount = Math.max(compItemsAll.length - dropCount, 0);

    if (totalCount === 0) continue;

    categoryKeptCountMap.set(category, totalCount);
  }

  return categoryKeptCountMap;
}

export function sortCourseItems(
  baseCourseItems: Item[],
  componentMap: Map<string, any>,
  categoryKeptCountMap: Map<string, number>,
) {
  return [...baseCourseItems].sort((a, b) => {
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
}

export function calculateRequiredForTarget(
  scheme: any[],
  targetGrade: string | number,
  courseItems: Item[],
  placeholderGrades: Record<string, number>,
  dropLowest: Record<string, number>,
  bonusPercent?: number,
) {
  if (targetGrade === "" || targetGrade === null || targetGrade === undefined)
    return null;
  const target =
    typeof targetGrade === "number"
      ? targetGrade
      : parseFloat(String(targetGrade));
  if (isNaN(target)) return null;

  const details = calculateSchemeGradeDetails(
    scheme,
    courseItems,
    placeholderGrades,
    dropLowest,
    bonusPercent,
  );

  // When computing required score for remaining items we must use the
  // base grade (without bonus). However, the target provided is the
  // displayed target (includes any per-course bonus applied on top),
  // so subtract the bonus for this course from the target to compute
  // the "hidden" base-target that the remaining items must achieve.
  const baseCurrent = details.baseCurrentGrade;
  const remainingWeight = details.totalSchemeWeight - details.totalWeightGraded;
  if (remainingWeight <= 0 || baseCurrent === null) return null;

  const effectiveTarget =
    typeof bonusPercent === "number" && !isNaN(bonusPercent)
      ? target - bonusPercent
      : target;

  const neededTotal =
    (effectiveTarget * details.totalSchemeWeight -
      baseCurrent * details.totalWeightGraded) /
    remainingWeight;

  return neededTotal;
}

export function computeTypeStats(
  schemeOrTypes: any[] | string[],
  displayItems: Item[],
  componentMap: Map<string, any>,
  categoryKeptCountMap: Map<string, number>,
  usedDroppedItemIds: string[],
) {
  return (
    schemeOrTypes
      ? schemeOrTypes.map((c: any) => (typeof c === "string" ? c : c.Component))
      : []
  ).map((category: string) => {
    const comp = componentMap.get(category);
    const compWeight = comp ? parseFloat(comp.Weight) || 0 : 0;
    const keptCount = Math.max(categoryKeptCountMap.get(category) || 0, 0);

    const itemsInCategory = displayItems.filter(
      (i) => i.data.type === category,
    );

    const includedItems = itemsInCategory.filter(
      (i) => !usedDroppedItemIds.includes(i.id),
    );

    const gradedItems = includedItems.filter((i) => i.data.grade !== "");

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

    const markedCount = itemsInCategory.filter(
      (i) => i.data.grade !== "" && !i.data.isPlaceholder,
    ).length;
    const remainingCount = itemsInCategory.filter(
      (i) => i.data.grade === "" && !i.data.isPlaceholder,
    ).length;

    const perItemContribution =
      markedCount > 0
        ? compWeight / (includedItems.length - remainingCount)
        : 0;
    let earnedContributionSum = 0;
    let hasAnyContribution = false;

    includedItems.forEach((it) => {
      if (it.data.isPlaceholder) {
        const g = parseFloat(it.data.grade || "0");
        const m = parseFloat(it.data.max_grade || "0");
        if (it.data.grade === "" || isNaN(g) || isNaN(m) || m === 0) return;
        earnedContributionSum = (g / m) * compWeight;
        hasAnyContribution = true;
      }
    });

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
}

export function getBestCourseGrade(
  course: Course,
  allItems: Item[],
): number | null {
  const courseItems = allItems.filter((i) => i.course_id === course.id);
  const schemes = course.data["marking-schemes"] || [];
  const placeholderGrades = course.data.placeholder_grades || {};
  const dropLowest = course.data.drop_lowest || {};

  if (
    course.data.official_grade !== undefined &&
    course.data.official_grade !== null
  ) {
    return course.data.official_grade;
  }

  if (!schemes || schemes.length === 0) return null;

  let bestGrade = -1;
  let hasGrade = false;

  for (const scheme of schemes) {
    const grade = calculateSchemeGrade(
      scheme,
      courseItems,
      placeholderGrades,
      dropLowest,
      course.data?.bonus_percent,
    );
    if (grade !== null) {
      hasGrade = true;
      if (grade > bestGrade) {
        bestGrade = grade;
      }
    }
  }

  return hasGrade ? bestGrade : null;
}

export function getCourseGradeDetails(course: Course, allItems: Item[]) {
  const courseItems = allItems.filter((i) => i.course_id === course.id);
  const schemes = course.data["marking-schemes"] || [];
  const placeholderGrades = course.data.placeholder_grades || {};
  const dropLowest = course.data.drop_lowest || {};
  // Accept either number or numeric-string for backward compatibility
  let preferredIndex: number | null = null;
  const rawPref = course.data["preferred-marking-scheme"];
  if (rawPref !== undefined && rawPref !== null) {
    const parsed =
      typeof rawPref === "number" ? rawPref : parseInt(rawPref, 10);
    preferredIndex = Number.isInteger(parsed) ? parsed : null;
  }

  if (!schemes || schemes.length === 0) {
    if (
      course.data.official_grade !== undefined &&
      course.data.official_grade !== null
    ) {
      const official = Number(course.data.official_grade);
      return {
        currentGrade: official,
        baseCurrentGrade: official,
        currentScore: official,
        totalWeightGraded: 100,
        totalSchemeWeight: 100,
        totalWeightCompleted: 100,
        droppedItemIds: [],
        bonusPercent: 0,
      };
    }
    return null;
  }

  const enforceOfficial = (d: any) => {
    if (
      course.data.official_grade !== undefined &&
      course.data.official_grade !== null
    ) {
      const official = Number(course.data.official_grade);
      const weight = d.totalSchemeWeight || 100;
      return {
        ...d,
        currentGrade: official,
        currentScore: (official / 100) * weight,
        // Ensure it looks completed
        totalWeightGraded: weight,
        totalWeightCompleted: weight,
        totalSchemeWeight: weight,
        bonusPercent: 0,
      };
    }
    return d;
  };

  // If a preferred scheme index is set and valid, use it
  if (
    preferredIndex !== null &&
    Number.isInteger(preferredIndex) &&
    preferredIndex >= 0 &&
    preferredIndex < schemes.length
  ) {
    return enforceOfficial(
      calculateSchemeGradeDetails(
        schemes[preferredIndex],
        courseItems,
        placeholderGrades,
        dropLowest,
        course.data?.bonus_percent,
      ),
    );
  }

  // Otherwise, fall back to the best scheme (highest current grade)
  let bestDetails = null;
  let bestGrade = -1;

  for (const scheme of schemes) {
    const details = calculateSchemeGradeDetails(
      scheme,
      courseItems,
      placeholderGrades,
      dropLowest,
      course.data?.bonus_percent,
    );
    if (details.currentGrade !== null) {
      if (details.currentGrade > bestGrade) {
        bestGrade = details.currentGrade;
        bestDetails = details;
      }
    }
  }

  if (bestDetails) {
    return enforceOfficial(bestDetails);
  }

  // If no grades found in any scheme, return details for the first scheme (or preferred)
  if (schemes.length > 0) {
    const schemeIndex =
      preferredIndex !== null &&
      Number.isInteger(preferredIndex) &&
      preferredIndex >= 0 &&
      preferredIndex < schemes.length
        ? preferredIndex
        : 0;
    const details = calculateSchemeGradeDetails(
      schemes[schemeIndex],
      courseItems,
      placeholderGrades,
      dropLowest,
      course.data?.bonus_percent,
    );
    return enforceOfficial(details);
  }

  if (
    course.data.official_grade !== undefined &&
    course.data.official_grade !== null
  ) {
    return enforceOfficial({
      currentGrade: null,
      baseCurrentGrade: null,
      currentScore: 0,
      totalWeightGraded: 0,
      totalSchemeWeight: 100,
      totalWeightCompleted: 0,
      droppedItemIds: [],
      bonusPercent: 0,
    });
  }

  return null;
}

/**
 * Convert a percentage grade to a 4.0 GPA scale using standard grade cutoffs
 * @param grade - The percentage grade (0-100)
 * @returns The GPA value on a 4.0 scale
 */
export function gradeToGPA(grade: number): number {
  if (grade >= GRADE_CUTOFFS.A_PLUS) return GPA_SCALE.A_PLUS;
  if (grade >= GRADE_CUTOFFS.A) return GPA_SCALE.A;
  if (grade >= GRADE_CUTOFFS.A_MINUS) return GPA_SCALE.A_MINUS;
  if (grade >= GRADE_CUTOFFS.B_PLUS) return GPA_SCALE.B_PLUS;
  if (grade >= GRADE_CUTOFFS.B) return GPA_SCALE.B;
  if (grade >= GRADE_CUTOFFS.B_MINUS) return GPA_SCALE.B_MINUS;
  if (grade >= GRADE_CUTOFFS.C_PLUS) return GPA_SCALE.C_PLUS;
  if (grade >= GRADE_CUTOFFS.C) return GPA_SCALE.C;
  if (grade >= GRADE_CUTOFFS.C_MINUS) return GPA_SCALE.C_MINUS;
  if (grade >= GRADE_CUTOFFS.D_PLUS) return GPA_SCALE.D_PLUS;
  if (grade >= GRADE_CUTOFFS.D) return GPA_SCALE.D;
  if (grade >= GRADE_CUTOFFS.D_MINUS) return GPA_SCALE.D_MINUS;
  return GPA_SCALE.F;
}

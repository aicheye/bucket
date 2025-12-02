/**
 * Course utility functions
 */

import { SEASON_ORDER, CATEGORY_COLORS } from "./constants";
import type { Course } from "./types";

/**
 * Groups courses by term folder
 */
export function groupCoursesByTerm(courses: Course[]): {
  groupedCourses: Record<string, Course[]>;
  sortedFolders: string[];
} {
  if (!courses || courses.length === 0) {
    return { groupedCourses: {}, sortedFolders: [] };
  }

  const grouped: Record<string, Course[]> = {};
  courses.forEach((course) => {
    const folder = course.term || "Uncategorized";
    if (!grouped[folder]) grouped[folder] = [];
    grouped[folder].push(course);
  });

  const sorted = Object.keys(grouped).sort((a, b) => {
    if (a === "Uncategorized") return 1;
    if (b === "Uncategorized") return -1;

    const partsA = a.split(" ");
    const partsB = b.split(" ");

    if (partsA.length === 2 && partsB.length === 2) {
      const [seasonA, yearA] = partsA;
      const [seasonB, yearB] = partsB;

      const yA = parseInt(yearA);
      const yB = parseInt(yearB);

      if (yA !== yB) return yB - yA; // Descending year

      const sA = SEASON_ORDER[seasonA] || 99;
      const sB = SEASON_ORDER[seasonB] || 99;

      return sB - sA; // Descending season
    }
    return b.localeCompare(a);
  });

  return { groupedCourses: grouped, sortedFolders: sorted };
}

/**
 * Get component types from marking schemes
 */
export function getCourseTypes(course: Course | null): string[] {
  if (!course) return ["Assignment", "Exam", "Quiz", "Project", "Other"];

  const schemes = course.data["marking-schemes"] || [];
  const types = Array.from(
    new Set(schemes.flat().map((s) => s.Component)),
  ).filter(Boolean);

  if (types.length === 0) {
    return ["Assignment", "Exam", "Quiz", "Project", "Other"];
  }

  return types;
}

/**
 * Get category color based on type and position
 */
export function getCategoryColor(name: string, types: string[]): string {
  if (!name || !types) {
    return CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)];
  }

  const sorted = [...types].sort();
  const index = sorted.indexOf(name);

  let hash = 0;
  const s = String(types[0]);
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  const offset = Math.abs(hash) % CATEGORY_COLORS.length;

  if (index === -1) return CATEGORY_COLORS[offset];
  return CATEGORY_COLORS[(index + offset) % CATEGORY_COLORS.length];
}

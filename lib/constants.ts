/**
 * Application-wide constants
 */

// App name and version
export const APP_NAME: string = "Bucket";
export const APP_VERSION: string = "alpha 2";

// defaults
export const DEFAULT_COURSE_VIEW = "grades";
export const DEFAULT_CALENDAR_VIEW = "week";

// Season ordering for term sorting
export const SEASON_ORDER: Record<string, number> = {
  Winter: 1,
  Spring: 2,
  Summer: 3,
  Fall: 4,
};

// Grade cutoffs for GPA calculation
export const GRADE_CUTOFFS = {
  A_PLUS: 90,
  A: 85,
  A_MINUS: 80,
  B_PLUS: 77,
  B: 73,
  B_MINUS: 70,
  C_PLUS: 67,
  C: 63,
  C_MINUS: 60,
  D_PLUS: 57,
  D: 53,
  D_MINUS: 50,
} as const;

// GPA mappings
export const GPA_SCALE: Record<string, number> = {
  A_PLUS: 4.0,
  A: 3.9,
  A_MINUS: 3.5,
  B_PLUS: 3.3,
  B: 3.0,
  B_MINUS: 2.7,
  C_PLUS: 2.3,
  C: 2.0,
  C_MINUS: 1.7,
  D_PLUS: 1.3,
  D: 1.0,
  D_MINUS: 0.7,
  F: 0.0,
} as const;

// Category colors for component badges
export const CATEGORY_COLORS = [
  "bg-red-600",
  "bg-amber-600",
  "bg-green-600",
  "bg-teal-600",
  "bg-blue-600",
  "bg-purple-600",
] as const;

// Default item types when no marking scheme exists
export const DEFAULT_ITEM_TYPES = [
  "Assignment",
  "Exam",
  "Quiz",
  "Project",
  "Other",
] as const;

// Passing grade threshold
export const PASSING_GRADE = 50;

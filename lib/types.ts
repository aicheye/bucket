/**
 * Shared type definitions for the application
 */

// Re-export types that are currently in course-context
// These will be moved here eventually to centralize all types

export interface Course {
  id: string;
  code: string;
  term: string;
  credits: number;
  sections: Record<string, string>;
  data: {
    description: string;
    "schedule-info"?: ScheduleItem[];
    "marking-schemes"?: MarkingScheme[][];
    outline_url?: string;
    drop_lowest?: Record<string, number>;
    placeholder_grades?: Record<string, number>;
    target_grade?: number;
    official_grade?: number;
    "preferred-marking-scheme"?: number | string;
    term_goals?: Record<string, string>;
    [key: string]: unknown;
  };
}

export interface Item {
  id: string;
  course_id: string;
  owner_id: string;
  data: ItemData;
  last_modified: string;
}

export interface ItemData {
  name: string;
  type: string;
  grade?: string;
  max_grade?: string;
  weight?: string;
  isPlaceholder?: boolean;
  due_date?: string;
  [key: string]: unknown;
}

export interface ScheduleItem {
  Component: string;
  Section: string;
  "Days of Week"?: string[];
  "Meet Dates"?: string[];
  "Start Time": TimeObject | string;
  "End Time": TimeObject | string;
  Location?: string;
  Instructors?: string;
  [key: string]: unknown;
}

export interface TimeObject {
  hours: number;
  minutes: number;
}

export interface MarkingScheme {
  Component: string;
  Weight: string;
  [key: string]: unknown;
}

export interface GradeDetails {
  currentGrade: number | null;
  currentScore: number;
  totalWeightGraded: number;
  totalSchemeWeight: number;
  droppedItemIds: string[];
}

export interface ParsedImportItem {
  name: string;
  category: string;
  grade: number;
  max: number;
  type: string;
}

export interface ModalState {
  isOpen: boolean;
  message: string;
}

export interface UserData {
  term_goals?: Record<string, string>;
  [key: string]: unknown;
}

// Form data interfaces
export interface ItemFormData {
  course_id?: string;
  name: string;
  type: string;
  grade: string;
  max_grade: string;
  due_date: string;
  isPlaceholder: boolean;
}

export interface CourseFormData {
  code: string;
  term: string;
  credits: number;
}

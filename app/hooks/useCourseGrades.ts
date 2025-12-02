/**
 * Custom hook for course grade calculations
 */

import { useMemo } from "react";
import {
  getBestCourseGrade,
  getCourseGradeDetails,
} from "../../lib/grade-utils";
import { logger } from "../../lib/logger";
import type { Course, Item } from "../../lib/types";

export function useCourseGrades(course: Course | null, items: Item[]) {
  return useMemo(() => {
    if (!course) return null;
    logger.debug("Calculating course grades", {
      courseId: course.id,
      itemCount: items.length,
    });
    return getCourseGradeDetails(course, items);
  }, [course, items]);
}

export function useBestCourseGrade(course: Course | null, items: Item[]) {
  return useMemo(() => {
    if (!course) return null;
    logger.debug("Calculating best course grade", {
      courseId: course.id,
      itemCount: items.length,
    });
    return getBestCourseGrade(course, items);
  }, [course, items]);
}

/**
 * Test skeleton for course grade hooks
 *
 * @jest-environment jsdom
 */
// describe("useCourseGrades", () => {
//   it("should calculate course grade details", () => {
//     // TODO: Implement test
//   });
//
//   it("should return null for invalid course", () => {
//     // TODO: Implement test
//   });
//
//   it("should memoize calculations", () => {
//     // TODO: Implement test
//   });
// });
//
// describe("useBestCourseGrade", () => {
//   it("should find best scheme grade", () => {
//     // TODO: Implement test
//   });
// });

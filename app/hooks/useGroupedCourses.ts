/**
 * Custom hook for grouping and sorting courses by term
 */

import { useMemo } from "react";
import { groupCoursesByTerm } from "../../lib/course-utils";
import { logger } from "../../lib/logger";
import type { Course } from "../../lib/types";

export function useGroupedCourses(courses: Course[]) {
  return useMemo(() => {
    logger.debug("Grouping courses by term", { courseCount: courses.length });
    return groupCoursesByTerm(courses);
  }, [courses]);
}

/**
 * Test skeleton for useGroupedCourses
 *
 * @jest-environment jsdom
 */
// describe("useGroupedCourses", () => {
//   it("should group courses by term", () => {
//     // TODO: Implement test
//   });
//
//   it("should sort folders in descending order", () => {
//     // TODO: Implement test
//   });
//
//   it("should handle empty courses array", () => {
//     // TODO: Implement test
//   });
// });

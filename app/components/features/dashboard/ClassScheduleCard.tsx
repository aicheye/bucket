/**
 * Class schedule card with day navigation
 */

import {
  faChevronLeft,
  faChevronRight,
  faClock,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { formatTime } from "../../../../lib/format-utils";
import type { Course } from "../../../../lib/types";
import Card from "../../ui/Card";

interface ClassItem {
  courseCode: string;
  courseId: string;
  Component: string;
  Section: string;
  "Start Time": { hours: number; minutes: number } | string;
  "End Time": { hours: number; minutes: number } | string;
  Location: string;
}

interface ClassScheduleCardProps {
  classes: ClassItem[];
  selectedDate: Date;
  onPrevDay: () => void;
  onNextDay: () => void;
  onResetToday: () => void;
  onNavigateToCourse: (courseId: string, course: Course | null) => void;
  courses: Course[];
}

export default function ClassScheduleCard({
  classes,
  selectedDate,
  onPrevDay,
  onNextDay,
  onResetToday,
  onNavigateToCourse,
  courses,
}: ClassScheduleCardProps) {
  return (
    <Card shadow="sm" className="h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="card-title text-sm uppercase opacity-70 m-0 flex items-center gap-2">
          <FontAwesomeIcon icon={faClock} className="mr-2" aria-hidden="true" />
          <span>
            CLASSES (
            {selectedDate
              .toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
              .toUpperCase()}
            )
          </span>
        </h3>
        <div className="flex items-center gap-0.5">
          <button
            className="btn btn-xs btn-circle btn-ghost"
            onClick={(e) => {
              e.preventDefault();
              onPrevDay();
            }}
            title="Previous day"
            aria-label="Previous day"
          >
            <FontAwesomeIcon icon={faChevronLeft} aria-hidden="true" />
          </button>
          <button
            className="btn btn-xs btn-ghost text-sm"
            onClick={(e) => {
              e.preventDefault();
              onResetToday();
            }}
            title="Today (click to reset)"
          >
            Today
          </button>
          <button
            className="btn btn-xs btn-circle btn-ghost"
            onClick={(e) => {
              e.preventDefault();
              onNextDay();
            }}
            title="Next day"
            aria-label="Next day"
          >
            <FontAwesomeIcon icon={faChevronRight} aria-hidden="true" />
          </button>
        </div>
      </div>
      {classes.length > 0 ? (
        <div className="flex flex-col h-full gap-2">
          {classes.slice(0, 6).map((cls, i) => (
            <Link
              href={`/courses/${cls.courseId}`}
              key={i}
              className="flex-grow max-h-[6rem] items-center gap-3 p-3 card flex-row bg-base-200 hover:bg-base-300 transition-colors shadow-sm"
              onClick={(e) => {
                try {
                  e.preventDefault();
                  const c = courses.find((x) => x.id === cls.courseId) || null;
                  onNavigateToCourse(cls.courseId, c);
                } catch {
                  // ignore
                }
              }}
            >
              <div className="flex-1">
                <div className="font-bold text-sm">{cls.courseCode}</div>
                <div className="text-xs opacity-70">
                  {cls.Component} {cls.Section}
                </div>
              </div>
              <div className="text-right text-xs font-mono">
                <div className="flex gap-2">
                  <span>{formatTime(cls["Start Time"])}</span>
                  <span className="lg:block hidden">
                    {" "}
                    - {formatTime(cls["End Time"])}
                  </span>
                </div>
                <div className="opacity-50">{cls.Location}</div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-sm opacity-50 italic">No classes today.</div>
      )}
    </Card>
  );
}

/**
 * Test skeleton for ClassScheduleCard
 *
 * @jest-environment jsdom
 */
// describe("ClassScheduleCard", () => {
//   it("should display classes for selected date", () => {
//     // TODO: Implement test
//   });
//
//   it("should handle day navigation", () => {
//     // TODO: Implement test
//   });
//
//   it("should show empty state when no classes", () => {
//     // TODO: Implement test
//   });
//
//   it("should limit display to 6 classes", () => {
//     // TODO: Implement test
//   });
//
//   it("should format times correctly", () => {
//     // TODO: Implement test
//   });
// });

/**
 * Upcoming deliverables card
 */

import {
  faCalendarDay,
  faPencil,
  faPlus,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import type { Course, Item } from "../../../../lib/types";
import Card from "../../ui/Card";

interface DeliverableItemExtended extends Item {
  courseCode?: string;
}

interface DeliverablesCardProps {
  deliverables: DeliverableItemExtended[];
  onAddDeliverable: () => void;
  onEditDeliverable: (item: Item) => void;
  onDeleteDeliverable: (itemId: string) => void;
  onNavigateToCourse: (courseId: string, course: Course | null) => void;
  courses: Course[];
}

export default function DeliverablesCard({
  deliverables,
  onAddDeliverable,
  onEditDeliverable,
  onDeleteDeliverable,
  onNavigateToCourse,
  courses,
}: DeliverablesCardProps) {
  return (
    <Card shadow="sm" className="h-full">
      <div className="flex justify-between items-center mb-2">
        <h3 className="card-title text-sm uppercase opacity-70">
          <FontAwesomeIcon icon={faCalendarDay} className="mr-2" />
          Upcoming Deliverables
        </h3>
        <button
          className="btn btn-xs btn-circle btn-primary"
          onClick={onAddDeliverable}
          title="Add deliverable"
          aria-label="Add deliverable"
        >
          <FontAwesomeIcon icon={faPlus} aria-hidden="true" />
        </button>
      </div>
      {deliverables.length > 0 ? (
        <div className="flex flex-col h-full gap-2">
          {deliverables.slice(0, 6).map((item) => (
            <div
              key={item.id}
              className="flex-grow max-h-[6rem] items-center gap-3 p-3 card flex-row bg-base-200 hover:bg-base-300 transition-colors shadow-sm"
            >
              <Link
                href={`/courses/${item.course_id}?view=grades`}
                className="flex-1 justify-between flex items-center gap-3"
                onClick={(e) => {
                  e.preventDefault();
                  const c =
                    courses.find((x) => x.id === item.course_id) || null;
                  onNavigateToCourse(item.course_id, c);
                }}
              >
                <div className="">
                  <div className="font-bold text-sm">{item.data.name}</div>
                  <div className="text-xs opacity-70">{item.courseCode}</div>
                </div>
                <div className="text-right text-xs min-w-fit">
                  <div className="font-bold text-error min-w-fit">
                    {new Date(item.data.due_date!).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </Link>
              <div className="flex gap-1">
                <button
                  className="btn btn-xs btn-circle btn-ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    onEditDeliverable(item);
                  }}
                  aria-label="Edit deliverable"
                  title="Edit deliverable"
                >
                  <FontAwesomeIcon icon={faPencil} aria-hidden="true" />
                </button>
                <button
                  className="btn btn-xs btn-circle btn-ghost text-error"
                  onClick={(e) => {
                    e.preventDefault();
                    onDeleteDeliverable(item.id);
                  }}
                  aria-label="Delete deliverable"
                  title="Delete deliverable"
                >
                  <FontAwesomeIcon icon={faTrash} aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm opacity-50 italic">
          No upcoming deliverables.
        </div>
      )}
    </Card>
  );
}

/**
 * Test skeleton for DeliverablesCard
 *
 * @jest-environment jsdom
 */
// describe("DeliverablesCard", () => {
//   it("should display upcoming deliverables", () => {
//     // TODO: Implement test
//   });
//
//   it("should handle add deliverable action", () => {
//     // TODO: Implement test
//   });
//
//   it("should handle edit deliverable action", () => {
//     // TODO: Implement test
//   });
//
//   it("should handle delete deliverable action", () => {
//     // TODO: Implement test
//   });
//
//   it("should show empty state when no deliverables", () => {
//     // TODO: Implement test
//   });
//
//   it("should limit display to 6 deliverables", () => {
//     // TODO: Implement test
//   });
// });

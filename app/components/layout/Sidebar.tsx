"use client";

import {
  faCircleQuestion,
  faGauge,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DEFAULT_COURSE_VIEW } from "../../../lib/constants";
import { useCourses } from "../../contexts/CourseContext";
import { useLoading } from "../../contexts/LoadingContext";
import { useAlertState } from "../../hooks/useAlertState";
import AddCourseModal from "../features/dashboard/AddCourseModal";
import GradeBadge from "../features/GradeBadge";
import Line from "../ui/Line";
import Modal from "../ui/Modal";

interface SidebarProps {
  gradesScreen: boolean;
  infoScreen: boolean;
  inDrawer?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ gradesScreen, infoScreen, inDrawer = false, onClose }: SidebarProps) {
  const {
    courses,
    addCourse,
    loading,
    items,
    courseGrades,
    setOptimisticCourse,
    isCourseCompleted,
  } = useCourses();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { alertState, showAlert, closeAlert } = useAlertState();
  const [expandedFolders, setExpandedFolders] = useState<
    Record<string, boolean>
  >({});
  const [showAddCourseModal, setShowAddCourseModal] = useState(false);

  const { showLoading, hideLoading } = useLoading();

  function toggleFolder(folder: string) {
    setExpandedFolders((prev) => {
      const isOpen = prev[folder] ?? true;
      return { ...prev, [folder]: !isOpen };
    });
  }

  function buttonClick() {
    setShowAddCourseModal(true);
  }

  function closeDrawer() {
    if (onClose) {
      onClose();
      return;
    }
    const drawerCheckbox = document.getElementById(
      "my-drawer-2",
    ) as HTMLInputElement;
    if (drawerCheckbox) {
      drawerCheckbox.checked = false;
    }
  }

  // Memoize course grouping and sorting
  const { groupedCourses, uncategorizedCourses, sortedFolders } =
    useMemo(() => {
      const grouped: Record<string, typeof courses> = {};
      const uncategorized: typeof courses = [];

      courses.forEach((course) => {
        const folder = course.term;
        if (folder) {
          if (!grouped[folder]) grouped[folder] = [];
          grouped[folder].push(course);
        } else {
          uncategorized.push(course);
        }
      });

      const seasonOrder: Record<string, number> = {
        Winter: 1,
        Spring: 2,
        Summer: 3,
        Fall: 4,
      };

      const sorted = Object.keys(grouped).sort((a, b) => {
        const partsA = a.split(" ");
        const partsB = b.split(" ");

        if (partsA.length === 2 && partsB.length === 2) {
          const [seasonA, yearA] = partsA;
          const [seasonB, yearB] = partsB;

          const yA = parseInt(yearA);
          const yB = parseInt(yearB);

          if (yA !== yB) return yB - yA; // Descending year

          const sA = seasonOrder[seasonA] || 99;
          const sB = seasonOrder[seasonB] || 99;

          return sB - sA; // Descending season
        }
        return b.localeCompare(a); // Fallback to string compare descending
      });

      return {
        groupedCourses: grouped,
        uncategorizedCourses: uncategorized,
        sortedFolders: sorted,
      };
    }, [courses]);

  return (
    <div
      className="sidebar-container h-full w-64 bg-base-200 flex flex-col border-r border-base-content/10"
      style={{
        WebkitOverflowScrolling: "touch",
        overscrollBehavior: "contain",
        paddingTop: inDrawer ? 'env(safe-area-inset-top, 0px)' : undefined,
      }}
    >
      <Modal
        isOpen={alertState.isOpen}
        onClose={closeAlert}
        title="Notice"
        onConfirm={closeAlert}
        actions={
          <button className="btn" onClick={closeAlert} title="Close">
            Close
          </button>
        }
      >
        <p>{alertState.message}</p>
      </Modal>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4" style={{
        overscrollBehavior: "contain",
        paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)',
      }}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <Link
              href="/dashboard"
              onClick={closeDrawer}
              className={`btn ${pathname === "/dashboard" ? "btn-primary" : "btn-base btn-soft"} btn-sm shadow-sm justify-start h-auto py-1 font-bold text-lg`}
              title="View term dashboard"
            >
              <FontAwesomeIcon
                icon={faGauge}
                className="w-5 h-5 mr-2"
                aria-hidden="true"
              />
              Dashboard
            </Link>
            {/*
            <Link
              href={`/calendar?view=${DEFAULT_CALENDAR_VIEW}`}
              onClick={closeDrawer}
              className={`btn ${pathname === "/calendar" ? "btn-primary" : "btn-base btn-soft"} btn-sm shadow-sm justify-start h-auto py-1 font-bold text-lg`}
              title="View calendar"
            >
              <FontAwesomeIcon
                icon={faCalendar}
                className="w-5 h-5 mr-2"
                aria-hidden="true"
              />
              Calendar
            </Link>
            */}
          </div>

          <Line direction="hor" className="w-full" />

          <div className="flex flex-col sm:gap-4 gap-2">
            <div className="flex justify-between items-center">
              <h2 className="font-bold text-lg">Courses</h2>
              <button
                onClick={buttonClick}
                className="btn btn-sm btn-circle btn-primary"
                title="Add course"
                aria-label="Add course"
              >
                <FontAwesomeIcon
                  icon={faPlus}
                  className="w-4 h-4"
                  aria-hidden="true"
                />
              </button>
            </div>
            {loading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton h-16 w-full shrink-0"></div>
                ))}
              </div>
            ) : (
              <>
                {sortedFolders.map((folder) => {
                  const folderCourses = groupedCourses[folder];
                  let totalCurrent = 0;
                  let totalCurrentCredits = 0;

                  folderCourses.forEach((c) => {
                    const details = courseGrades.get(c.id);
                    if (details && details.currentGrade !== null) {
                      const credits = c.credits ?? 0.5;
                      totalCurrent += details.currentGrade * credits;
                      totalCurrentCredits += credits;
                    }
                  });

                  const avgCurrent =
                    totalCurrentCredits > 0
                      ? totalCurrent / totalCurrentCredits
                      : null;

                  return (
                    <div
                      key={folder}
                      className="collapse collapse-arrow border border-base-content/10 rounded-box"
                    >
                      <input
                        type="checkbox"
                        checked={expandedFolders[folder] ?? true}
                        onChange={() => toggleFolder(folder)}
                        className="min-h-0 p-0"
                      />
                      <div className="collapse-title bg-base-300 font-bold min-h-0 py-2 px-4 flex gap-2">
                        <div className="flex items-center gap-2 text-md">
                          {folder}
                        </div>
                        {avgCurrent !== null && (
                          <GradeBadge grade={avgCurrent} size="sm" />
                        )}
                      </div>
                      <div className="collapse-content p-0 bg-base-300">
                        <div className="card bg-base-100 flex flex-col gap-2 p-2 py-3">
                          {groupedCourses[folder].map((course) => {
                            const details = courseGrades.get(course.id);
                            const isCompleted = isCourseCompleted(course);

                            return (
                              <Link
                                key={course.id}
                                href={`/courses/${course.id}?view=${gradesScreen ? "grades" : infoScreen ? "info" : DEFAULT_COURSE_VIEW}`}
                                onClick={() => {
                                  try {
                                    setOptimisticCourse?.(course);
                                  } catch {
                                    // ignore
                                  }
                                  closeDrawer();
                                }}
                                className={`btn btn-sm shadow-sm justify-start h-auto py-2 font-normal ${pathname?.startsWith(`/courses/${course.id}`)
                                  ? "btn-primary"
                                  : "btn-base"
                                  } ${isCompleted ? "opacity-60 grayscale-[0.5]" : ""}`}
                                title="View course"
                              >
                                <div className="text-left w-full flex justify-between items-center gap-2">
                                  <div className="min-w-fit font-bold text-[14px] flex items-center gap-1 flex-1">
                                    {course.code}
                                    <div className="text-xs font-mono font-normal opacity-70">({course.credits})</div>
                                  </div>
                                  <div className="flex font-mono text-xs items-center justify-between gap-4 opacity-70">
                                    <div className="font-semibold">
                                      {details ? (
                                        details.currentGrade.toFixed(course.data.official_grade !== undefined && course.data.official_grade !== null ? 0 : 1) + "%"
                                      ) : (
                                        ""
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                      <div className="bg-base-300 p-2 pr-4 text-xs text-base-content/70 text-right w-full font-mono flex flex-col gap-1">
                        <span>
                          Total credits:{" "}
                          <span className="font-bold">
                            {folderCourses.reduce(
                              (sum, c) => sum + (c.credits || 0),
                              0,
                            )}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })}

                {uncategorizedCourses.map((course) => {
                  const details = courseGrades.get(course.id);
                  const isCompleted = isCourseCompleted(course);

                  return (
                    <Link
                      key={course.id}
                      href={`/courses/${course.id}?view=grades`}
                      onClick={() => {
                        try {
                          setOptimisticCourse?.(course);
                        } catch {
                          // ignore
                        }
                        closeDrawer();
                      }}
                      className={`btn btn-neutral bg-base-300 justify-start h-auto py-3 ${pathname?.startsWith(`/courses/${course.id}`)
                        ? "btn-primary bg-primary"
                        : ""
                        } ${isCompleted ? "opacity-60 grayscale-[0.5]" : ""}`}
                    >
                      <div className="text-left w-full text-primary-content">
                        <div className="font-bold">{course.code}</div>
                        <div className="text-xs opacity-70">{course.term}</div>
                      </div>
                    </Link>
                  );
                })}
              </>
            )}
            {!loading && courses.length === 0 && (
              <div className="text-center text-sm opacity-50">
                No courses yet. Click + to add one. Not sure how? See the{" "}
                <Link target="_blank" href="/help" className="underline">
                  help page
                </Link>
                .
              </div>
            )}
          </div>
        </div>
        <div className="flex-1"></div>
        <Link
          className="btn btn-info btn-md sm:btn-soft w-full"
          title="Help"
          aria-label="Help"
          href="/help"
          onClick={closeDrawer}
        >
          <FontAwesomeIcon
            icon={faCircleQuestion}
            className="w-5 h-5 text-lg"
            aria-hidden="true"
          />
          Help & FAQ
        </Link>
      </div>
      <AddCourseModal
        isOpen={showAddCourseModal}
        onClose={() => setShowAddCourseModal(false)}
      />
    </div>
  );
}

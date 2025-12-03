"use client";

import {
  faCalendar,
  faCircleQuestion,
  faGauge,
  faPlus,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { sendTelemetry } from "../../../lib/telemetry";
import { useCourses } from "../../contexts/CourseContext";
import { useLoading } from "../../contexts/LoadingContext";
import { useAlertState } from "../../hooks/useAlertState";
import GradeBadge from "../features/GradeBadge";
import Line from "../ui/Line";
import Modal from "../ui/Modal";
import { DEFAULT_CALENDAR_VIEW, DEFAULT_COURSE_VIEW } from "../../../lib/constants";

interface SidebarProps {
  gradesScreen: boolean;
  infoScreen: boolean;
}

export default function Sidebar({ gradesScreen, infoScreen }: SidebarProps) {
  const { courses, addCourse, loading, items, courseGrades, setOptimisticCourse } = useCourses();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { alertState, showAlert, closeAlert } = useAlertState();
  const [expandedFolders, setExpandedFolders] = useState<
    Record<string, boolean>
  >({});

  const { showLoading, hideLoading } = useLoading();

  function toggleFolder(folder: string) {
    setExpandedFolders((prev) => {
      const isOpen = prev[folder] ?? true;
      return { ...prev, [folder]: !isOpen };
    });
  }

  function buttonClick() {
    document.getElementById("outlineInput")?.click();
  }

  async function fileChange() {
    const input = document.getElementById("outlineInput") as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const text = await file.text();

    try {
      showLoading();
      const res = await fetch("/api/parse_outline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ html_text: text }),
      });

      if (!res.ok) {
        let errorMessage = `Error: ${res.status} ${res.statusText}`;
        try {
          const errorData = await res.json();
          if (errorData.error) errorMessage = errorData.error;
        } catch {
          // ignore json parse error
        }
        throw new Error(errorMessage);
      }

      const data = await res.json();

      const existingCourse = courses.find(
        (c) => c.code === data.code && c.term === data.term,
      );

      if (existingCourse) {
        showAlert(`Course ${data.code} (${data.term}) already exists.`);
        input.value = "";
        return;
      }

      if (session?.user?.id) {
        const newCourseId = await addCourse(
          data.code,
          data.term,
          data.data,
          session.user.id,
        );
        if (newCourseId) {
          router.push(`/courses/${newCourseId}`);
        }
        // Record successful outline parse and add
        sendTelemetry("parse_outline", { code: data.code, term: data.term });
      }
    } catch {
      showAlert("Failed to upload course");
    } finally {
      try {
        hideLoading();
      } catch {
        // ignore
      }
    }

    // Clear the input so the same file can be selected again if needed
    input.value = "";
  }

  function closeDrawer() {
    const drawerCheckbox = document.getElementById(
      "my-drawer-2",
    ) as HTMLInputElement;
    if (drawerCheckbox) {
      drawerCheckbox.checked = false;
    }
  }

  // Memoize course grouping and sorting
  const { groupedCourses, uncategorizedCourses, sortedFolders } = useMemo(() => {
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
      className="h-[calc(100vh-var(--navbar-height))] w-64 bg-base-200 overflow-y-auto p-4 flex flex-col border-r border-base-content/10"
      style={{ WebkitOverflowScrolling: "touch" }}
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

      <div className="flex flex-col h-full gap-4 overflow-y-auto">
        <div className="flex-1 flex flex-col gap-4">
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
          </div>

          <Line direction="hor" className="w-full" />

          <div className="flex flex-col sm:gap-4 gap-2 flex-1">
            <div className="flex justify-between items-center">
              <input
                onChange={fileChange}
                type="file"
                id="outlineInput"
                accept=".html"
                style={{ display: "none" }}
              />
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
                                  }`}
                                title="View course"
                              >
                                <div className="text-left w-full flex justify-between items-center gap-2">
                                  <div className="min-w-fit font-bold text-[14px]">
                                    {course.code}
                                  </div>
                                  <div className="flex font-mono text-xs items-center justify-between w-full gap-4 opacity-70">
                                    <div>({course.credits})</div>
                                    <div className="font-semibold">
                                      {details ? (
                                        <span>
                                          {details.currentGrade.toFixed(1)}%
                                        </span>
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

                {uncategorizedCourses.map((course) => (
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
                      }`}
                  >
                    <div className="text-left w-full text-primary-content">
                      <div className="font-bold">{course.code}</div>
                      <div className="text-xs opacity-70">{course.term}</div>
                    </div>
                  </Link>
                ))}
              </>
            )}
            {!loading && courses.length === 0 && (
              <div className="text-center text-sm opacity-50 mt-4">
                No courses yet. Click + to add one. Not sure how? See the{" "}
                <Link target="_blank" href="/help" className="underline">
                  help page
                </Link>
                .
              </div>
            )}
          </div>
        </div>
        <Link
          className="btn btn-info btn-md btn-soft"
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
    </div>
  );
}

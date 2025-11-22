"use client";

import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { getCourseGradeDetails } from "../../lib/grade-utils";
import { sendTelemetry } from "../../lib/telemetry";
import { useCourses } from "../courses/course-context";
import GradeBadge from "./grade-badge";
import Modal from "./modal";

export default function Sidebar() {
  const { courses, addCourse, loading, items } = useCourses();
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    message: string;
  }>({
    isOpen: false,
    message: "",
  });
  const [expandedFolders, setExpandedFolders] = useState<
    Record<string, boolean>
  >({});

  function toggleFolder(folder: string) {
    setExpandedFolders((prev) => ({ ...prev, [folder]: !prev[folder] }));
  }

  function closeAlert() {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
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
        setAlertState({
          isOpen: true,
          message: `Course ${data.code} (${data.term}) already exists.`,
        });
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
    } catch (error) {
      console.error("Failed to upload course:", error);
      setAlertState({
        isOpen: true,
        message:
          error instanceof Error ? error.message : "Failed to upload course",
      });
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

  // Group courses by folder
  const groupedCourses: Record<string, typeof courses> = {};
  const uncategorizedCourses: typeof courses = [];

  courses.forEach((course) => {
    const folder = course.term;
    if (folder) {
      if (!groupedCourses[folder]) groupedCourses[folder] = [];
      groupedCourses[folder].push(course);
    } else {
      uncategorizedCourses.push(course);
    }
  });

  const seasonOrder: Record<string, number> = {
    Winter: 1,
    Spring: 2,
    Summer: 3,
    Fall: 4,
  };

  const sortedFolders = Object.keys(groupedCourses).sort((a, b) => {
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

  return (
    <div className="w-64 bg-base-200 h-full overflow-y-auto p-4 flex flex-col gap-2 border-r border-base-content/10 mt-14 sm:mt-0">
      <Modal
        isOpen={alertState.isOpen}
        onClose={closeAlert}
        title="Notice"
        onConfirm={closeAlert}
        actions={
          <button className="btn" onClick={closeAlert}>
            Close
          </button>
        }
      >
        <p>{alertState.message}</p>
      </Modal>
      <input
        onChange={fileChange}
        type="file"
        id="outlineInput"
        accept=".html"
        style={{ display: "none" }}
      />
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-bold text-lg">Courses</h2>
        <button
          onClick={buttonClick}
          className="btn btn-sm btn-circle btn-primary"
          title="Add Course"
        >
          <FontAwesomeIcon icon={faPlus} className="w-4 h-4" />
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
            let countCurrent = 0;
            let totalMin = 0;
            let totalMax = 0;
            let countMinMax = 0;

            folderCourses.forEach((c) => {
              const details = getCourseGradeDetails(c, items);
              if (details && details.currentGrade !== null) {
                totalCurrent += details.currentGrade;
                countCurrent++;

                const min = details.currentScore;
                const max =
                  details.currentScore +
                  (details.totalSchemeWeight - details.totalWeightGraded);
                totalMin += min;
                totalMax += max;
                countMinMax++;
              }
            });

            const avgCurrent =
              countCurrent > 0 ? totalCurrent / countCurrent : null;
            const avgMin = countMinMax > 0 ? totalMin / countMinMax : null;
            const avgMax = countMinMax > 0 ? totalMax / countMinMax : null;

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
                <div className="collapse-title bg-base-300 font-bold min-h-0 py-2 px-4 flex items-center align-center gap-2">
                  <div className="flex items-center gap-2 text-md">
                    {folder}
                  </div>
                  {avgCurrent !== null && (
                    <GradeBadge grade={avgCurrent} size="sm" />
                  )}
                </div>
                <div className="collapse-content bg-base-100 p-0">
                  <div className="flex flex-col gap-2 p-2">
                    {groupedCourses[folder].map((course) => (
                      <Link
                        key={course.id}
                        href={`/courses/${course.id}/grades`}
                        onClick={closeDrawer}
                        className={`btn btn-sm shadow-sm justify-start h-auto py-2 font-normal ${
                          pathname?.startsWith(`/courses/${course.id}/`)
                            ? "btn-primary"
                            : "btn-base"
                        }`}
                      >
                        <div className="text-left w-full">
                          <div className="font-bold text-[14px]">
                            {course.code}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}

          {uncategorizedCourses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}/grades`}
              onClick={closeDrawer}
              className={`btn btn-neutral bg-base-300 justify-start h-auto py-3 ${
                pathname?.startsWith(`/courses/${course.id}/`)
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
          <a target="_blank" href="/help" className="underline">
            help page
          </a>
          .
        </div>
      )}
    </div>
  );
}

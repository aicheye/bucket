"use client";

import { faExternalLinkAlt, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { APP_NAME } from "../../../lib/constants";
import { sendTelemetry } from "../../../lib/telemetry";
import ExternalLink from "../../components/ui/ExternalLink";
import Line from "../../components/ui/Line";
import Modal from "../../components/ui/Modal";
import { useCourses } from "../../contexts/CourseContext";
import { useLoading } from "../../contexts/LoadingContext";

export default function CourseLayout({ children }: { children: ReactNode }) {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    courses,
    loading,
    deleteCourse,
    items,
    deleteItem,
    updateCourse,
    optimisticCourse,
  } = useCourses();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [credits, setCredits] = useState(0.5);
  const { showLoading, hideLoading } = useLoading();

  const selectedCourse = useMemo(() => {
    let course = courses.find((c) => c.id === id);
    // Fallback to optimistic course (set before navigation) so UI can render
    // immediately while real data finishes loading.
    if (!course && optimisticCourse && optimisticCourse.id === id) {
      course = optimisticCourse;
    }
    return course;
  }, [courses, id, optimisticCourse]);

  const isOptimisticFallback =
    !!optimisticCourse &&
    optimisticCourse.id === id &&
    !courses.some((c) => c.id === id) &&
    loading;

  useEffect(() => {
    if (selectedCourse) {
      setCredits(selectedCourse.credits ?? 0.5);
    }
  }, [selectedCourse]);

  const view = searchParams?.get("view") || "grades";
  const isGradesView = view === "grades";
  const isInfoView = view === "info";

  useEffect(() => {
    if (selectedCourse) {
      const tab = isGradesView ? "Grades" : isInfoView ? "Info" : "Grades";
      document.title = `${selectedCourse.code} (${tab}) - ${APP_NAME}`;
    } else {
      document.title = APP_NAME;
    }
  }, [selectedCourse, isGradesView, isInfoView]);

  async function handleCreditsBlur() {
    if (!selectedCourse || isNaN(credits)) return;
    if (credits === selectedCourse.credits) return;

    await updateCourse(selectedCourse.id, { credits });
    await sendTelemetry("update_course_credits", {
      course_id: selectedCourse.id,
      credits,
    });
  }

  async function handleDelete() {
    if (!selectedCourse) return;
    // Close the confirmation modal immediately to avoid it staying visible
    // while the deletion is in progress.
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    showLoading();
    try {
      // Delete all items first
      const itemsToDelete = items.filter(
        (item) => item.course_id === selectedCourse.id,
      );
      for (const item of itemsToDelete) {
        await deleteItem(item.id);
      }

      await deleteCourse(selectedCourse.id);
      await sendTelemetry("delete_course", { course_id: selectedCourse.id });
      router.push("/courses");
    } catch {
      setIsDeleting(false);
    } finally {
      try {
        hideLoading();
      } catch {
        // ignore
      }
    }
  }

  if (loading && !selectedCourse) {
    return (
      <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
        <div className="skeleton h-8 w-1/3 mb-4"></div>
        <div className="skeleton h-64 w-full rounded-box"></div>
        <div className="skeleton h-64 w-full rounded-box"></div>
      </div>
    );
  }

  if (!selectedCourse) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-base-content/70">
          Course not found
        </h2>
        <p className="text-base-content/60">
          The course you are looking for does not exist or you do not have
          permission to view it.
        </p>
        <button
          className="btn btn-primary mt-4"
          onClick={() => router.push("/courses")}
          title="Back to Courses"
        >
          Back to Courses
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        actions={
          <>
            <button
              className="btn"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
              title="Cancel"
            >
              Cancel
            </button>
            <button
              className="btn btn-error"
              onClick={handleDelete}
              disabled={isDeleting}
              title={isDeleting ? "Deleting..." : "Delete"}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </>
        }
      >
        <p>Are you sure you want to delete this course?</p>
      </Modal>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex flex-col md:flex-row gap-2 md:gap-8 items-center w-full md:w-auto">
            <div className="prose max-w-none w-full md:justify-start justify-center md:text-left text-center flex-1">
              <h1 className="lead text-xl font-bold mb-0">
                {selectedCourse.data.description}
              </h1>
              <h2 className="text-md text-base-content/70 my-0">
                {selectedCourse.code} ({selectedCourse.term})
              </h2>
            </div>

            <Line direction="ver" className="h-10 hidden md:block" />

            <div className="flex flex-row items-center gap-2 form-control card p-2 bg-base-200/50 border border-base-content/10 shadow-sm">
              <div className="relative flex items-center flex-1 sm:flex-none justify-end">
                <input
                  type="number"
                  step="0.25"
                  className="input input-sm border border-base-content/30 text-lg w-20 text-center bg-base-100 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-bold"
                  value={credits}
                  onChange={(e) => setCredits(Number(e.target.value))}
                  onBlur={handleCreditsBlur}
                />
              </div>
              <span className="text-sm font-bold uppercase tracking-wider text-base-content/50 mr-1">
                Credits
              </span>
            </div>
          </div>

          {selectedCourse.data.outline_url && (
            <>
              <Line direction="ver" className="h-10 hidden md:block" />

              <ExternalLink
                href={selectedCourse.data.outline_url}
                decorations="none"
                className="hidden md:inline-flex btn btn-soft btn-info btn-sm btn-circle shrink-0"
                title="View Original Outline"
                aria-label="View Original Outline"
              >
                <FontAwesomeIcon icon={faExternalLinkAlt} />
              </ExternalLink>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          {selectedCourse.data.outline_url && (
            <ExternalLink
              href={selectedCourse.data.outline_url}
              decorations="none"
              className="md:hidden btn btn-soft btn-info btn-sm flex-1"
              title="View original outline"
              aria-label="View original outline"
            >
              <FontAwesomeIcon icon={faExternalLinkAlt} /> Open Outline
            </ExternalLink>
          )}
          <button
            className="btn btn-error btn-soft btn-sm flex-1 md:flex-none"
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete course"
            aria-label="Delete course"
          >
            <FontAwesomeIcon icon={faTrash} /> Delete Course
          </button>
        </div>
      </div>

      <div className="flex flex-row items-center justify-center md:justify-start w-full">
        <div
          role="tablist"
          className="tabs tabs-box bg-base-200/50 p-1 gap-1 w-fit"
        >
          <Link
            role="tab"
            href={`/courses/${id}?view=info`}
            className={`tab px-8 transition-all duration-200 ${isInfoView ? "tab-active bg-base-100 shadow-sm font-bold" : "hover:bg-base-200/50"}`}
          >
            Info
          </Link>
          <Link
            role="tab"
            href={`/courses/${id}?view=grades`}
            className={`tab px-8 transition-all duration-200 ${isGradesView ? "tab-active bg-base-100 shadow-sm font-bold" : "hover:bg-base-200/50"}`}
          >
            Grades
          </Link>
        </div>

        {isOptimisticFallback && (
          <div className="flex flex-col gap-4 mb-4 max-w-5xl mx-auto w-full">
            <div className="skeleton h-8 w-1/3 mb-2"></div>
            <div className="skeleton h-48 w-full rounded-box"></div>
          </div>
        )}
      </div>

      {children}
    </div>
  );
}

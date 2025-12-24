"use client";

import {
  faExclamationTriangle,
  faExternalLinkAlt,
  faFileCode,
  faFileImport,
  faPen,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { APP_NAME } from "../../../lib/constants";
import { sendTelemetry } from "../../../lib/telemetry";
import CourseFormModal from "../../components/features/course/CourseFormModal";
import ExternalLink from "../../components/ui/ExternalLink";
import FileUploadZone from "../../components/ui/FileUploadZone";
import Line from "../../components/ui/Line";
import Modal from "../../components/ui/Modal";
import { useCourses } from "../../contexts/CourseContext";
import { useLoading } from "../../contexts/LoadingContext";

// Client component that manages dynamic title updates
function CourseLayoutContent({ children }: { children: ReactNode }) {
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
    updateCourseData,
    updateMarkingSchemes,
  } = useCourses();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showImportDetailsModal, setShowImportDetailsModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pendingImportData, setPendingImportData] = useState<any>(null);
  const [showMismatchConfirm, setShowMismatchConfirm] = useState(false);
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

  const view = searchParams?.get("view") || "grades";
  const isGradesView = view === "grades";
  const isInfoView = view === "info";

  // Update document title whenever course data or view changes
  useEffect(() => {
    if (typeof document === "undefined") return;

    let titleText = APP_NAME;

    if (selectedCourse?.code) {
      const capitalizedView = view.charAt(0).toUpperCase() + view.slice(1);
      titleText = `${selectedCourse.code} (${capitalizedView}) - ${APP_NAME}`;
    } else if (id && !loading) {
      titleText = `Course Not Found - ${APP_NAME}`;
    }

    document.title = titleText;
  }, [selectedCourse?.code, view, loading, id]);

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

  async function processImportData(data: any) {
    if (!selectedCourse) return;
    try {
      showLoading();

      if (data.data["marking-schemes"]) {
        await updateMarkingSchemes(
          selectedCourse.id,
          data.data["marking-schemes"],
        );
      }

      const { "marking-schemes": schemes, ...otherData } = data.data;
      await updateCourseData(selectedCourse.id, otherData);

      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
      const isCodeMismatch = norm(data.code) !== norm(selectedCourse.code);
      const isTermMismatch = norm(data.term) !== norm(selectedCourse.term);

      if (isCodeMismatch || isTermMismatch) {
        // If we just overwrote data despite mismatch, we should log it or just be done.
        // The warning happens BEFORE this function is called.
      }

      sendTelemetry("import_outline_details", { course_id: selectedCourse.id });
      setShowMismatchConfirm(false);
      setPendingImportData(null);
      // If the import modal was open, close it too
      setShowImportDetailsModal(false);
    } catch (err) {
      alert("Failed to import details from outline.");
    } finally {
      hideLoading();
    }
  }

  async function handleImportDetails(file: File | null) {
    if (!file || !selectedCourse) return;
    const text = await file.text();

    try {
      showLoading();
      const res = await fetch("/api/parse_outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ html_text: text }),
      });

      if (!res.ok) throw new Error("Failed to parse");
      const data = await res.json();

      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
      const isMatch =
        norm(data.code) === norm(selectedCourse.code) &&
        norm(data.term) === norm(selectedCourse.term);

      if (!isMatch) {
        setPendingImportData(data);
        setShowMismatchConfirm(true);
        return;
      }

      // If match, proceed directly
      await processImportData(data);
    } catch (err) {
      alert("Failed to import details from outline.");
    } finally {
      hideLoading();
    }
  }

  function toggleImportModal() {
    setShowImportDetailsModal(!showImportDetailsModal);
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
        isOpen={showMismatchConfirm}
        onClose={() => {
          setShowMismatchConfirm(false);
          setPendingImportData(null);
        }}
        title="Course Mismatch"
        actions={
          <>
            <button
              className="btn"
              onClick={() => {
                setShowMismatchConfirm(false);
                setPendingImportData(null);
              }}
            >
              Cancel
            </button>
            <button
              className="btn btn-warning"
              onClick={() => processImportData(pendingImportData)}
            >
              Import Anyway
            </button>
          </>
        }
      >
        <div className="py-2">
          <div className="alert alert-warning">
            <FontAwesomeIcon icon={faExclamationTriangle} />
            The outline you uploaded appears to be for a different course
          </div>
          <div className="bg-base-200 p-3 rounded-md my-2 text-sm font-mono">
            <div className="flex justify-between">
              <span className="opacity-70">Uploaded:</span>
              <span className="font-bold">
                {pendingImportData?.code} ({pendingImportData?.term})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-70">Current:</span>
              <span className="font-bold">
                {selectedCourse?.code} ({selectedCourse?.term})
              </span>
            </div>
          </div>
          <p className="text-sm opacity-80">
            Do you want to proceed? This will overwrite the current course data
            with data from the outline.
          </p>
        </div>
      </Modal>

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

      {/* Import Details Modal */}
      <Modal
        isOpen={showImportDetailsModal}
        onClose={() => setShowImportDetailsModal(false)}
        title="Import Details from Outline"
        actions={
          <button
            className="btn"
            onClick={() => setShowImportDetailsModal(false)}
          >
            Cancel
          </button>
        }
      >
        <FileUploadZone
          title="Upload Course Outline"
          description="Save the course outline as an HTML file and upload it here to update markings schemes and schedule."
          accept="text/html"
          onFileSelect={(file) => {
            handleImportDetails(file);
            if (file) setShowImportDetailsModal(false);
          }}
          icon={faFileCode}
          helpLink="/help#outlines"
          helpText="How to get outline?"
        />
      </Modal>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
        <div className="flex items-center gap-4 md:gap-8 flex-1 min-w-0">
          <div className="flex flex-col md:flex-row gap-2 md:gap-8 items-center justify-start flex-1 min-w-0">
            <div className="md:justify-start justify-center md:text-left text-center min-w-0">
              <h1
                className="lead text-xl font-bold mb-0"
                title={selectedCourse.data.description}
              >
                {selectedCourse.data.description}
              </h1>
              <h2 className="text-md text-base-content/70 my-0">
                {selectedCourse.code} ({selectedCourse.term})
              </h2>
            </div>

            <Line direction="ver" className="h-10 hidden md:block shrink-0" />

            {selectedCourse.data.outline_url && (
              <>
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

            {!selectedCourse.data.outline_url && (
              <>
                <button
                  className="hidden md:inline-flex btn btn-soft btn-secondary btn-sm btn-circle shrink-0 cursor-pointer"
                  title="Import Details from Outline"
                  onClick={toggleImportModal}
                >
                  <FontAwesomeIcon icon={faFileImport} />
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
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
          {!selectedCourse.data.outline_url && (
            <button
              className="md:hidden btn btn-soft btn-secondary btn-sm flex-1 cursor-pointer"
              onClick={toggleImportModal}
            >
              <FontAwesomeIcon icon={faFileImport} /> Import Outline
            </button>
          )}
          <button
            className="btn btn-soft btn-primary btn-sm flex-1 md:flex-none"
            onClick={() => setShowEditModal(true)}
            title="Edit course"
            aria-label="Edit course"
          >
            <FontAwesomeIcon icon={faPen} /> Edit Course
          </button>
          <button
            className="btn btn-error btn-soft btn-sm md:flex-none"
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete course"
            aria-label="Delete course"
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        </div>
      </div>

      {selectedCourse && (
        <CourseFormModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          course={selectedCourse}
        />
      )}

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

export default function CourseLayout({ children }: { children: ReactNode }) {
  return <CourseLayoutContent>{children}</CourseLayoutContent>;
}

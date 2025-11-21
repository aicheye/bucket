"use client";

import { faExternalLinkAlt, faTrash } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";
import { sendTelemetry } from "../../../lib/telemetry";
import Modal from "../../components/modal";
import { useCourses } from "../course-context";

export default function CourseLayout({ children }: { children: ReactNode }) {
    const { id } = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const { courses, loading, deleteCourse, items, deleteItem } = useCourses();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const selectedCourse = courses.find((c) => c.id === id);

    async function handleDelete() {
        if (!selectedCourse) return;
        setIsDeleting(true);
        try {
            // Delete all items first
            const itemsToDelete = items.filter(item => item.course_id === selectedCourse.id);
            for (const item of itemsToDelete) {
                await deleteItem(item.id);
            }

            await deleteCourse(selectedCourse.id);
            await sendTelemetry("delete_course", { course_id: selectedCourse.id });
            router.push("/courses");
        } catch (error) {
            console.error("Failed to delete course:", error);
            setIsDeleting(false);
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
                <h2 className="text-2xl font-bold text-base-content/70">Course not found</h2>
                <p className="text-base-content/60">The course you are looking for does not exist or you do not have permission to view it.</p>
                <button className="btn btn-primary mt-4" onClick={() => router.push("/courses")}>Back to Courses</button>
            </div>
        );
    }

    const isGradesView = pathname?.endsWith("/grades");

    return (
        <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
            <Modal
                isOpen={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                title="Delete Course"
                actions={
                    <>
                        <button className="btn" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>Cancel</button>
                        <button className="btn btn-error" onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? "Deleting..." : "Delete"}
                        </button>
                    </>
                }
            >
                <p>Are you sure you want to delete this course?</p>
            </Modal>
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-8">
                    <div className="prose max-w-none">
                        <h1 className="lead text-xl font-bold mb-0">{selectedCourse.data.description}</h1>
                        <h2 className="text-md text-base-content/70">{selectedCourse.code} ({selectedCourse.term})</h2>
                    </div>

                    <div className="border h-10 border-base-content/20"></div>

                    {selectedCourse.data.outline_url && (
                        <a
                            href={selectedCourse.data.outline_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-soft btn-info btn-sm btn-circle"
                            title="View Original Outline"
                        >
                            <FontAwesomeIcon icon={faExternalLinkAlt} className="w-4 h-4" />
                        </a>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button className="btn btn-error btn-soft btn-sm" onClick={() => setShowDeleteConfirm(true)} title="Delete Course">
                        <FontAwesomeIcon icon={faTrash} /> Delete Course
                    </button>
                </div>
            </div>

            <div role="tablist" className="tabs tabs-box bg-base-200/50 p-1 gap-1 w-fit">
                <Link role="tab" href={`/courses/${id}`} className={`tab px-8 transition-all duration-200 ${!isGradesView ? "tab-active bg-base-100 shadow-sm font-bold" : "hover:bg-base-200/50"}`}>Info</Link>
                <Link role="tab" href={`/courses/${id}/grades`} className={`tab px-8 transition-all duration-200 ${isGradesView ? "tab-active bg-base-100 shadow-sm font-bold" : "hover:bg-base-200/50"}`}>Grades</Link>
            </div>

            {children}
        </div>
    );
}

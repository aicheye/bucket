"use client";

import { faExternalLinkAlt } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";
import { useCourses } from "../course-context";

export default function CourseLayout({ children }: { children: ReactNode }) {
    const { id } = useParams();
    const router = useRouter();
    const pathname = usePathname();
    const { data: session } = useSession();
    const { courses, loading } = useCourses();

    const selectedCourse = courses.find((c) => c.id === id);

    if (loading) {
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
            <div className="prose max-w-none flex items-center gap-4">
                <h1 className="lead text-xl font-bold mb-0">{selectedCourse.data.description}</h1>
                <h2 className="text-lg text-base-content/70">{selectedCourse.code} ({selectedCourse.term})</h2>
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

            <div role="tablist" className="tabs tabs-box w-fit">
                <Link role="tab" href={`/courses/${id}`} className={`tab ${!isGradesView ? "tab-active" : ""}`}>Info</Link>
                <Link role="tab" href={`/courses/${id}/grades`} className={`tab ${isGradesView ? "tab-active" : ""}`}>Grades</Link>
            </div>

            {children}
        </div>
    );
}

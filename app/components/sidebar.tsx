"use client";

import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCourses } from "../courses/course-context";

export default function Sidebar() {
    const { courses, addCourse, loading } = useCourses();
    const { data: session } = useSession();
    const router = useRouter();
    const pathname = usePathname();

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
                } catch (e) {
                    // ignore json parse error
                }
                throw new Error(errorMessage);
            }

            const data = await res.json();

            const existingCourse = courses.find(
                (c) => c.code === data.code && c.term === data.term
            );

            if (existingCourse) {
                alert(`Course ${data.code} (${data.term}) already exists.`);
                input.value = "";
                return;
            }

            if (session?.user?.id) {
                const newCourseId = await addCourse(data.code, data.term, data.data, session.user.id);
                if (newCourseId) {
                    router.push(`/courses/${newCourseId}`);
                }
            }
        } catch (error) {
            console.error("Failed to upload course:", error);
            alert(error instanceof Error ? error.message : "Failed to upload course");
        }

        // Clear the input so the same file can be selected again if needed
        input.value = "";
    }

    return (
        <div className="w-64 bg-base-200 overflow-y-auto p-4 flex flex-col gap-2 border-r border-base-content/10">
            <input onChange={fileChange} type="file" id="outlineInput" accept=".html" style={{ display: "none" }} />
            <div className="flex justify-between items-center mb-2">
                <h2 className="font-bold text-lg">Courses</h2>
                <button onClick={buttonClick} className="btn btn-sm btn-circle btn-primary" title="Add Course">
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
                courses.map((course) => (
                    <Link
                        key={course.id}
                        href={`/courses/${course.id}`}
                        className={`btn btn-neutral bg-base-300 justify-start h-auto py-3 ${pathname === `/courses/${course.id}` ? "btn-primary bg-primary" : ""
                            }`}
                    >
                        <div className="text-left w-full text-primary-content">
                            <div className="font-bold">{course.code}</div>
                            <div className="text-xs opacity-70">{course.term}</div>
                        </div>
                    </Link>

                ))
            )}
            {!loading && courses.length === 0 && (
                <div className="text-center text-sm opacity-50 mt-4">
                    No courses yet. Click + to add one. Not sure how? See the <a target="_blank" href="/help" className="underline">help page</a>.
                </div>
            )}
        </div>
    );
}

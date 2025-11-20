"use client";

import { useSession } from "next-auth/react";
import AddCourseHelp from "../components/add-course-help";
import { useCourses } from "./course-context";

export default function CoursesPage() {
    const { status } = useSession();
    const { courses } = useCourses();

    if (status === "loading") {
        return null;
    }

    if (status === "unauthenticated") {
        return <div className="flex h-full flex-col items-center justify-center">
            <h2 className="text-2xl font-bold text-gray-400">Not authenticated</h2>
            <p className="text-gray-500">Please log in to view your courses.</p>
        </div>;
    }

    if (courses.length > 0 && status === "authenticated") {
        return <div className="flex h-full items-center justify-center flex-col">
            <h2 className="text-2xl font-bold text-gray-400">No course selected</h2>
            <p className="text-gray-500">Select a course from the sidebar or add a new one.</p>
        </div>;
    }

    return (
        <div className="h-full flex flex-col items-center justify-center">
            <div className="text-left max-w-3xl justify-center">
                <AddCourseHelp />
            </div>
        </div>
    );
}

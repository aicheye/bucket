"use client";

import AddCourseHelp from "../components/add-course-help";
import { useCourses } from "./course-context";

export default function CoursesPage() {
    const { courses } = useCourses();
    return (
        <div className="text-center h-full flex flex-col items-center justify-center">
            {courses.length > 0 ? (
                <div>
                    <h2 className="text-2xl font-bold text-gray-400">No course selected</h2>
                    <p className="text-gray-500">Select a course from the sidebar or add a new one.</p>
                </div>
            ) : (
                <div className="text-left max-w-3xl">
                    <AddCourseHelp />
                </div>
            )}
        </div>
    );
}

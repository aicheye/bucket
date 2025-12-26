import { useSession } from "next-auth/react";
import { useCourses } from "../../contexts/CourseContext";

export default function InnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const { loading: coursesLoading, courses } = useCourses();

  return (
    <div className="flex flex-col justify-start min-h-full w-full">
      <main className="p-4 sm:p-8 w-full flex-1">
        <div className="max-w-5xl mx-auto w-full flex-1">
          {(status === "loading" && !session) || (coursesLoading && courses.length === 0) ? (
            <div className="flex flex-col gap-6 mx-auto w-full">
              <div className="skeleton h-8 w-1/3 mb-4"></div>
              <div className="skeleton h-64 w-full rounded-box"></div>
              <div className="skeleton h-64 w-full rounded-box"></div>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}

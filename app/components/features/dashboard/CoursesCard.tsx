import { faBook, faCheck, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { getCourseGradeDetails } from "../../../../lib/grade-utils";
import type { Course } from "../../../contexts/CourseContext";
import GradeBadge from "../GradeBadge";

interface CoursesCardProps {
  courses: Course[];
  courseGrades: Map<string, ReturnType<typeof getCourseGradeDetails>>;
  onNavigateToCourse: (courseId: string, course: Course) => void;
  onAddItem: (courseId: string) => void;
  isCompleted: (course: Course) => boolean;
}

export default function CoursesCard({
  courses,
  courseGrades,
  onNavigateToCourse,
  onAddItem,
  isCompleted: isCompletedFunc,
}: CoursesCardProps) {
  return (
    <div className="card bg-base-100 shadow-sm col-span-1 md:col-span-3">
      <div className="card-body p-4">
        <h3 className="card-title text-sm uppercase opacity-70 mb-2 flex items-center gap-2">
          <span>
            <FontAwesomeIcon icon={faBook} className="mr-2" />
            Courses
          </span>
          <span className="badge badge-sm badge-accent px-2 py-2 items-center">
            <span className="opacity-80">Total credits:</span>{" "}
            {courses.reduce((sum, c) => sum + (c.credits || 0), 0)}
          </span>
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {courses.map((course) => {
            const details = courseGrades.get(course.id);
            const currentGrade = details?.currentGrade;
            const minRaw = details
              ? details.currentScore + (details.bonusPercent || 0)
              : 0;
            const min = Math.max(32, minRaw);
            const max = details
              ? details.currentScore +
                (details.bonusPercent || 0) +
                (details.totalSchemeWeight - details.totalWeightGraded)
              : 0;

            const isCompleted = isCompletedFunc(course);

            return (
              <Link
                key={course.id}
                href={`/courses/${course.id}`}
                className={`card bg-base-200 hover:bg-base-300 transition-colors shadow-sm ${
                  isCompleted ? "opacity-75 grayscale-[0.5]" : ""
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigateToCourse(course.id, course);
                }}
              >
                <div className="card-body p-4 flex flex-col gap-2">
                  <h2 className="card-title justify-between text-base">
                    <div className="flex gap-2 items-center">
                      {course.code}
                      <div className="text-sm font-normal opacity-70">
                        ({course.credits})
                      </div>
                      {isCompleted && (
                        <div
                          className="badge badge-success badge-sm w-5 h-5 p-0 flex items-center justify-center rounded-full"
                          title="Completed"
                        >
                          <FontAwesomeIcon
                            icon={faCheck}
                            className="text-[10px]"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {!isCompleted && (
                        <button
                          className="btn btn-xs btn-circle btn-secondary hover:opacity-100"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onAddItem(course.id);
                          }}
                          title="Quick add item"
                          aria-label="Quick add item"
                        >
                          <FontAwesomeIcon icon={faPlus} />
                        </button>
                      )}
                      {currentGrade !== null && (
                        <GradeBadge
                          grade={currentGrade}
                          size="sm"
                          toFixed={
                            course.data.official_grade !== undefined &&
                            course.data.official_grade !== null
                              ? 0
                              : 1
                          }
                        />
                      )}
                    </div>
                  </h2>
                  {details ? (
                    <div>
                      <div className="flex justify-between text-xs opacity-60 mb-1">
                        <span>Min: {min.toFixed(1)}%</span>
                        <span>Max: {max.toFixed(1)}%</span>
                      </div>
                      <div className="flex flex-col gap-1 mt-2">
                        <progress
                          className="progress progress-primary w-full h-3"
                          value={currentGrade || 0}
                          max="100"
                        ></progress>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm italic opacity-50">
                      No grades available yet.
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

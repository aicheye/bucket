"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import GradesView from "../../components/features/course/GradesView";
import InfoView from "../../components/features/course/InfoView";
import { DEFAULT_COURSE_VIEW } from "../../../lib/constants";

export default function CoursePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();

  const view = searchParams?.get("view");

  useEffect(() => {
    // If no view param is present, navigate to the default grades view for this course.
    if (!view) {
      const id = (params as { id?: string })?.id;
      if (id) {
        // use replace so back button doesn't keep the empty state
        router.replace(`/courses/${id}?view=` + DEFAULT_COURSE_VIEW);
      }
    }
  }, [view, params, router]);

  // While redirecting, render nothing (avoid setState-in-render errors)
  if (!view) return null;

  const gradesView: boolean = view === "grades";

  return gradesView ? <GradesView /> : <InfoView />;
}

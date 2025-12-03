"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { DEFAULT_CALENDAR_VIEW } from "../../lib/constants";
import { MonthlyCalendar } from "../components/features/calendar/MonthCalendar";
import { WeeklyCalendar } from "../components/features/calendar/WeekCalendar";


export default function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const view = searchParams?.get("view");
  const monthView: boolean = view === "month";
  const weekView: boolean = view === "week";

  useEffect(() => {
    if (!view) {
      // Defer navigation to avoid setState-in-render when Link or other
      // components are updating during render of this component.
      router.replace("/calendar?view=" + DEFAULT_CALENDAR_VIEW);
    }
  }, [view, router]);

  // While redirecting, render nothing to avoid setState-in-render errors
  if (!view) return null;

  return (
    <div className="flex flex-col gap-6 h-full">
      <h1 className="text-3xl font-bold">Calendar</h1>

      <div
        role="tablist"
        className="tabs tabs-box bg-base-200/50 p-1 gap-1 w-fit"
      >
        <button
          role="tab"
          onClick={() => router.push("/calendar?view=month")}
          className={`tab px-8 transition-all duration-200 ${monthView ? "tab-active bg-base-100 shadow-sm font-bold" : "hover:bg-base-200/50"}`}
        >
          Monthly
        </button>
        <button
          role="tab"
          onClick={() => router.push("/calendar?view=week")}
          className={`tab px-8 transition-all duration-200 ${weekView ? "tab-active bg-base-100 shadow-sm font-bold" : "hover:bg-base-200/50"}`}
        >
          Weekly
        </button>
      </div>

      {monthView ? <MonthlyCalendar /> : <WeeklyCalendar />}
    </div>
  );
}

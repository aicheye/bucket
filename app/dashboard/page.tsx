"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { unauthorized, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { APP_NAME } from "../../lib/constants";
import { getCourseTypes } from "../../lib/course-utils";
import { formatDateParam, getDefaultTerm, parseDateParam } from "../../lib/date-utils";
import { gradeToGPA } from "../../lib/grade-utils";
import { sendQuery } from "../../lib/graphql";
import { UPDATE_USER_DATA } from "../../lib/graphql/mutations";
import { GET_USER_FULL } from "../../lib/graphql/queries";
import { sendTelemetry } from "../../lib/telemetry";
import type { ItemFormData } from "../../lib/types";
import AddCourseHelp from "../components/features/AddCourseHelp";
import ClassScheduleCard from "../components/features/dashboard/ClassScheduleCard";
import CoursesCard from "../components/features/dashboard/CoursesCard";
import DeliverablesCard from "../components/features/dashboard/DeliverablesCard";
import TermStatsCard from "../components/features/dashboard/TermStatsCard";
import ItemFormModal from "../components/features/ItemFormModal";
import ProsePageContainer from "../components/features/ProsePageContainer";
import { Item, useCourses } from "../contexts/CourseContext";
import { useGroupedCourses } from "../hooks/useGroupedCourses";

export default function CoursesPage() {
  const { data: session, status } = useSession();
  const {
    courses,
    loading,
    items,
    courseGrades,
    addItem,
    updateItem,
    deleteItem,
    setOptimisticCourse,
    isCourseCompleted,
  } = useCourses();
  const [termGoal, setTermGoal] = useState<string>("");
  const [userData, setUserData] = useState<Record<string, any>>({});

  useEffect(() => {
    const userId = session?.user?.id;
    if (status === "authenticated" && userId) {
      // Try to load from local storage first
      try {
        const cached = localStorage.getItem(`userData-${userId}`);
        if (cached) {
          setUserData(JSON.parse(cached));
        }
      } catch {
        // ignore
      }

      sendQuery({ query: GET_USER_FULL, variables: { id: userId } }).then(
        (res) => {
          if (res.data?.users_by_pk?.data) {
            setUserData(res.data.users_by_pk.data);
            try {
              localStorage.setItem(
                `userData-${userId}`,
                JSON.stringify(res.data.users_by_pk.data),
              );
            } catch {
              // ignore
            }
          }
        },
      );
    }
  }, [status, session]);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isImportTranscriptOpen, setIsImportTranscriptOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [addingItemCourseId, setAddingItemCourseId] = useState<string | null>(
    null,
  );
  const [itemData, setItemData] = useState<ItemFormData>({
    course_id: "",
    name: "",
    type: "Assignment",
    grade: "",
    max_grade: "",
    due_date: "",
    isPlaceholder: false,
  });

  // Helper to get course types from course ID
  const getTypesForCourse = (courseId: string): string[] => {
    const course = courses.find((c) => c.id === courseId) || null;
    return getCourseTypes(course);
  };

  function openAddItem(courseId: string | null) {
    setEditingItem(null);
    setAddingItemCourseId(courseId);
    const types = courseId
      ? getTypesForCourse(courseId)
      : ["Assignment", "Exam", "Quiz", "Project", "Other"];
    setItemData({
      course_id: courseId || "",
      name: "",
      type: types[0] || "Assignment",
      grade: "",
      max_grade: "",
      due_date: "",
      isPlaceholder: false,
    });
    setIsItemModalOpen(true);
  }

  function handleOpenEditItem(item: Item) {
    setEditingItem(item);
    setAddingItemCourseId(item.course_id);
    setItemData({
      course_id: item.course_id,
      name: item.data.name ?? "",
      type: item.data.type ?? "Assignment",
      grade: item.data.grade ?? "",
      max_grade: item.data.max_grade ?? "",
      due_date: item.data.due_date ?? "",
      isPlaceholder: item.data.isPlaceholder ?? false,
    });
    setIsItemModalOpen(true);
  }

  function handleDeleteItem(itemId: string) {
    if (window.confirm("Are you sure you want to delete this item?")) {
      deleteItem(itemId);
    }
  }

  async function handleSaveItem() {
    if (!session?.user?.id) return;

    const { course_id, ...dataToSave } = itemData;

    if (editingItem) {
      await updateItem(editingItem.id, dataToSave);
    } else {
      const courseId = addingItemCourseId || course_id;
      if (!courseId) {
        alert("Please select a course.");
        return;
      }
      await addItem(courseId, dataToSave, session.user.id);
    }
    setIsItemModalOpen(false);
    setEditingItem(null);
  }

  const { groupedCourses, sortedFolders } = useGroupedCourses(courses);

  const router = useRouter();
  const searchParams = useSearchParams();

  // State for selected term - get from URL params or default to calculated term
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);

  // Initialize selectedTerm from URL or set to default based on current date
  useEffect(() => {
    const termParam = searchParams?.get("term");
    if (termParam) {
      // Use the term from URL if provided
      setSelectedTerm(termParam);
    } else {
      // Otherwise, use the default term based on current date
      const defaultTerm = getDefaultTerm();
      setSelectedTerm(defaultTerm);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams?.toString()]);

  // initialize selectedDate from `?date=YYYY-MM-DD` if present, otherwise today
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    try {
      const param =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("date")
          : null;
      const parsed = parseDateParam(param);
      if (parsed) return parsed;
    } catch {
      // ignore
    }
    return new Date();
  });

  function prevDay() {
    setSelectedDate((d) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() - 1);
      return nd;
    });
  }

  function nextDay() {
    setSelectedDate((d) => {
      const nd = new Date(d);
      nd.setDate(nd.getDate() + 1);
      return nd;
    });
  }

  function resetToToday() {
    setSelectedDate(new Date());
  }

  // keep selectedDate in the URL as `?date=YYYY-MM-DD`. If selectedDate is today, remove the param.
  useEffect(() => {
    if (!router) return;
    const param = searchParams?.get("date");
    const isoLocal = formatDateParam(selectedDate);
    const todayLocal = formatDateParam(new Date());

    if (isoLocal === todayLocal) {
      if (param) {
        const url = new URL(window.location.href);
        url.searchParams.delete("date");
        const newUrl =
          url.pathname +
          (url.searchParams.toString()
            ? "?" + url.searchParams.toString()
            : "");
        window.history.replaceState(null, "", newUrl);
      }
    } else if (param !== isoLocal) {
      const url = new URL(window.location.href);
      url.searchParams.set("date", isoLocal);
      const newUrl = url.pathname + "?" + url.searchParams.toString();
      window.history.replaceState(null, "", newUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // sync when user navigates (back/forward) and the search param changes
  useEffect(() => {
    const param = searchParams?.get("date");
    const parsed = parseDateParam(param);
    if (parsed) {
      setSelectedDate(parsed);
    } else {
      setSelectedDate(new Date());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams?.toString()]);

  // keyboard shortcuts: ArrowLeft / ArrowRight to navigate, 't' to reset to today
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement)?.tagName === "INPUT" ||
        (e.target as HTMLElement)?.isContentEditable
      )
        return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevDay();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nextDay();
      } else if (e.key.toLowerCase() === "t") {
        e.preventDefault();
        resetToToday();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const currentTerm = selectedTerm && sortedFolders.includes(selectedTerm) ? selectedTerm : (sortedFolders.length > 0 ? sortedFolders[0] : null);

  // Handle term change and update URL
  const handleTermChange = (term: string) => {
    setSelectedTerm(term);
    const url = new URL(window.location.href);
    url.searchParams.set("term", term);
    window.history.replaceState(null, "", url.pathname + "?" + url.searchParams.toString());
  };

  useEffect(() => {
    if (currentTerm) {
      document.title = `${currentTerm} Dashboard - ${APP_NAME}`;
    } else {
      document.title = `Dashboard - ${APP_NAME}`;
    }
  }, [currentTerm]);

  useEffect(() => {
    if (currentTerm) {
      let goal = "";
      if (userData?.term_goals?.[currentTerm]) {
        goal = userData.term_goals[currentTerm];
      }
      setTermGoal(goal);

      sendTelemetry("view_term_dashboard", { term: currentTerm });
    }
  }, [currentTerm, userData]);

  if (status === "loading" || loading) {
    return (
      <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
        <div className="skeleton h-8 w-1/3 mb-4"></div>
        <div className="skeleton h-64 w-full rounded-box"></div>
        <div className="skeleton h-64 w-full rounded-box"></div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    unauthorized();
  }

  if (courses.length > 0 && status === "authenticated" && currentTerm) {
    const currentCourses = groupedCourses[currentTerm];

    const handleSaveGoal = async () => {
      sendTelemetry("set_term_goal", { term: currentTerm, goal: termGoal });

      const newUserData = {
        ...userData,
        term_goals: {
          ...(userData.term_goals || {}),
          [currentTerm]: termGoal,
        },
      };
      setUserData(newUserData);

      const userId = session?.user?.id;
      if (!userId) return;

      try {
        localStorage.setItem(`userData-${userId}`, JSON.stringify(newUserData));
      } catch {
        // ignore
      }

      try {
        await sendQuery({
          query: UPDATE_USER_DATA,
          variables: { id: userId, data: newUserData },
        });
      } catch {
        // ignore
      }
    };

    // 1. Term Average
    const termStats = useMemo(() => {
      let totalCurrent = 0;
      let totalCurrentCredits = 0;
      let totalGPA = 0;
      let totalGPACredits = 0;
      let totalMin = 0;
      let totalMinCredits = 0;
      let totalMax = 0;
      let totalMaxCredits = 0;

      // For required average calculation
      let sumCurrentScore = 0;
      let sumRemainingWeight = 0;

      let sumTotalWeightGraded = 0;
      let sumTotalSchemeWeight = 0;
      let sumTotalWeightCompleted = 0;
      let numCoursesWithDetails = 0;

      currentCourses.forEach((c) => {
        const details = courseGrades.get(c.id);
        if (details) {
          numCoursesWithDetails++;
          const credits = c.credits ?? 0.5;
          if (details.currentGrade !== null) {
            totalCurrent += details.currentGrade * credits;
            totalCurrentCredits += credits;

            totalGPA += gradeToGPA(details.currentGrade) * credits;
            totalGPACredits += credits;
          }



          const bonus = details.bonusPercent || 0;
          const minRaw = details.currentScore + bonus;
          const maxRaw =
            details.currentScore +
            bonus +
            (details.totalSchemeWeight - details.totalWeightGraded);

          const min = Math.min(100, Math.max(32, minRaw));
          const max = Math.min(100, maxRaw);
          totalMin += min * credits;
          totalMax += max * credits;
          totalMinCredits += credits;
          totalMaxCredits += credits;

          sumCurrentScore += details.currentScore;
          sumRemainingWeight +=
            details.totalSchemeWeight - details.totalWeightGraded;
          sumTotalWeightGraded += details.totalWeightGraded * credits;
          sumTotalSchemeWeight += details.totalSchemeWeight * credits;

          if (details.totalWeightCompleted !== undefined) {
            sumTotalWeightCompleted += details.totalWeightCompleted * credits;
          } else {
            sumTotalWeightCompleted += details.totalWeightGraded * credits;
          }
        }
      });

      const termAverage =
        totalCurrentCredits > 0 ? totalCurrent / totalCurrentCredits : null;
      const termGPA = totalGPACredits > 0 ? totalGPA / totalGPACredits : null;
      const termMin = totalMinCredits > 0 ? totalMin / totalMinCredits : null;
      const termMax = totalMaxCredits > 0 ? totalMax / totalMaxCredits : null;

      const weightCompletedPercent =
        sumTotalSchemeWeight > 0
          ? (sumTotalWeightCompleted / sumTotalSchemeWeight) * 100
          : 0;

      // Calculate required average across remaining work to meet the term goal.
      // We treat the provided `termGoal` as the displayed goal (i.e. includes
      // any per-course bonus). To compute the base target that remaining work
      // must achieve we subtract each course's bonus and weight the required
      // contribution by course credits and the fraction of remaining weight.
      let requiredAverage: number | null = null;
      if (termGoal) {
        const target = parseFloat(termGoal);
        if (!isNaN(target)) {
          // Build aggregates needed for the formula:
          // p * sum( (R_i / W_i) * credits_i ) = target*totalCredits - sum( (S_i / W_i *100 + b_i) * credits_i )
          let totalCredits = 0;
          let lhsFactor = 0; // sum of (R_i / W_i) * credits_i
          let rhsCurrent = 0; // sum of (S_i / W_i *100 + b_i) * credits_i

          currentCourses.forEach((c) => {
            const details = courseGrades.get(c.id);
            if (!details) return;
            const credits = c.credits ?? 0.5;

            // For courses with official grades or fully graded, the "remaining weight" is 0.
            // We should use their final grade contribution directly.
            // `currentGrade` includes bonus and is the final percentage for the course.
            const W = details.totalSchemeWeight;
            const R = W - details.totalWeightGraded;

            // If fully graded (or official grade override effectively makes it fully graded)
            if (R <= 0 || details.totalWeightGraded >= details.totalSchemeWeight) {
              const finalGrade = details.currentGrade ?? 0;
              // The contribution is the final grade * credits.
              // We treat this as "achieved" so it subtracts from the target.
              rhsCurrent += finalGrade * credits;
              totalCredits += credits;
            } else {
              // Course is in progress
              const S = details.currentScore;
              const b = Number(c.data?.bonus_percent) || 0;
              if (W > 0) {
                lhsFactor += (R / W) * credits;
              }
              // S/W*100 is the base current percent contribution for the course
              const baseCurrentPercent = W > 0 ? (S / W) * 100 : 0;
              rhsCurrent += (baseCurrentPercent + (b || 0)) * credits;
              totalCredits += credits;
            }
          });

          if (lhsFactor > 0 && totalCredits > 0) {
            const numerator = target * totalCredits - rhsCurrent;
            // `p` is the percent (0-100) required on remaining items across
            // courses (applied uniformly). This aligns with per-course
            // `calculateRequired` which expects a percent for remaining items.
            requiredAverage = (numerator / lhsFactor);
          }
        }
      }

      return {
        termAverage,
        termGPA,
        termMin,
        termMax,
        weightCompletedPercent,
        requiredAverage,
      };
    }, [currentCourses, courseGrades, termGoal]);

    const {
      termAverage,
      termGPA,
      termMin,
      termMax,
      weightCompletedPercent,
      requiredAverage,
    } = termStats;

    // Calculate Cumulative Average (CAV) and Cumulative GPA (CGPA)
    // Calculate Cumulative Average (CAV) and Cumulative GPA (CGPA)
    const cumulativeStats = useMemo(() => {
      let totalCAV = 0;
      let totalCGPA = 0;
      let totalCredits = 0;
      // Credits earned: sum of credits for courses with >=50% (official grade)
      let creditsEarned = 0;

      courses.forEach((c) => {
        // Only include courses with an official grade
        if (
          c.data.official_grade !== undefined &&
          c.data.official_grade !== null
        ) {
          const official = Number(c.data.official_grade);
          const credits = c.credits ?? 0.5;

          totalCAV += official * credits;
          totalCGPA += gradeToGPA(official) * credits;
          totalCredits += credits;

          if (official >= 50) {
            creditsEarned += credits;
          }
        }
      });

      const cav = totalCredits > 0 ? totalCAV / totalCredits : null;
      const cgpa = totalCredits > 0 ? totalCGPA / totalCredits : null;

      return { cav, cgpa, creditsEarned };
    }, [courses]);

    const { cav, cgpa, creditsEarned } = cumulativeStats;

    // Time progress calculation
    const timeProgress = useMemo(() => {
      let progress = 0;
      if (currentTerm) {
        const [season, yearStr] = currentTerm.split(" ");
        const year = parseInt(yearStr);
        let startDate: Date, endDate: Date;

        if (season === "Winter") {
          startDate = new Date(year, 0, 1); // Jan 1
          endDate = new Date(year, 3, 30); // Apr 30
        } else if (season === "Spring") {
          startDate = new Date(year, 4, 1); // May 1
          endDate = new Date(year, 7, 31); // Aug 31
        } else {
          // Fall
          startDate = new Date(year, 8, 1); // Sep 1
          endDate = new Date(year, 11, 31); // Dec 31
        }

        const today = new Date();
        const totalDays =
          (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
        const elapsedDays =
          (today.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
        progress = (elapsedDays / totalDays) * 100;
        if (progress < 0) progress = 0;
        if (progress > 100) progress = 100;
      }
      return progress;
    }, [currentTerm]);

    // 2. Today's Classes (uses `selectedDate` so user can navigate days)
    const todaysClasses = useMemo(() => {
      const viewDate = selectedDate;
      const viewDay = viewDate.toLocaleDateString("en-US", {
        weekday: "short",
      });

      const classes: Array<{
        courseCode: string;
        courseId: string;
        Component: string;
        Section: string;
        "Start Time": { hours: number; minutes: number } | string;
        "End Time": { hours: number; minutes: number } | string;
        Location: string;
      }> = [];

      currentCourses.forEach((course) => {
        if (!course.sections) return;

        const schedule = course.data["schedule-info"] || [];
        schedule.forEach((item: any) => {
          const selectedSection = course.sections?.[item.Component];
          if (selectedSection && selectedSection !== item.Section) return;

          let isToday = false;
          if (item["Meet Dates"] && Array.isArray(item["Meet Dates"])) {
            isToday = item["Meet Dates"].some((d: string) => {
              const date = new Date(d);
              return (
                date.getUTCDate() === viewDate.getDate() &&
                date.getUTCMonth() === viewDate.getMonth() &&
                date.getUTCFullYear() === viewDate.getFullYear()
              );
            });
          } else if (
            item["Days of Week"] &&
            Array.isArray(item["Days of Week"])
          ) {
            isToday = item["Days of Week"].some((d: string) =>
              d.startsWith(viewDay),
            );
          }

          if (isToday) {
            classes.push({
              ...item,
              courseCode: course.code,
              courseId: course.id,
            });
          }
        });
      });

      classes.sort((a, b) => {
        const timeA = a["Start Time"];
        const timeB = b["Start Time"];

        const hA =
          typeof timeA === "object"
            ? timeA.hours
            : parseInt(timeA.split(":")[0]);
        const mA =
          typeof timeA === "object"
            ? timeA.minutes
            : parseInt(timeA.split(":")[1]);
        const hB =
          typeof timeB === "object"
            ? timeB.hours
            : parseInt(timeB.split(":")[0]);
        const mB =
          typeof timeB === "object"
            ? timeB.minutes
            : parseInt(timeB.split(":")[1]);

        if (hA !== hB) return hA - hB;
        return mA - mB;
      });
      return classes;
    }, [currentCourses, selectedDate]);

    // 3. Upcoming Deliverables
    const upcomingDeliverables = useMemo(() => {
      const deliverables: (Item & { courseCode?: string })[] = [];
      const today = new Date();
      const todayStart = new Date(today);
      todayStart.setHours(0, 0, 0, 0);
      const nextWeek = new Date(todayStart);
      nextWeek.setDate(todayStart.getDate() + 7);

      items.forEach((item) => {
        if (currentCourses.some((c) => c.id === item.course_id)) {
          if (item.data.due_date) {
            const dueDateUTC = new Date(item.data.due_date);
            const effectiveDueDate = new Date(
              dueDateUTC.getUTCFullYear(),
              dueDateUTC.getUTCMonth(),
              dueDateUTC.getUTCDate(),
            );

            if (
              effectiveDueDate >= todayStart &&
              effectiveDueDate <= nextWeek
            ) {
              deliverables.push({
                ...item,
                courseCode: currentCourses.find((c) => c.id === item.course_id)
                  ?.code,
              });
            }
          }
        }
      });

      deliverables.sort(
        (a, b) =>
          new Date(a.data.due_date).getTime() -
          new Date(b.data.due_date).getTime(),
      );
      return deliverables;
    }, [items, currentCourses]);

    return (
      <div className="flex flex-col flex-grow">
        <ItemFormModal
          isOpen={isItemModalOpen}
          onClose={() => {
            setIsItemModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSaveItem}
          editingItem={editingItem}
          addingItemCourseId={addingItemCourseId}
          itemData={itemData}
          setItemData={setItemData}
          courses={currentCourses}
          getCourseTypes={getTypesForCourse}
          categoryHasMarks={(courseId: string, type: string) => {
            return items.some(
              (it) => it.course_id === courseId && it.data.type === type && it.data.grade !== "" && !it.data.isPlaceholder,
            );
          }}
        />

        <div className="flex flex-col md:flex-row justify-between items-center sm:items-start md:items-center mb-6 gap-4">
          <h1 className="text-2xl sm:text-3xl justify-center sm:justify-start font-bold flex flex-col sm:flex-row items-center gap-2 ">
            {sortedFolders.length > 1 ? (
              <select
                id="term-select"
                className="select font-bold text-2xl"
                value={currentTerm || ""}
                onChange={(e) => handleTermChange(e.target.value)}
              >
                {sortedFolders.map((term) => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
              </select>
            ) : (
              <span>{currentTerm}</span>
            )}
            <div className="flex gap-2">
              Dashboard
              <div
                className="tooltip tooltip-right flex items-center"
                data-tip={"How are grades calculated?"}
              >
                <Link
                  href="/help#grade-calculation"
                  className="text-base opacity-30 hover:opacity-100 transition-opacity"
                >
                  <FontAwesomeIcon icon={faInfoCircle} />
                </Link>
              </div>
            </div>
          </h1>
          {(cav !== null || cgpa !== null) && (
            <div className="flex gap-6 items-start">
              {cav !== null && (
                <div className="flex flex-col items-center sm:items-end">
                  <span className="sm:block hidden text-[10px] font-bold uppercase tracking-wider opacity-50 mb-0.5">
                    Cumulative Average
                  </span>
                  <span className="sm:hidden block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-0.5">
                    CAV
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`badge badge-xs ${cav >= 80 ? "badge-success" : cav >= 60 ? "badge-warning" : "badge-error"}`}
                    ></span>
                    <span className="text-2xl font-black tracking-tight leading-none">
                      {cav.toFixed(1)}
                      <span className="text-sm opacity-50 ml-0.5">%</span>
                    </span>
                  </div>
                </div>
              )}
              {cgpa !== null && (
                <div className="flex flex-col items-center sm:items-end">
                  <span className="sm:block hidden text-[10px] font-bold uppercase tracking-wider opacity-50 mb-0.5">
                    Cumulative GPA
                  </span>
                  <span className="sm:hidden block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-0.5">
                    CGPA
                  </span>
                  <span className="text-2xl font-black tracking-tight leading-none">
                    {cgpa.toFixed(2)}
                  </span>
                </div>
              )}
              {creditsEarned > 0 && (
                <div className="flex flex-col items-center sm:items-end">
                  <span className="sm:block hidden text-[10px] font-bold uppercase tracking-wider opacity-50 mb-0.5">
                    Credits Earned
                  </span>
                  <span className="sm:hidden block text-[10px] font-bold uppercase tracking-wider opacity-50 mb-0.5">
                    Credits
                  </span>
                  <span className="text-2xl font-black tracking-tight leading-none">
                    {creditsEarned}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {termAverage !== null ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <TermStatsCard
                termAverage={termAverage}
                termGPA={termGPA}
                termMin={termMin}
                termMax={termMax}
                termGoal={termGoal}
                setTermGoal={setTermGoal}
                onSaveGoal={handleSaveGoal}
                requiredAverage={requiredAverage}
                timeProgress={timeProgress}
                weightCompletedPercent={weightCompletedPercent}
              />

              <ClassScheduleCard
                classes={todaysClasses}
                selectedDate={selectedDate}
                onPrevDay={prevDay}
                onNextDay={nextDay}
                onResetToday={resetToToday}
                onNavigateToCourse={(courseId, course) => {
                  if (setOptimisticCourse) setOptimisticCourse(course);
                  router.push(`/courses/${courseId}?view=grades`);
                }}
                courses={courses}
              />

              <DeliverablesCard
                deliverables={upcomingDeliverables}
                onAddDeliverable={() => openAddItem(null)}
                onEditDeliverable={handleOpenEditItem}
                onDeleteDeliverable={handleDeleteItem}
                onNavigateToCourse={(courseId, course) => {
                  if (setOptimisticCourse) setOptimisticCourse(course);
                  router.push(`/courses/${courseId}?view=grades`);
                }}
                courses={courses}
              />
            </div>

            <CoursesCard
              courses={currentCourses}
              courseGrades={courseGrades}
              onNavigateToCourse={(courseId, course) => {
                if (setOptimisticCourse) setOptimisticCourse(course);
                router.push(`/courses/${courseId}?view=info`);
              }}
              onAddItem={openAddItem}
              isCompleted={isCourseCompleted}
            />
          </>
        ) : (
          <div className="text-sm mt-1 opacity-50 italic md:text-left text-center">
            No grades available yet.
          </div>
        )}
      </div>
    );
  }

  return (
    <ProsePageContainer>
      <AddCourseHelp />
    </ProsePageContainer>
  );
}

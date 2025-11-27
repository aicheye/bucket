"use client";

import {
  faBook,
  faCalendarDay,
  faChevronLeft,
  faChevronRight,
  faClock,
  faInfoCircle,
  faPencil,
  faPlus,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { formatTime } from "../../lib/format-utils";
import { getCourseGradeDetails } from "../../lib/grade-utils";
import { sendTelemetry } from "../../lib/telemetry";
import AddCourseHelp from "../components/add-course-help";
import GoalInput from "../components/goal-input";
import GradeBadge from "../components/grade-badge";
import Modal from "../components/modal";
import RangeBadge from "../components/range-badge";
import ReqAvgBadge from "../components/req-avg-badge";
import { Item, useCourses } from "../course-context";

export default function CoursesPage() {
  const { data: session, status } = useSession();
  const { courses, loading, items, addItem, updateItem, deleteItem, setOptimisticCourse } =
    useCourses();
  const [termGoal, setTermGoal] = useState<string>("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [userData, setUserData] = useState<any>({});

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userId = (session?.user as any)?.id;
    if (status === "authenticated" && userId) {
      const query = `
                query GetUserData($id: String!) {
                    users_by_pk(id: $id) {
                        data
                    }
                }
            `;
      fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          variables: { id: userId },
        }),
      })
        .then((res) => res.json())
        .then((res) => {
          if (res.data?.users_by_pk?.data) {
            setUserData(res.data.users_by_pk.data);
          }
        })
        .catch((err) => console.error("Failed to fetch user data", err));
    }
  }, [status, session]);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [addingItemCourseId, setAddingItemCourseId] = useState<string | null>(
    null,
  );
  const [itemData, setItemData] = useState({
    course_id: "",
    name: "",
    type: "Assignment",
    grade: "",
    max_grade: "",
    due_date: "",
    isPlaceholder: false,
  });

  // progress bars: always stacked, no resize observer or radial visuals

  function getCourseTypes(courseId: string) {
    const course = courses.find((c) => c.id === courseId);
    const schemes = course?.data["marking-schemes"] || [];

    let types = Array.from(
      new Set(schemes.flat().map((s: any) => s.Component)),
    );
    if (types.length === 0)
      types = ["Assignment", "Exam", "Quiz", "Project", "Other"];
    return types;
  }

  function openAddItem(courseId: string | null) {
    setEditingItem(null);
    setAddingItemCourseId(courseId);
    const types = courseId
      ? getCourseTypes(courseId)
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
      name: (item.data as any)?.name ?? "",
      type: (item.data as any)?.type ?? "Assignment",
      grade: (item.data as any)?.grade ?? "",
      max_grade: (item.data as any)?.max_grade ?? "",
      due_date: (item.data as any)?.due_date ?? "",
      isPlaceholder: (item.data as any)?.isPlaceholder ?? false,
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

  const gradeToGPA = (grade: number) => {
    if (grade >= 90) return 4.0;
    if (grade >= 85) return 3.9;
    if (grade >= 80) return 3.5;
    if (grade >= 77) return 3.3;
    if (grade >= 73) return 3.0;
    if (grade >= 70) return 2.7;
    if (grade >= 67) return 2.3;
    if (grade >= 63) return 2.0;
    if (grade >= 60) return 1.7;
    if (grade >= 57) return 1.3;
    if (grade >= 53) return 1.0;
    if (grade >= 50) return 0.7;
    return 0.0;
  };

  const { groupedCourses, sortedFolders } = useMemo(() => {
    if (!courses || courses.length === 0)
      return { groupedCourses: {}, sortedFolders: [] };

    const grouped: Record<string, typeof courses> = {};
    courses.forEach((course) => {
      const folder = course.term || "Uncategorized";
      if (!grouped[folder]) grouped[folder] = [];
      grouped[folder].push(course);
    });

    const seasonOrder: Record<string, number> = {
      Winter: 1,
      Spring: 2,
      Summer: 3,
      Fall: 4,
    };

    const sorted = Object.keys(grouped).sort((a, b) => {
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;

      const partsA = a.split(" ");
      const partsB = b.split(" ");

      if (partsA.length === 2 && partsB.length === 2) {
        const [seasonA, yearA] = partsA;
        const [seasonB, yearB] = partsB;

        const yA = parseInt(yearA);
        const yB = parseInt(yearB);

        if (yA !== yB) return yB - yA; // Descending year

        const sA = seasonOrder[seasonA] || 99;
        const sB = seasonOrder[seasonB] || 99;

        return sB - sA; // Descending season
      }
      return b.localeCompare(a);
    });

    return { groupedCourses: grouped, sortedFolders: sorted };
  }, [courses]);

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // helpers to parse/format date param as local date (YYYY-MM-DD)
  const parseDateParam = (s: string | null) => {
    if (!s) return null;
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    const y = parseInt(m[1], 10);
    const mo = parseInt(m[2], 10) - 1;
    const d = parseInt(m[3], 10);
    const dt = new Date(y, mo, d);
    if (isNaN(dt.getTime())) return null;
    return dt;
  };

  const formatDateParam = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, "0");
    const d = date.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // initialize selectedDate from `?date=YYYY-MM-DD` if present, otherwise today
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    try {
      const param = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("date") : null;
      const parsed = parseDateParam(param);
      if (parsed) return parsed;
    } catch (e) {
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
        // remove param but preserve other params if any
        const url = new URL(window.location.href);
        url.searchParams.delete("date");
        // Update the URL without triggering a Next.js navigation so the
        // client-side document.title and state are preserved.
        const newUrl = url.pathname + (url.searchParams.toString() ? "?" + url.searchParams.toString() : "");
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
      // if param removed, reset to today
      setSelectedDate(new Date());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams?.toString()]);

  // keyboard shortcuts: ArrowLeft / ArrowRight to navigate, 't' to reset to today
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.isContentEditable) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentTerm = sortedFolders.length > 0 ? sortedFolders[0] : null;

  useEffect(() => {
    if (currentTerm) {
      document.title = `Bucket | ${currentTerm} Dashboard`;
    } else {
      document.title = `Bucket Dashboard`;
    }
  }, [currentTerm]);

  useEffect(() => {
    if (currentTerm) {
      let goal = "";
      if (userData?.term_goals?.[currentTerm]) {
        goal = userData.term_goals[currentTerm];
      } else {
        const saved = localStorage.getItem(`term_goal_${currentTerm}`);
        if (saved) goal = saved;
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
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold text-base-content/70">
          Not authenticated
        </h2>
        <p className="text-base-content/60">
          Please log in to view your dashboard.
        </p>
      </div>
    );
  }

  if (courses.length > 0 && status === "authenticated" && currentTerm) {
    const currentCourses = groupedCourses[currentTerm];

    const handleSaveGoal = async () => {
      localStorage.setItem(`term_goal_${currentTerm}`, termGoal);
      sendTelemetry("set_term_goal", { term: currentTerm, goal: termGoal });

      const newUserData = {
        ...userData,
        term_goals: {
          ...(userData.term_goals || {}),
          [currentTerm]: termGoal,
        },
      };
      setUserData(newUserData);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userId = (session?.user as any)?.id;
      if (!userId) return;

      const query = `
                mutation UpdateUserData($id: String!, $data: jsonb!) {
                    update_users_by_pk(pk_columns: {id: $id}, _set: {data: $data}) {
                        id
                        data
                    }
                }
            `;

      try {
        await fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            variables: {
              id: userId,
              data: newUserData,
            },
          }),
        });
      } catch (err) {
        console.error("Failed to save user data", err);
      }
    };

    // 1. Term Average
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
    let numCoursesWithDetails = 0;

    currentCourses.forEach((c) => {
      const details = getCourseGradeDetails(c, items);
      if (details) {
        numCoursesWithDetails++;
        const credits = c.credits ?? 0.5;
        if (details.currentGrade !== null) {
          totalCurrent += details.currentGrade * credits;
          totalCurrentCredits += credits;

          totalGPA += gradeToGPA(details.currentGrade) * credits;
          totalGPACredits += credits;
        }

        const min = details.currentScore;
        const max =
          details.currentScore +
          (details.totalSchemeWeight - details.totalWeightGraded);
        totalMin += min * credits;
        totalMax += max * credits;
        totalMinCredits += credits;
        totalMaxCredits += credits;

        sumCurrentScore += details.currentScore;
        sumRemainingWeight +=
          details.totalSchemeWeight - details.totalWeightGraded;
        sumTotalWeightGraded += details.totalWeightGraded;
        sumTotalSchemeWeight += details.totalSchemeWeight;
      }
    });

    const termAverage =
      totalCurrentCredits > 0 ? totalCurrent / totalCurrentCredits : null;
    const termGPA = totalGPACredits > 0 ? totalGPA / totalGPACredits : null;
    const termMin = totalMinCredits > 0 ? totalMin / totalMinCredits : null;
    const termMax = totalMaxCredits > 0 ? totalMax / totalMaxCredits : null;

    // Calculate Cumulative Average (CAV) and Cumulative GPA (CGPA)
    let totalCAV = 0;
    let totalCGPA = 0;
    let totalCredits = 0;
    // Credits earned: sum of credits for courses with >=50% (or estimated >=50%)
    let creditsEarned = 0;

    courses.forEach((c) => {
      const details = getCourseGradeDetails(c, items);
      if (details && details.currentGrade !== null) {
        const credits = c.credits ?? 0.5;
        totalCAV += details.currentGrade * credits;
        totalCGPA += gradeToGPA(details.currentGrade) * credits;
        totalCredits += credits;
      }
      // Determine credits-earned eligibility based on >=50% rule.
      if (details) {
        const credits = c.credits ?? 0.5;
        const hasCurrentGrade = details.currentGrade !== null;
        // estimated final percent based on current scored points over total scheme weight
        const estimatedPercent =
          details.totalSchemeWeight > 0
            ? (details.currentScore / details.totalSchemeWeight) * 100
            : null;

        const meetsThreshold =
          (hasCurrentGrade && (details.currentGrade ?? 0) >= 50) ||
          (estimatedPercent !== null && estimatedPercent >= 50);

        if (meetsThreshold) {
          creditsEarned += credits;
        }
      }
    });

    const cav = totalCredits > 0 ? totalCAV / totalCredits : null;
    const cgpa = totalCredits > 0 ? totalCGPA / totalCredits : null;

    // Time progress calculation
    let timeProgress = 0;
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
      let progress = (elapsedDays / totalDays) * 100;
      if (progress < 0) progress = 0;
      if (progress > 100) progress = 100;
      timeProgress = progress;
    }

    const weightCompletedPercent =
      sumTotalSchemeWeight > 0
        ? (sumTotalWeightGraded / sumTotalSchemeWeight) * 100
        : 0;

    // Calculate required average
    let requiredAverage: number | null = null;
    if (termGoal && sumRemainingWeight > 0) {
      const target = parseFloat(termGoal);
      if (!isNaN(target)) {
        // Target total points across all courses = target * numCourses
        // But wait, term average is average of percentages.
        // So (Sum of Final Grades) / N = Target
        // Sum of Final Grades = Target * N
        // Final Grade_i = CurrentScore_i + (RequiredAvg * RemainingWeight_i)
        // Sum(CurrentScore_i) + RequiredAvg * Sum(RemainingWeight_i) = Target * N
        // RequiredAvg = (Target * N - Sum(CurrentScore_i)) / Sum(RemainingWeight_i)

        // We use numCoursesWithDetails as N because that's the number of courses we have details for
        const numCourses = numCoursesWithDetails;
        if (numCourses > 0) {
          const numerator = target * numCourses - sumCurrentScore;
          requiredAverage = (numerator / sumRemainingWeight) * 100;
        }
      }
    }

    // 2. Today's Classes (uses `selectedDate` so user can navigate days)
    const viewDate = selectedDate;
    const viewDay = viewDate.toLocaleDateString("en-US", { weekday: "short" });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const todaysClasses: any[] = [];

    currentCourses.forEach((course) => {
      if (!course.sections) return;

      const schedule = course.data["schedule-info"] || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
          todaysClasses.push({
            ...item,
            courseCode: course.code,
            courseId: course.id,
          });
        }
      });
    });

    todaysClasses.sort((a, b) => {
      const timeA = a["Start Time"];
      const timeB = b["Start Time"];

      const hA =
        typeof timeA === "object" ? timeA.hours : parseInt(timeA.split(":")[0]);
      const mA =
        typeof timeA === "object"
          ? timeA.minutes
          : parseInt(timeA.split(":")[1]);
      const hB =
        typeof timeB === "object" ? timeB.hours : parseInt(timeB.split(":")[0]);
      const mB =
        typeof timeB === "object"
          ? timeB.minutes
          : parseInt(timeB.split(":")[1]);

      if (hA !== hB) return hA - hB;
      return mA - mB;
    });

    // ensure we have a real 'today' for deliverables and other global calculations
    const today = new Date();

    // 3. Upcoming Deliverables
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const upcomingDeliverables: any[] = [];
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

          if (effectiveDueDate >= todayStart && effectiveDueDate <= nextWeek) {
            upcomingDeliverables.push({
              ...item,
              courseCode: currentCourses.find((c) => c.id === item.course_id)
                ?.code,
            });
          }
        }
      }
    });

    upcomingDeliverables.sort(
      (a, b) =>
        new Date(a.data.due_date).getTime() -
        new Date(b.data.due_date).getTime(),
    );

    return (
      <div className="flex flex-col flex-grow">
        <Modal
          isOpen={isItemModalOpen}
          onClose={() => {
            setIsItemModalOpen(false);
            setEditingItem(null);
          }}
          title={editingItem ? "Edit Item" : "Add Item"}
          onConfirm={handleSaveItem}
          actions={
            <>
              <button
                className="btn"
                onClick={() => {
                  setIsItemModalOpen(false);
                  setEditingItem(null);
                }}
              >
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveItem}>
                Save
              </button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            {editingItem === null &&
              addingItemCourseId === null &&
              currentCourses.length > 0 && (
                <div className="form-control w-full">
                  <label className="label mb-2">
                    <span className="label-text">Course</span>
                  </label>
                  <select
                    className="select select-bordered w-full"
                    value={itemData.course_id}
                    onChange={(e) => {
                      const newCourseId = e.target.value;
                      const types = getCourseTypes(newCourseId);
                      setItemData({
                        ...itemData,
                        course_id: newCourseId,
                        type: types[0] || "Assignment",
                      });
                    }}
                  >
                    <option disabled value="">
                      Select a course
                    </option>
                    {currentCourses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            <div className="form-control w-full">
              <label className="label mb-2">
                <span className="label-text">Name</span>
              </label>
              <input
                type="text"
                className="input input-bordered w-full"
                value={itemData.name}
                onChange={(e) =>
                  setItemData({ ...itemData, name: e.target.value })
                }
              />
            </div>
            <div className="form-control w-full">
              <label className="label mb-2 flex items-center gap-2">
                <span className="label-text">Type</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={itemData.type}
                onChange={(e) =>
                  setItemData({ ...itemData, type: e.target.value })
                }
              >
                {(addingItemCourseId || itemData.course_id) &&
                  getCourseTypes(addingItemCourseId || itemData.course_id).map(
                    (t: any) => <option key={t}>{t}</option>,
                  )}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="form-control w-full">
                <label className="label mb-2">
                  <span className="label-text">Grade</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={itemData.grade}
                  onChange={(e) =>
                    setItemData({ ...itemData, grade: e.target.value })
                  }
                />
              </div>
              <div className="form-control w-full">
                <label className="label mb-2">
                  <span className="label-text">Max Grade</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={itemData.max_grade}
                  onChange={(e) =>
                    setItemData({ ...itemData, max_grade: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="form-control w-full">
              <label className="label mb-2">
                <span className="label-text">Due Date</span>
              </label>
              <input
                type="date"
                className="input input-bordered w-full"
                value={itemData.due_date?.split("T")[0] ?? ""}
                onChange={(e) =>
                  setItemData({ ...itemData, due_date: e.target.value })
                }
              />
            </div>
          </div>
        </Modal>
        <div className="flex flex-col md:flex-row justify-between items-center sm:items-start md:items-center mb-6 sm:gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl justify-center sm:justify-start font-bold mb-4 flex items-center gap-2 ">
              {currentTerm} Dashboard
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
            </h1>
          </div>
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
              {
                creditsEarned > 0 && (
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
                )
              }
            </div>
          )}
        </div>

        {termAverage !== null ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Column 1 */}
              <div className="flex flex-col gap-6">
                <div className="card bg-base-100 shadow-sm p-6 h-full items-center flex flex-col justify-around gap-3 flex-grow">
                  <div className="flex flex-row items-center justify-center gap-4 w-full">
                    <div className="flex flex-col items-center">
                      <div className="text-[10px] uppercase tracking-wider opacity-50 font-bold mb-1">
                        Term AVG
                      </div>
                      <GradeBadge grade={termAverage} />
                    </div>

                    <div className="h-12 border border-base-content/10"></div>

                    <div className="flex flex-col items-center">
                      <div className="text-[10px] uppercase tracking-wider opacity-50 font-bold mb-1">
                        Term GPA
                      </div>
                      <GradeBadge gpa={termGPA} />
                    </div>
                  </div>

                  {termMin !== null && termMax !== null && (
                    <RangeBadge rangeMin={termMin!} rangeMax={termMax!} />
                  )}

                  <div className="border border-base-content/10 max-w-[10rem] w-full"></div>

                  <div className="flex flex-row items-center justify-between gap-2 bg-base-200 p-2 card w-full shadow-sm">
                    <GoalInput
                      handleSaveTargetGrade={handleSaveGoal}
                      targetGrade={termGoal}
                      setTargetGrade={setTermGoal}
                    />
                  </div>

                  {requiredAverage !== null && termAverage !== null && (
                    <ReqAvgBadge
                      requiredAverage={requiredAverage!}
                      average={termAverage!}
                    />
                  )}
                </div>
                <div className="md:col-span-3 flex justify-center items-center">
                  <div className="card bg-base-100 shadow-sm w-full max-w-4xl p-6">
                    <div className="flex flex-col gap-4">
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold uppercase text-base-content/70">Term Progress</span>
                          <span className="text-sm font-bold">{timeProgress.toFixed(0)}%</span>
                        </div>
                        <progress className="progress progress-primary w-full h-3" value={timeProgress} max="100"></progress>
                      </div>
                      <div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold uppercase text-base-content/70">Weight Completed</span>
                          <span className="text-sm font-bold">{weightCompletedPercent.toFixed(0)}%</span>
                        </div>
                        <progress className="progress progress-secondary w-full h-3" value={weightCompletedPercent} max="100"></progress>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Column 2 */}
              <div className="card bg-base-100 shadow-sm h-full">
                <div className="card-body p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="card-title text-sm uppercase opacity-70 m-0 flex items-center gap-2">
                      <FontAwesomeIcon icon={faClock} className="mr-2" />
                      <span>
                        CLASSES ({viewDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()})
                      </span>
                    </h3>
                    <div className="flex items-center gap-0.5">
                      <button
                        className="btn btn-xs btn-circle btn-ghost"
                        onClick={(e) => {
                          e.preventDefault();
                          prevDay();
                        }}
                        title="Previous day"
                      >
                        <FontAwesomeIcon icon={faChevronLeft} />
                      </button>
                      <button
                        className="btn btn-xs btn-ghost text-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          resetToToday();
                        }}
                        title="Today (click to reset)"
                      >
                        Today
                      </button>
                      <button
                        className="btn btn-xs btn-circle btn-ghost"
                        onClick={(e) => {
                          e.preventDefault();
                          nextDay();
                        }}
                        title="Next day"
                      >
                        <FontAwesomeIcon icon={faChevronRight} />
                      </button>
                    </div>
                  </div>
                  {todaysClasses.length > 0 ? (
                    <div className="flex flex-col h-full gap-2">
                      {todaysClasses.slice(0, 6).map((cls, i) => (
                        <Link
                          href={`/courses/${cls.courseId}/info`}
                          key={i}
                          className="flex-grow max-h-[6rem] items-center gap-3 p-3 card flex-row bg-base-200 hover:bg-base-300 transition-colors shadow-sm"
                          onClick={(e) => {
                            // Optimistically provide the course object so the course layout
                            // can render immediately while the real data finishes loading.
                            try {
                              e.preventDefault();
                              const c = courses.find((x) => x.id === cls.courseId) || null;
                              setOptimisticCourse && setOptimisticCourse(c);
                              router.push(`/courses/${cls.courseId}/info`);
                            } catch (err) {
                              // fallback to normal navigation
                              // eslint-disable-next-line no-console
                              console.error(err);
                            }
                          }}
                        >
                          <div className="flex-1">
                            <div className="font-bold text-sm">
                              {cls.courseCode}
                            </div>
                            <div className="text-xs opacity-70">
                              {cls.Component} {cls.Section}
                            </div>
                          </div>
                          <div className="text-right text-xs font-mono">
                            <div className="flex gap-2">
                              <span>{formatTime(cls["Start Time"])}</span>
                              <span className="lg:block hidden">
                                {" "}
                                - {formatTime(cls["End Time"])}
                              </span>
                            </div>
                            <div className="opacity-50">{cls.Location}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm opacity-50 italic">
                      No classes today.
                    </div>
                  )}
                </div>
              </div>
              {/* Column 3 */}
              <div className="card bg-base-100 shadow-sm h-full">
                <div className="card-body p-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="card-title text-sm uppercase opacity-70">
                      <FontAwesomeIcon icon={faCalendarDay} className="mr-2" />
                      Upcoming Deliverables
                    </h3>
                    <button
                      className="btn btn-xs btn-circle btn-primary"
                      onClick={() => openAddItem(null)}
                      title="Add Deliverable"
                    >
                      <FontAwesomeIcon icon={faPlus} />
                    </button>
                  </div>
                  {upcomingDeliverables.length > 0 ? (
                    <div className="flex flex-col h-full gap-2">
                      {upcomingDeliverables.slice(0, 6).map((item) => (
                        <div
                          key={item.id}
                          className="flex-grow max-h-[6rem] items-center gap-3 p-3 card flex-row bg-base-200 hover:bg-base-300 transition-colors shadow-sm"
                        >
                          <Link
                            href={`/courses/${item.course_id}/grades`}
                            className="flex-1 justify-between flex items-center gap-3"
                            onClick={(e) => {
                              e.preventDefault();
                              const c = courses.find((x) => x.id === item.course_id) || null;
                              setOptimisticCourse && setOptimisticCourse(c);
                              router.push(`/courses/${item.course_id}/grades`);
                            }}
                          >
                            <div className="">
                              <div className="font-bold text-sm">
                                {item.data.name}
                              </div>
                              <div className="text-xs opacity-70">
                                {item.courseCode}
                              </div>
                            </div>
                            <div className="text-right text-xs min-w-fit">
                              <div className="font-bold text-error min-w-fit">
                                {new Date(
                                  item.data.due_date,
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </div>
                            </div>
                          </Link>
                          <div className="flex gap-1">
                            <button
                              className="btn btn-xs btn-circle btn-ghost"
                              onClick={(e) => {
                                e.preventDefault();
                                handleOpenEditItem(item);
                              }}
                            >
                              <FontAwesomeIcon icon={faPencil} />
                            </button>
                            <button
                              className="btn btn-xs btn-circle btn-ghost text-error"
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeleteItem(item.id);
                              }}
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm opacity-50 italic">
                      No upcoming deliverables.
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div
              className="card bg-base-100 shadow-sm col-span-1 md:col-span-3"
              key="courses-card"
            >
              <div className="card-body p-4">
                <h3 className="card-title text-sm uppercase opacity-70 mb-2 flex items-center gap-2">
                  <span><FontAwesomeIcon icon={faBook} className="mr-2" />
                    Courses</span>
                  <span className="badge badge-sm badge-accent px-2 py-2 items-center"><span className="opacity-80">Total credits:</span> {currentCourses.reduce((sum, c) => sum + (c.credits || 0), 0)}</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {/* Current Courses */}
                  {currentCourses.map((course) => {
                    const details = getCourseGradeDetails(course, items);
                    const currentGrade = details?.currentGrade;
                    const min = details ? details.currentScore : 0;
                    const max = details
                      ? details.currentScore +
                      (details.totalSchemeWeight - details.totalWeightGraded)
                      : 0;

                    return (
                      <Link
                        key={course.id}
                        href={`/courses/${course.id}/info`}
                        className="card bg-base-200 hover:bg-base-300 transition-colors shadow-sm"
                        onClick={(e) => {
                          e.preventDefault();
                          setOptimisticCourse && setOptimisticCourse(course);
                          router.push(`/courses/${course.id}/info`);
                        }}
                      >
                        <div className="card-body p-4">
                          <h2 className="card-title justify-between text-base">
                            <div className="flex gap-2 items-center">
                              {course.code}
                              <div className="text-sm font-normal opacity-70">
                                ({course.credits})
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                className="btn btn-xs btn-circle btn-secondary hover:opacity-100"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openAddItem(course.id);
                                }}
                                title="Quick Add Item"
                              >
                                <FontAwesomeIcon icon={faPlus} />
                              </button>
                              {currentGrade !== null && (
                                <GradeBadge grade={currentGrade} size="sm" />
                              )}
                            </div>
                          </h2>
                          {details ? (
                            <div className="mt-2">
                              <div className="flex justify-between text-xs opacity-60 mb-1">
                                <span>Min: {min.toFixed(1)}%</span>
                                <span>Max: {max.toFixed(1)}%</span>
                              </div>
                              <div className="flex flex-col gap-1 mt-2">
                                <progress
                                  className="progress progress-error opacity-60 w-full h-1"
                                  value={min || 0}
                                  max="100"
                                ></progress>
                                <progress
                                  className="progress progress-success opacity-60 w-full h-1"
                                  value={max || 0}
                                  max="100"
                                ></progress>
                                <progress
                                  className="progress progress-primary w-full h-3"
                                  value={currentGrade || 0}
                                  max="100"
                                ></progress>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-2 text-sm italic opacity-50">
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
          </>
        ) : (
          <div className="text-sm mt-1 opacity-50 italic">
            No grades available yet.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="text-left max-w-3xl justify-center">
        <AddCourseHelp />
      </div>
    </div>
  );
}

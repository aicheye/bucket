"use client";

import { faCalendarDay, faClock, faInfoCircle, faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatTime } from "../../lib/format-utils";
import { getCourseGradeDetails } from "../../lib/grade-utils";
import { sendTelemetry } from "../../lib/telemetry";
import AddCourseHelp from "../components/add-course-help";
import Modal from "../components/modal";
import { useCourses } from "./course-context";

export default function CoursesPage() {
    const { data: session, status } = useSession();
    const { courses, loading, items, addItem } = useCourses();
    const [termGoal, setTermGoal] = useState<string>("");

    const [isAddingItem, setIsAddingItem] = useState(false);
    const [addingItemCourseId, setAddingItemCourseId] = useState<string | null>(null);
    const [itemData, setItemData] = useState({ name: "", type: "Assignment", grade: "", max_grade: "", due_date: "", isPlaceholder: false });

    function getCourseTypes(courseId: string) {
        const course = courses.find(c => c.id === courseId);
        const schemes = course?.data["marking-schemes"] || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let types = Array.from(new Set(schemes.flat().map((s: any) => s.Component)));
        if (types.length === 0) types = ["Assignment", "Exam", "Quiz", "Project", "Other"];
        return types;
    }

    function openAddItem(courseId: string) {
        setAddingItemCourseId(courseId);
        const types = getCourseTypes(courseId);
        setItemData({ name: "", type: types[0] || "Assignment", grade: "", max_grade: "", due_date: "", isPlaceholder: false });
        setIsAddingItem(true);
    }

    async function handleSaveItem() {
        if (!status || !addingItemCourseId) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = (session as any)?.user;
        if (!user?.id) return;

        await addItem(addingItemCourseId, itemData, user.id);
        setIsAddingItem(false);
        setAddingItemCourseId(null);
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
    }

    const { groupedCourses, sortedFolders } = useMemo(() => {
        if (!courses || courses.length === 0) return { groupedCourses: {}, sortedFolders: [] };

        const grouped: Record<string, typeof courses> = {};
        courses.forEach(course => {
            const folder = course.term || "Uncategorized";
            if (!grouped[folder]) grouped[folder] = [];
            grouped[folder].push(course);
        });

        const seasonOrder: Record<string, number> = {
            "Winter": 1, "Spring": 2, "Summer": 3, "Fall": 4
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

    const currentTerm = sortedFolders.length > 0 ? sortedFolders[0] : null;

    useEffect(() => {
        if (currentTerm) {
            const saved = localStorage.getItem(`term_goal_${currentTerm}`);
            if (saved) setTermGoal(saved);
            else setTermGoal("");
            
            sendTelemetry("view_term_dashboard", { term: currentTerm });
        }
    }, [currentTerm]);

    if (status === "loading" || loading) {
        return <div className="flex h-full items-center justify-center">
            <span className="loading loading-spinner loading-lg"></span>
        </div>;
    }

    if (status === "unauthenticated") {
        return <div className="flex h-full flex-col items-center justify-center text-center">
            <h2 className="text-2xl font-bold text-base-content/70">Not authenticated</h2>
            <p className="text-base-content/60">Please log in to view your courses.</p>
        </div>;
    }

    if (courses.length > 0 && status === "authenticated" && currentTerm) {
        const currentCourses = groupedCourses[currentTerm];

        const handleSaveGoal = () => {
            localStorage.setItem(`term_goal_${currentTerm}`, termGoal);
            sendTelemetry("set_term_goal", { term: currentTerm, goal: termGoal });
        };

        // 1. Term Average
        let totalCurrent = 0;
        let countCurrent = 0;
        let totalGPA = 0;
        let countGPA = 0;
        let totalMin = 0;
        let totalMax = 0;
        let countMinMax = 0;

        // For required average calculation
        let sumCurrentScore = 0;
        let sumRemainingWeight = 0;

        currentCourses.forEach(c => {
            const details = getCourseGradeDetails(c, items);
            if (details) {
                if (details.currentGrade !== null) {
                    totalCurrent += details.currentGrade;
                    countCurrent++;

                    totalGPA += gradeToGPA(details.currentGrade);
                    countGPA++;
                }

                const min = details.currentScore;
                const max = details.currentScore + (details.totalSchemeWeight - details.totalWeightGraded);
                totalMin += min;
                totalMax += max;
                countMinMax++;

                sumCurrentScore += details.currentScore;
                sumRemainingWeight += (details.totalSchemeWeight - details.totalWeightGraded);
            }
        });

        const termAverage = countCurrent > 0 ? totalCurrent / countCurrent : null;
        const termGPA = countGPA > 0 ? totalGPA / countGPA : null;
        const termMin = countMinMax > 0 ? totalMin / countMinMax : null;
        const termMax = countMinMax > 0 ? totalMax / countMinMax : null;

        // Calculate Cumulative Average (CAV) and Cumulative GPA (CGPA)
        let totalCAV = 0;
        let countCAV = 0;
        let totalCGPA = 0;
        let countCGPA = 0;

        courses.forEach(c => {
            const details = getCourseGradeDetails(c, items);
            if (details && details.currentGrade !== null) {
                totalCAV += details.currentGrade;
                countCAV++;
                totalCGPA += gradeToGPA(details.currentGrade);
                countCGPA++;
            }
        });

        const cav = countCAV > 0 ? totalCAV / countCAV : null;
        const cgpa = countCGPA > 0 ? totalCGPA / countCGPA : null;

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

                // We use countMinMax as N because that's the number of courses we have details for
                const numCourses = countMinMax;
                if (numCourses > 0) {
                    const numerator = (target * numCourses) - sumCurrentScore;
                    requiredAverage = (numerator / sumRemainingWeight) * 100;
                }
            }
        }

        // 2. Today's Classes
        const today = new Date();
        const todayDay = today.toLocaleDateString("en-US", { weekday: "short" });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const todaysClasses: any[] = [];

        currentCourses.forEach(course => {
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
                        return date.getUTCDate() === today.getDate() &&
                            date.getUTCMonth() === today.getMonth() &&
                            date.getUTCFullYear() === today.getFullYear();
                    });
                } else if (item["Days of Week"] && Array.isArray(item["Days of Week"])) {
                    isToday = item["Days of Week"].some((d: string) => d.startsWith(todayDay));
                }

                if (isToday) {
                    todaysClasses.push({
                        ...item,
                        courseCode: course.code,
                        courseId: course.id
                    });
                }
            });
        });

        todaysClasses.sort((a, b) => {
            const timeA = a["Start Time"];
            const timeB = b["Start Time"];

            console.log('Comparing times:', timeA, timeB);

            let hA = typeof timeA === 'object' ? timeA.hours : parseInt(timeA.split(':')[0]);
            const mA = typeof timeA === 'object' ? timeA.minutes : parseInt(timeA.split(':')[1]);
            let hB = typeof timeB === 'object' ? timeB.hours : parseInt(timeB.split(':')[0]);
            const mB = typeof timeB === 'object' ? timeB.minutes : parseInt(timeB.split(':')[1]);

            if (hA !== hB) return hA - hB;
            return mA - mB;
        });

        // 3. Upcoming Deliverables
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const upcomingDeliverables: any[] = [];
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        const nextWeek = new Date(todayStart);
        nextWeek.setDate(todayStart.getDate() + 7);

        items.forEach(item => {
            if (currentCourses.some(c => c.id === item.course_id)) {
                if (item.data.due_date) {
                    const dueDateUTC = new Date(item.data.due_date);
                    const effectiveDueDate = new Date(
                        dueDateUTC.getUTCFullYear(),
                        dueDateUTC.getUTCMonth(),
                        dueDateUTC.getUTCDate()
                    );

                    if (effectiveDueDate >= todayStart && effectiveDueDate <= nextWeek) {
                        upcomingDeliverables.push({
                            ...item,
                            courseCode: currentCourses.find(c => c.id === item.course_id)?.code
                        });
                    }
                }
            }
        });

        upcomingDeliverables.sort((a, b) => new Date(a.data.due_date).getTime() - new Date(b.data.due_date).getTime());

        return (
            <div className="flex flex-col">
                <Modal
                    isOpen={isAddingItem}
                    onClose={() => setIsAddingItem(false)}
                    title="Quick Add Item"
                    onConfirm={handleSaveItem}
                    actions={
                        <>
                            <button className="btn" onClick={() => setIsAddingItem(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={handleSaveItem}>Save</button>
                        </>
                    }
                >
                    <div className="flex flex-col gap-4">
                        <div className="form-control w-full">
                            <label className="label mb-2">
                                <span className="label-text">Name</span>
                            </label>
                            <input
                                type="text"
                                className="input input-bordered w-full"
                                value={itemData.name}
                                onChange={(e) => setItemData({ ...itemData, name: e.target.value })}
                            />
                        </div>
                        <div className="form-control w-full">
                            <label className="label mb-2 flex items-center gap-2">
                                <span className="label-text">Type</span>
                            </label>
                            <select
                                className="select select-bordered w-full"
                                value={itemData.type}
                                onChange={(e) => setItemData({ ...itemData, type: e.target.value })}
                            >
                                {addingItemCourseId && getCourseTypes(addingItemCourseId).map((t: any) => <option key={t}>{t}</option>)}
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
                                    onChange={(e) => setItemData({ ...itemData, grade: e.target.value })}
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
                                    onChange={(e) => setItemData({ ...itemData, max_grade: e.target.value })}
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
                                value={itemData.due_date}
                                onChange={(e) => setItemData({ ...itemData, due_date: e.target.value })}
                            />
                        </div>
                    </div>
                </Modal>
                <div className="flex flex-col md:flex-row justify-between items-center sm:items-start md:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl justify-center sm:justify-start font-bold mb-4 flex items-center gap-2 ">
                            {currentTerm} Dashboard
                            <Link href="/help#grade-calculation" className="text-base opacity-30 hover:opacity-100 transition-opacity" title="How are grades calculated?">
                                <FontAwesomeIcon icon={faInfoCircle} />
                            </Link>
                        </h1>
                        {termAverage !== null ? (
                            <div className="flex flex-col gap-3">
                                <div className="flex sm:flex-row flex-col items-center gap-6 justify-center sm:justify-start">
                                    <div className="flex flex-row items-center justify-between sm:justify-start gap-6">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase tracking-wider opacity-50 font-bold mb-1">Term Average</span>
                                            <span className={"text-5xl font-black tracking-tighter leading-none" + (termAverage >= 80 ? " text-success" : termAverage >= 60 ? " text-warning" : " text-error")}>
                                                {termAverage.toFixed(1)}<span className="text-2xl opacity-40 ml-1">%</span>
                                            </span>
                                        </div>

                                        <div className="h-12 w-px bg-base-content/10"></div>

                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase tracking-wider opacity-50 font-bold mb-1">Term GPA</span>
                                            <span className="text-5xl font-black tracking-tighter leading-none">
                                                {termGPA?.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="hidden sm:block h-12 w-px bg-base-content/10"></div>

                                    <div className="flex flex-row items-center justify-between sm:justify-start gap-2 bg-base-200/50 p-1.5 card border border-base-content/5 w-fit sm:w-auto">
                                        <span className="text-xs font-bold uppercase tracking-wider text-base-content/50 mx-3">Goal</span>
                                        <div className="relative flex items-center flex-1 sm:flex-none justify-end">
                                            <input
                                                type="number"
                                                className="input input-lg w-24 text-right pr-6 bg-base-100 border-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none font-bold"
                                                placeholder="-"
                                                value={termGoal}
                                                onChange={(e) => setTermGoal(e.target.value)}
                                                onBlur={handleSaveGoal}
                                            />
                                            <span className="absolute right-2 text-sm opacity-50 pointer-events-none">%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-3 text-sm mt-1 justify-center sm:justify-start">
                                    {termMin !== null && termMax !== null && (
                                        <div className="flex gap-2 items-center bg-base-200/50 badge badge-lg border border-base-content/5">
                                            <div className="flex gap-2 items-center justify-center">
                                                <span className="opacity-50 font-bold uppercase tracking-wider text-sm">Range</span>
                                                <span className="font-bold text-sm">{termMin.toFixed(1)}% - {termMax.toFixed(1)}%</span>
                                            </div>
                                        </div>
                                    )}

                                    {requiredAverage !== null && (
                                        <div className="flex gap-2 items-center bg-base-200/50 badge badge-lg border border-base-content/5">
                                            <span className="opacity-50 font-bold uppercase tracking-wider text-sm">Req. Avg</span>
                                            <span className={`font-bold text-sm ${requiredAverage > 100 ? "text-error" : requiredAverage < 0 ? "text-success" : "text-info"}`}>
                                                {requiredAverage.toFixed(1)}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) :
                            <div className="text-sm mt-1 opacity-50 italic">
                                No grades available yet.
                            </div>}
                    </div>
                    {(cav !== null || cgpa !== null) && (
                        <div className="flex gap-6 items-end">
                            {cav !== null && (
                                <div className="flex flex-col items-center sm:items-end">
                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-0.5">Cumulative Avg</span>
                                    <span className={`text-2xl font-black tracking-tight leading-none ${cav >= 80 ? "text-success" : cav >= 60 ? "text-warning" : "text-error"}`}>
                                        {cav.toFixed(1)}<span className="text-sm opacity-50 ml-0.5">%</span>
                                    </span>
                                </div>
                            )}
                            {cgpa !== null && (
                                <div className="flex flex-col items-center sm:items-end">
                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-50 mb-0.5">Cumulative GPA</span>
                                    <span className="text-2xl font-black tracking-tight leading-none">
                                        {cgpa.toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row gap-6">
                    {/* Today's Classes */}
                    <div className="flex-1 card bg-base-100 shadow-sm border border-base-content/10">
                        <div className="card-body p-4">
                            <h3 className="card-title text-sm uppercase opacity-70 mb-2">
                                <FontAwesomeIcon icon={faClock} className="mr-2" />
                                Today&apos;s Classes
                            </h3>
                            {todaysClasses.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                    {todaysClasses.map((cls, i) => (
                                        <Link href={`/courses/${cls.courseId}`} key={i} className="flex items-center gap-3 p-3 card flex-row bg-base-200 hover:bg-base-300 transition-colors">
                                            <div className="flex-1">
                                                <div className="font-bold text-sm">{cls.courseCode}</div>
                                                <div className="text-xs opacity-70">{cls.Component} {cls.Section}</div>
                                            </div>
                                            <div className="text-right text-xs font-mono">
                                                <div>{formatTime(cls["Start Time"])} - {formatTime(cls["End Time"])}</div>
                                                <div className="opacity-50">{cls.Location}</div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm opacity-50 italic">No classes today.</div>
                            )}
                        </div>
                    </div>

                    {/* Upcoming Deliverables */}
                    <div className="flex-1 card bg-base-100 shadow-sm border border-base-content/10">
                        <div className="card-body p-4">
                            <h3 className="card-title text-sm uppercase opacity-70 mb-2">
                                <FontAwesomeIcon icon={faCalendarDay} className="mr-2" />
                                Upcoming Deliverables
                            </h3>
                            {upcomingDeliverables.length > 0 ? (
                                <div className="flex flex-col gap-2">
                                    {upcomingDeliverables.map((item, i) => (
                                        <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-base-200/50">
                                            <div className="flex-1">
                                                <div className="font-bold text-sm">{item.courseCode}</div>
                                                <div className="text-xs opacity-70">{item.data.name}</div>
                                            </div>
                                            <div className="text-right text-xs">
                                                <div className="font-bold text-error">
                                                    {new Date(item.data.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                </div>
                                                <div className="opacity-50">
                                                    {new Date(item.data.due_date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm opacity-50 italic">No upcoming deliverables.</div>
                            )}
                        </div>
                    </div>
                </div>

                <hr className="my-8 border border-base-content/10" />

                {/* Current Courses */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {currentCourses.map(course => {
                        const details = getCourseGradeDetails(course, items);
                        const currentGrade = details?.currentGrade;
                        const min = details ? details.currentScore : 0;
                        const max = details ? details.currentScore + (details.totalSchemeWeight - details.totalWeightGraded) : 0;

                        return (
                            <Link key={course.id} href={`/courses/${course.id}`} className="card bg-base-200 hover:bg-base-300 transition-colors shadow-sm border border-base-content/10">
                                <div className="card-body p-4">
                                    <h2 className="card-title justify-between text-base">
                                        {course.code}
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
                                            {currentGrade !== null && currentGrade !== undefined && (
                                                <div className={`badge ${currentGrade >= 80 ? 'badge-success text-success-content' : currentGrade >= 60 ? 'badge-warning text-warning-content' : 'badge-error text-error-content'} font-bold text-xs`}>
                                                    {currentGrade.toFixed(1)}%
                                                </div>
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
                                                <progress className="progress progress-error opacity-60 w-full h-1" value={min || 0} max="100"></progress>
                                                <progress className="progress progress-success opacity-60 w-full h-1" value={max || 0} max="100"></progress>
                                                <progress className="progress progress-primary w-full h-3" value={currentGrade || 0} max="100"></progress>
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
            </div >
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

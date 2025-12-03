"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useSession } from "next-auth/react";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getCourseGradeDetails } from "../../lib/grade-utils";
import { sendQuery } from "../../lib/graphql";
import {
  DELETE_COURSE_AND_ITEMS,
  DELETE_ITEM,
  INSERT_COURSES,
  INSERT_ITEMS,
  UPDATE_COURSE,
  UPDATE_COURSE_DATA,
  UPDATE_COURSE_SECTIONS,
  UPDATE_ITEM,
} from "../../lib/graphql/mutations";
import { GET_COURSES, GET_ITEMS } from "../../lib/graphql/queries";
import { sendTelemetry } from "../../lib/telemetry";
import { CATEGORY_COLORS } from "../../lib/constants";

export interface Course {
  id: string;
  code: string;
  term: string;
  credits: number;
  sections: Record<string, string>;
  data: {
    description: string;
    "schedule-info"?: any[];
    "marking-schemes"?: any[][];
    outline_url?: string;
    [key: string]: any;
  };
}

export interface Item {
  id: string;
  course_id: string;
  owner_id: string;
  data: {
    name: string;
    type: string;
    grade?: string;
    max_grade?: string;
    weight?: string;
    isPlaceholder?: boolean;
    due_date?: string;
    [key: string]: any;
  };
  last_modified: string;
}

interface CourseContextType {
  courses: Course[];
  items: Item[];
  courseGrades: Map<string, ReturnType<typeof getCourseGradeDetails>>;
  fetchCourses: () => Promise<void>;
  optimisticCourse?: Course | null;
  setOptimisticCourse: (c: Course | null) => void;
  addCourse: (
    code: string,
    term: string,
    data: object,
    owner_id: string,
  ) => Promise<string | undefined>;
  deleteCourse: (id: string) => Promise<void>;
  updateCourse: (
    id: string,
    data: Partial<{
      code: string;
      term: string;
      credits: number;
    }>,
  ) => Promise<void>;
  updateSections: (
    courseId: string,
    component: string,
    section: string,
  ) => Promise<void>;
  updateMarkingSchemes: (
    courseId: string,
    newSchemes: any[][],
  ) => Promise<void>;
  updateCourseData: (courseId: string, newData: any) => Promise<void>;
  addItem: (courseId: string, data: object, owner_id: string) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  updateItem: (id: string, data: object) => Promise<void>;
  loading: boolean;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

export function CourseProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const [courses, setCourses] = useState<Course[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimisticCourse, setOptimisticCourse] = useState<Course | null>(null);

  const courseGrades = useMemo(() => {
    const grades = new Map<string, ReturnType<typeof getCourseGradeDetails>>();
    courses.forEach((c) => {
      grades.set(c.id, getCourseGradeDetails(c, items));
    });
    return grades;
  }, [courses, items]);

  async function fetchItems() {
    if (!session?.user?.id) return;

    try {
      const json = await sendQuery({
        query: GET_ITEMS,
        variables: { owner_id: session.user.id },
      });
      if (json.data?.items) {
        setItems(json.data.items);
      }
    } catch {
      // ignore
    }
  }

  async function fetchCourses() {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      await fetchItems(); // Fetch items as well

      const json = await sendQuery({
        query: GET_COURSES,
        variables: { owner_id: session.user.id },
      });
      if (json.data?.courses) {
        const seasonOrder: Record<string, number> = {
          Winter: 1,
          Spring: 2,
          Summer: 3,
          Fall: 4,
        };

        const sortedCourses = json.data.courses.sort((a: Course, b: Course) => {
          const partsA = a.term.split(" ");
          const partsB = b.term.split(" ");

          if (partsA.length === 2 && partsB.length === 2) {
            const [seasonA, yearA] = partsA;
            const [seasonB, yearB] = partsB;

            const yA = parseInt(yearA);
            const yB = parseInt(yearB);

            if (yA !== yB) return yA - yB;

            const sA = seasonOrder[seasonA] || 99;
            const sB = seasonOrder[seasonB] || 99;

            if (sA !== sB) return sA - sB;
          }

          if (a.term !== b.term) return a.term.localeCompare(b.term);
          return a.code.localeCompare(b.code);
        });

        setCourses(sortedCourses);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      setLoading(false);
      return;
    }
    if (session) {
      fetchCourses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status]);

  async function addCourse(
    code: string,
    term: string,
    data: object,
    owner_id: string,
  ) {
    setLoading(true);
    try {
      const json = await sendQuery({
        query: INSERT_COURSES,
        variables: { code: code, term: term, data: data, owner_id: owner_id },
      });
      await fetchCourses();
      return json.data?.insert_courses?.returning?.[0]?.id;
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function deleteCourse(id: string) {
    try {
      // First delete any items attached to this course to avoid FK issues
      const json = await sendQuery({
        query: DELETE_COURSE_AND_ITEMS,
        variables: { id: id },
      });
      if (json.data?.delete_courses_by_pk) {
        await fetchCourses();
      }
    } catch {
      // ignore
    }
  }

  async function updateCourse(
    id: string,
    data: Partial<{
      code: string;
      term: string;
      credits: number;
    }>,
  ) {
    // Optimistic update
    setCourses(courses.map((c) => (c.id === id ? { ...c, ...data } : c)));

    try {
      const json = await sendQuery({
        query: UPDATE_COURSE,
        variables: { id: id, _set: data },
      });
      if (!json.data?.update_courses_by_pk) {
        fetchCourses();
      }
    } catch {
      fetchCourses();
    }
  }

  async function updateSections(
    courseId: string,
    component: string,
    section: string,
  ) {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    const newSections = { ...(course.sections || {}), [component]: section };

    // Optimistic update
    setCourses(
      courses.map((c) =>
        c.id === courseId ? { ...c, sections: newSections } : c,
      ),
    );

    const json = await sendQuery({
      query: UPDATE_COURSE_SECTIONS,
      variables: { id: courseId, sections: newSections },
    });
    if (!json.data?.update_courses_by_pk) {
      fetchCourses();
    } else {
      // Telemetry - selecting an individual section component
      sendTelemetry("select_sections", {
        course_id: courseId,
        component,
        section,
      });
    }
  }

  async function updateMarkingSchemes(courseId: string, newSchemes: any[][]) {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    const oldSchemes = course.data["marking-schemes"] || [];
    const newData = { ...course.data, "marking-schemes": newSchemes };

    // Detect renamed components (by position in the first scheme if present)
    const mapping: Record<string, string> = {};
    try {
      const oldFirst = Array.isArray(oldSchemes[0]) ? oldSchemes[0] : [];
      const newFirst = Array.isArray(newSchemes[0]) ? newSchemes[0] : [];
      const len = Math.min(oldFirst.length, newFirst.length);
      for (let i = 0; i < len; i++) {
        const oldName = oldFirst[i]?.Component;
        const newName = newFirst[i]?.Component;
        if (oldName && newName && oldName !== newName) {
          mapping[oldName] = newName;
        }
      }
    } catch {
      // ignore mapping errors
    }

    // Optimistic update for course data
    setCourses(
      courses.map((c) => (c.id === courseId ? { ...c, data: newData } : c)),
    );

    // If any components were renamed, optimistically update local items and schedule API updates
    const itemsToUpdate: { id: string; newType: string; data: any }[] = [];
    if (Object.keys(mapping).length > 0) {
      setItems((prev) =>
        prev.map((it) => {
          if (it.course_id === courseId && mapping[it.data.type]) {
            const newType = mapping[it.data.type];
            itemsToUpdate.push({
              id: it.id,
              newType,
              data: { ...it.data, type: newType },
            });
            return { ...it, data: { ...it.data, type: newType } };
          }
          return it;
        }),
      );
    }

    const json = await sendQuery({
      query: UPDATE_COURSE_DATA,
      variables: { id: courseId, data: newData },
    });
    if (!json.data?.update_courses_by_pk) {
      fetchCourses();
    }
    // telemetry: marking scheme saved
    try {
      sendTelemetry("save_marking_scheme", {
        course_id: courseId,
        schemes_count: (newSchemes || []).length,
      });
    } catch {
      // swallow telemetry error
    }

    // Perform API updates for renamed item types
    if (itemsToUpdate.length > 0) {
      try {
        // Update each affected item (sequentially to keep server load reasonable)
        for (const u of itemsToUpdate) {
          try {
            await updateItem(u.id, u.data);
          } catch {
            // ignore individual item update errors
          }
        }
      } catch {
        // ignore
      }
    }
  }

  async function updateCourseData(courseId: string, newData: any) {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    const mergedData = { ...course.data, ...newData };

    // Optimistic update
    setCourses(
      courses.map((c) => (c.id === courseId ? { ...c, data: mergedData } : c)),
    );

    const json = await sendQuery({
      query: UPDATE_COURSE_DATA,
      variables: { id: courseId, data: mergedData },
    });
    if (!json.data?.update_courses_by_pk) {
      fetchCourses();
    }
  }

  async function addItem(courseId: string, data: object, owner_id: string) {
    try {
      const json = await sendQuery({
        query: INSERT_ITEMS,
        variables: { data: data, owner_id: owner_id, course_id: courseId },
      });
      if (json.data?.insert_items?.returning) {
        await fetchItems();
        // telemetry - item created
        try {
          const d: any = data as any;
          sendTelemetry("create_item", {
            course_id: courseId,
            type: d?.type,
            isPlaceholder: !!d?.isPlaceholder,
          });
        } catch {
          // ignore telemetry failure
        }
      }
    } catch {
      // ignore
    }
  }

  async function deleteItem(id: string) {
    try {
      const json = await sendQuery({
        query: DELETE_ITEM,
        variables: { id: id },
      });
      if (json.data?.delete_items_by_pk) {
        // telemetry - item deleted
        try {
          const item = items.find((i) => i.id === id);
          sendTelemetry("delete_item", {
            course_id: item?.course_id,
            type: item?.data?.type,
            isPlaceholder: !!item?.data?.isPlaceholder,
          });
        } catch {
          // ignore telemetry failure
        }
        await fetchItems();
      }
    } catch {
      // ignore
    }
  }

  async function updateItem(id: string, data: object) {
    try {
      const json = await sendQuery({
        query: UPDATE_ITEM,
        variables: { id: id, data: data },
      });
      if (json.data?.update_items_by_pk) {
        await fetchItems();
        // telemetry - item edited
        try {
          const item = items.find((i) => i.id === id);
          const d: any = data as any;
          sendTelemetry("edit_item", {
            id,
            course_id: item?.course_id,
            type: d?.type ?? item?.data?.type,
          });
        } catch {
          // ignore
        }
      }
    } catch {
      // ignore
    }
  }

  return (
    <CourseContext.Provider
      value={{
        courses,
        items,
        courseGrades,
        fetchCourses,
        addCourse,
        deleteCourse,
        updateCourse,
        updateSections,
        updateMarkingSchemes,
        updateCourseData,
        addItem,
        deleteItem,
        updateItem,
        loading,
        optimisticCourse,
        setOptimisticCourse,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
}
export function useCourses() {
  const context = useContext(CourseContext);
  if (context === undefined) {
    throw new Error("useCourses must be used within a CourseProvider");
  }
  return context;
}

export function getCategoryColor(name: string, types: any[]): string {
  if (!name || !types) {
    return CATEGORY_COLORS[Math.floor(Math.random() * CATEGORY_COLORS.length)];
  }

  const sorted = [...types].sort();
  const index = sorted.indexOf(name);

  let hash = 0;
  const s = String(types[0]);
  for (let i = 0; i < s.length; i++) {
    hash = s.charCodeAt(i) + ((hash << 5) - hash);
  }
  const offset = Math.abs(hash) % CATEGORY_COLORS.length;

  if (index === -1) return CATEGORY_COLORS[offset];
  return CATEGORY_COLORS[(index + offset) % CATEGORY_COLORS.length];
}

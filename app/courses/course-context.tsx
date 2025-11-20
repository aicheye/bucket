"use client";

import { useSession } from "next-auth/react";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

interface Course {
  id: string;
  code: string;
  term: string;
  sections: Record<string, string>;
  data: {
    description: string;
    "schedule-info"?: any[];
    "marking-schemes"?: any[][];
    outline_url?: string;
    [key: string]: any;
  };
}

interface CourseContextType {
  courses: Course[];
  fetchCourses: () => Promise<void>;
  addCourse: (code: string, term: string, data: object, owner_id: string) => Promise<string | undefined>;
  deleteCourse: (id: string) => Promise<void>;
  updateSections: (courseId: string, component: string, section: string) => Promise<void>;
  updateMarkingSchemes: (courseId: string, newSchemes: any[][]) => Promise<void>;
}

const CourseContext = createContext<CourseContextType | undefined>(undefined);

export function CourseProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const [courses, setCourses] = useState<Course[]>([]);

  async function fetchCourses() {
    if (!session?.user?.id) return;

    const query = `query GetCourses($owner_id: String!) {
      courses(where: {owner_id: {_eq: $owner_id}}) {
        id
        code
        term
        data
        sections
      }
    }`;

    const res = await fetch("/api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: query,
        variables: {
          owner_id: session.user.id,
        },
      }),
    });

    const json = await res.json();
    if (json.data?.courses) {
      const seasonOrder: Record<string, number> = {
        "Winter": 1,
        "Spring": 2,
        "Summer": 3,
        "Fall": 4
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
    } else {
      console.error("Failed to fetch courses", json);
    }
  }

  useEffect(() => {
    if (session) {
      fetchCourses();
    }
  }, [session]);

  async function addCourse(code: string, term: string, data: object, owner_id: string) {
    const mutation = `mutation InsertCourses($data: jsonb, $code: String, $owner_id: String, $term: String) {
      insert_courses(objects: {data: $data, code: $code, owner_id: $owner_id, term: $term}) {
        affected_rows
        returning {
          data
          code
          owner_id
          term
          id
        }
      }
    }`;

    const res = await fetch("/api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          code: code,
          term: term,
          data: data,
          owner_id: owner_id,
        },
      }),
    });

    const json = await res.json();
    console.log("Add course response:", json);
    await fetchCourses();
    return json.data?.insert_courses?.returning?.[0]?.id;
  }

  async function deleteCourse(id: string) {
    const mutation = `mutation DeleteCourse($id: uuid!) {
      delete_courses_by_pk(id: $id) {
        id
      }
    }`;
    
    const res = await fetch("/api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          id: id,
        },
      }),
    });

    const json = await res.json();
    if (json.data?.delete_courses_by_pk) {
      await fetchCourses();
    } else {
      console.error("Failed to delete course", json);
    }
  }

  async function updateSections(courseId: string, component: string, section: string) {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    const newSections = { ...(course.sections || {}), [component]: section };

    // Optimistic update
    setCourses(courses.map(c => c.id === courseId ? { ...c, sections: newSections } : c));

    const mutation = `mutation UpdateCourseSections($id: uuid!, $sections: jsonb) {
      update_courses_by_pk(pk_columns: {id: $id}, _set: {sections: $sections}) {
        id
        sections
      }
    }`;

    const res = await fetch("/api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          id: courseId,
          sections: newSections,
        },
      }),
    });

    const json = await res.json();
    if (!json.data?.update_courses_by_pk) {
      console.error("Failed to update sections", json);
      fetchCourses();
    }
  }

  async function updateMarkingSchemes(courseId: string, newSchemes: any[][]) {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    const newData = { ...course.data, "marking-schemes": newSchemes };

    // Optimistic update
    setCourses(courses.map(c => c.id === courseId ? { ...c, data: newData } : c));

    const mutation = `mutation UpdateCourseData($id: uuid!, $data: jsonb) {
      update_courses_by_pk(pk_columns: {id: $id}, _set: {data: $data}) {
        id
        data
      }
    }`;

    const res = await fetch("/api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          id: courseId,
          data: newData,
        },
      }),
    });

    const json = await res.json();
    if (!json.data?.update_courses_by_pk) {
      console.error("Failed to update marking schemes", json);
      fetchCourses();
    }
  }

  return (
    <CourseContext.Provider value={{ courses, fetchCourses, addCourse, deleteCourse, updateSections, updateMarkingSchemes }}>
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

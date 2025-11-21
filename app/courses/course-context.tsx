"use client";

import { useSession } from "next-auth/react";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

export interface Course {
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
        due_date?: string;
        [key: string]: any;
    };
    last_modified: string;
}

interface CourseContextType {
    courses: Course[];
    items: Item[];
    fetchCourses: () => Promise<void>;
    addCourse: (code: string, term: string, data: object, owner_id: string) => Promise<string | undefined>;
    deleteCourse: (id: string) => Promise<void>;
    updateSections: (courseId: string, component: string, section: string) => Promise<void>;
    updateMarkingSchemes: (courseId: string, newSchemes: any[][]) => Promise<void>;
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

    async function fetchItems() {
        if (!session?.user?.id) return;

        try {
            const query = `query GetItems($owner_id: String!) {
                items(where: {owner_id: {_eq: $owner_id}}) {
                    id
                    course_id
                    owner_id
                    data
                    last_modified
                }
            }`;

            const res = await fetch("/api/graphql", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: query,
                    variables: { owner_id: session.user.id },
                }),
            });

            const json = await res.json();
            if (json.data?.items) {
                setItems(json.data.items);
            } else {
                console.error("Failed to fetch items", json);
            }
        } catch (error) {
            console.error("Error fetching items:", error);
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
        } catch (error) {
            console.error("Error fetching courses:", error);
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
    }, [session, status]);

    async function addCourse(code: string, term: string, data: object, owner_id: string) {
        setLoading(true);
        try {
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
        } catch (error) {
            console.error("Error adding course:", error);
        } finally {
            setLoading(false);
        }
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

    async function updateCourseData(courseId: string, newData: any) {
        const course = courses.find((c) => c.id === courseId);
        if (!course) return;

        const mergedData = { ...course.data, ...newData };

        // Optimistic update
        setCourses(courses.map(c => c.id === courseId ? { ...c, data: mergedData } : c));

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
                    data: mergedData,
                },
            }),
        });

        const json = await res.json();
        if (!json.data?.update_courses_by_pk) {
            console.error("Failed to update course data", json);
            fetchCourses();
        }
    }

    async function addItem(courseId: string, data: object, owner_id: string) {
        try {
            const mutation = `mutation InsertItems($data: jsonb, $owner_id: String, $course_id: uuid) {
                insert_items(objects: {data: $data, owner_id: $owner_id, course_id: $course_id}) {
                    affected_rows
                    returning {
                        data
                        owner_id
                        last_modified
                        course_id
                        id
                    }
                }
            }`;

            const res = await fetch("/api/graphql", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: mutation,
                    variables: {
                        data: data,
                        owner_id: owner_id,
                        course_id: courseId,
                    },
                }),
            });

            const json = await res.json();
            if (json.data?.insert_items?.returning) {
                await fetchItems();
            } else {
                console.error("Failed to add item", json);
            }
        } catch (error) {
            console.error("Error adding item:", error);
        }
    }

    async function deleteItem(id: string) {
        try {
            const mutation = `mutation DeleteItem($id: uuid!) {
                delete_items_by_pk(id: $id) {
                    id
                }
            }`;

            const res = await fetch("/api/graphql", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: mutation,
                    variables: { id: id },
                }),
            });

            const json = await res.json();
            if (json.data?.delete_items_by_pk) {
                await fetchItems();
            } else {
                console.error("Failed to delete item", json);
            }
        } catch (error) {
            console.error("Error deleting item:", error);
        }
    }

    async function updateItem(id: string, data: object) {
        try {
            const mutation = `mutation UpdateItem($id: uuid!, $data: jsonb) {
                update_items_by_pk(pk_columns: {id: $id}, _set: {data: $data}) {
                    id
                    data
                }
            }`;

            const res = await fetch("/api/graphql", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: mutation,
                    variables: {
                        id: id,
                        data: data,
                    },
                }),
            });

            const json = await res.json();
            if (json.data?.update_items_by_pk) {
                await fetchItems();
            } else {
                console.error("Failed to update item", json);
            }
        } catch (error) {
            console.error("Error updating item:", error);
        }
    }

    return (
        <CourseContext.Provider value={{ courses, items, fetchCourses, addCourse, deleteCourse, updateSections, updateMarkingSchemes, updateCourseData, addItem, deleteItem, updateItem, loading }}>
            {children}
        </CourseContext.Provider>
    );
} export function useCourses() {
    const context = useContext(CourseContext);
    if (context === undefined) {
        throw new Error("useCourses must be used within a CourseProvider");
    }
    return context;
}

export const CATEGORY_COLORS = [
    "bg-red-600",
    "bg-orange-600",
    "bg-amber-600",
    "bg-yellow-600",
    "bg-lime-600",
    "bg-green-600",
    "bg-emerald-600",
    "bg-teal-600",
    "bg-cyan-600",
    "bg-sky-600",
    "bg-blue-600",
    "bg-indigo-600",
    "bg-violet-600",
    "bg-purple-600",
    "bg-fuchsia-600",
    "bg-pink-600",
    "bg-rose-600",
    "bg-slate-600",
    "bg-gray-600",
    "bg-stone-600",
    "bg-zinc-600",
];

const assignedColors: Record<string, string> = {};
const usedIndices: Record<number, string> = {};

export function getCategoryColor(name: string) {
    if (assignedColors[name]) return assignedColors[name];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    let index = Math.abs(hash) % CATEGORY_COLORS.length;
    const startIndex = index;

    while (usedIndices[index] !== undefined && usedIndices[index] !== name) {
        index = (index + 1) % CATEGORY_COLORS.length;
        if (index === startIndex) {
            return CATEGORY_COLORS[startIndex];
        }
    }

    usedIndices[index] = name;
    assignedColors[name] = CATEGORY_COLORS[index];
    return assignedColors[name];
}

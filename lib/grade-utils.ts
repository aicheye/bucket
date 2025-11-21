import { Course, Item } from "../app/courses/course-context";

export function calculateSchemeGradeDetails(
    scheme: any[],
    courseItems: Item[],
    placeholderGrades: Record<string, number>,
    dropLowest: Record<string, number>
) {
    let totalWeightGraded = 0;
    let totalScore = 0;
    let totalSchemeWeight = 0;

    scheme.forEach(component => {
        const weight = parseFloat(component.Weight);
        if (isNaN(weight)) return;
        totalSchemeWeight += weight;

        const compItems = courseItems.filter(i => i.data.type === component.Component && i.data.grade && i.data.max_grade);

        if (compItems.length === 0) {
            // Use placeholder if available
            const placeholder = placeholderGrades[component.Component];
            if (placeholder !== undefined && !isNaN(placeholder)) {
                totalScore += (placeholder / 100) * weight;
                totalWeightGraded += weight;
            }
            return;
        }

        const scores = compItems.map(i => {
            const g = parseFloat(i.data.grade || "0");
            const m = parseFloat(i.data.max_grade || "0");
            return { grade: g, max: m, ratio: m > 0 ? g / m : 0 };
        });

        // Sort by ratio ascending (worst first)
        scores.sort((a, b) => a.ratio - b.ratio);

        const dropCount = dropLowest[component.Component] || 0;
        const keptScores = scores.slice(dropCount);

        if (keptScores.length === 0) {
            if (scores.length > 0) {
                // All items were dropped, treat as 100%
                totalScore += weight;
                totalWeightGraded += weight;
            }
            return;
        }

        // Calculate component score
        const sumGrade = keptScores.reduce((acc, s) => acc + s.grade, 0);
        const sumMax = keptScores.reduce((acc, s) => acc + s.max, 0);

        if (sumMax > 0) {
            const componentScore = (sumGrade / sumMax) * weight;
            totalScore += componentScore;
            totalWeightGraded += weight;
        }
    });

    return {
        currentGrade: totalWeightGraded > 0 ? (totalScore / totalWeightGraded * 100) : null,
        currentScore: totalScore,
        totalWeightGraded: totalWeightGraded,
        totalSchemeWeight: totalSchemeWeight
    };
}

export function calculateSchemeGrade(
    scheme: any[],
    courseItems: Item[],
    placeholderGrades: Record<string, number>,
    dropLowest: Record<string, number>
): number | null {
    const details = calculateSchemeGradeDetails(scheme, courseItems, placeholderGrades, dropLowest);
    return details.currentGrade;
}

export function getBestCourseGrade(course: Course, allItems: Item[]): number | null {
    const courseItems = allItems.filter(i => i.course_id === course.id);
    const schemes = course.data["marking-schemes"] || [];
    const placeholderGrades = course.data.placeholder_grades || {};
    const dropLowest = course.data.drop_lowest || {};

    if (!schemes || schemes.length === 0) return null;

    let bestGrade = -1;
    let hasGrade = false;

    for (const scheme of schemes) {
        const grade = calculateSchemeGrade(scheme, courseItems, placeholderGrades, dropLowest);
        if (grade !== null) {
            hasGrade = true;
            if (grade > bestGrade) {
                bestGrade = grade;
            }
        }
    }

    return hasGrade ? bestGrade : null;
}

export function getCourseGradeDetails(course: Course, allItems: Item[]) {
    const courseItems = allItems.filter(i => i.course_id === course.id);
    const schemes = course.data["marking-schemes"] || [];
    const placeholderGrades = course.data.placeholder_grades || {};
    const dropLowest = course.data.drop_lowest || {};

    if (!schemes || schemes.length === 0) return null;

    let bestDetails = null;
    let bestGrade = -1;

    for (const scheme of schemes) {
        const details = calculateSchemeGradeDetails(scheme, courseItems, placeholderGrades, dropLowest);
        if (details.currentGrade !== null) {
            if (details.currentGrade > bestGrade) {
                bestGrade = details.currentGrade;
                bestDetails = details;
            }
        }
    }

    return bestDetails;
}

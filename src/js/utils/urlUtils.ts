import type {Repository} from '../types/github';
import type {LessonPlan} from "../types/lessonPlan";

/**
 * Extracts the optional category and the lesson filename from a lesson plan path
 * @param path The full path of the lesson plan
 * @returns An object with the lesson and, for the legacy unit layout, the category
 */
export const extractLessonPathParts = (path: string): { category?: string, lesson: string } => {
    const pathParts = path.split('/');

    // Current format: _lesson-plans/lesson-file.md
    if (pathParts.length === 2 && pathParts[0] === '_lesson-plans') {
        return {lesson: pathParts[1]};
    }

    // Legacy format: _lesson-plans/category/topics/lesson-file.md
    if (pathParts.length >= 4 && pathParts[0] === '_lesson-plans') {
        const category = pathParts[1];
        const lesson = pathParts[pathParts.length - 1];
        return {category, lesson};
    }

    // If the path doesn't match the expected format, throw an error
    throw new Error(`Invalid lesson plan path: ${path}`);
};

/**
 * Generates the URL for a repository and lesson plan
 * @param repo The GitHub repository
 * @param lessonPlan The lesson plan
 * @param branch The branch name (optional, uses default branch if not provided)
 * @returns The URL to use for navigation
 */
export const generateLessonPlanUrl = (repo: Repository, lessonPlan: LessonPlan, branch?: string): string => {
    const pathParts = extractLessonPathParts(lessonPlan.path);
    const branchName = branch || repo.default_branch;
    const base = `/editor/${repo.owner.login}/${repo.name}/${branchName}`;
    return pathParts.category ? `${base}/${pathParts.category}/${pathParts.lesson}` : `${base}/${pathParts.lesson}`;
};

/**
 * Constructs a full lesson plan path from URL parameters
 * @param category The category from URL (only present for the legacy unit layout)
 * @param lesson The lesson filename from URL
 * @returns The full path to the lesson plan file
 */
export const constructLessonPath = (category: string | undefined, lesson: string): string => {
    return category ? `_lesson-plans/${category}/topics/${lesson}` : `_lesson-plans/${lesson}`;
};

import {useQuery} from '@tanstack/react-query';
import lessonPlanService from './lessonPlanService';
import githubService from './githubService';
import type {LessonPlan} from "../types/lessonPlan";

/**
 * React Query hook to fetch lesson plan content
 * @param filePath Path to the markdown file
 * @param owner Repository owner
 * @param repo Repository name
 * @param branch Branch name
 * @returns Query result with lesson plan content
 */
export const useLessonPlanContent = (filePath: string, owner?: string, repo?: string, branch?: string) => {
    return useQuery<LessonPlan, Error>({
        queryKey: ['lessonPlanContent', filePath, owner, repo, branch],
        queryFn: async () => {
            if (!owner || !repo || !branch) {
                throw new Error('Repository information is required');
            }
            return lessonPlanService.getLessonPlan(filePath, owner, repo, branch);
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: !!filePath && !!owner && !!repo && !!branch, // Only fetch when all params are provided
    });
};

/**
 * React Query hook to fetch all lesson plans
 * @param owner Repository owner
 * @param repo Repository name
 * @param branch Branch name
 * @returns Query result with all lesson plans
 */
export const useLessonPlans = (owner?: string, repo?: string, branch?: string) => {
    return useQuery<LessonPlan[], Error>({
        queryKey: ['lessonPlans', owner, repo, branch],
        queryFn: () => {
            if (!owner || !repo || !branch) {
                // Return empty array instead of throwing an error
                return Promise.resolve([]);
            }
            return lessonPlanService.getLessonPlans(owner, repo, branch);
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: githubService.isAuthenticated() && !!owner && !!repo && !!branch, // Only run if authenticated and all params provided
    });
};

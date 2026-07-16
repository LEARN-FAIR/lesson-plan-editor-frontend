/**
 * Lesson Plan service for handling lesson plan operations
 */

import apiAdapter from './apiAdapter';
import githubService from './githubService';
import type {LessonPlan} from "../types/lessonPlan";
import logger from '../utils/logger';

class LessonPlanService {

    /**
     * Get all lesson plans from the repository by recursively searching through the directory structure
     */
    async getLessonPlans(owner?: string, repo?: string, branch?: string): Promise<LessonPlan[]> {
        // Check if we are authenticated with GitHub
        if (!githubService.isAuthenticated()) {
            throw new Error('Not authenticated with GitHub');
        }

        if (!owner || !repo) {
            throw new Error('Repository owner and name are required');
        }

        if (!branch) {
            throw new Error('Branch is required');
        }

        try {
            const selectedBranch = branch;

            // Get lesson plans from the backend API via the adapter
            const lessonPlans = await apiAdapter.getLessonPlans(
                owner,
                repo,
                selectedBranch
            );
            
            return lessonPlans;
        } catch (error) {
            logger.error('Error fetching lesson plans:', error);

            // If the folder doesn't exist, return an empty array
            if ((error as any).status === 404) {
                return [];
            }

            throw error;
        }
    }

    // Category info is now handled by the backend

    /**
     * Get a specific lesson plan by path
     */
    async getLessonPlan(path: string, owner?: string, repo?: string, branch?: string): Promise<LessonPlan> {
        // Check if we are authenticated with GitHub
        if (!githubService.isAuthenticated()) {
            throw new Error('Not authenticated with GitHub');
        }

        if (!owner || !repo) {
            throw new Error('Repository owner and name are required');
        }

        if (!branch) {
            throw new Error('Branch is required');
        }

        try {
            const selectedBranch = branch;

            // Get lesson plan from the backend API via the adapter
            const lessonPlan = await apiAdapter.getLessonPlan(
                owner,
                repo,
                path,
                selectedBranch
            );
            
            return lessonPlan;
        } catch (error) {
            logger.error('Error fetching lesson plan:', error);
            throw error;
        }
    }

}

// Create singleton instance
const lessonPlanService = new LessonPlanService();
export default lessonPlanService;

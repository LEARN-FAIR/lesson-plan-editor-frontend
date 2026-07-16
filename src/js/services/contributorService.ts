import apiAdapter from './apiAdapter';
import logger from '../utils/logger';
import customContributorService, { type CustomContributor } from './customContributorService';

export interface Contributor {
    id: string;
    orcid?: string;
    firstName: string;
    lastName: string;
    git?: string;
    isCustom?: boolean; // Flag to identify custom contributors
}

/**
 * Fetch contributors for the specified repository and branch
 * Merges custom contributors from localStorage with fetched contributors
 * @param owner Repository owner
 * @param repo Repository name
 * @param branch Branch name
 * @returns Promise<Contributor[]> Array of contributors (fetched + custom)
 */
export const fetchContributors = async (owner?: string, repo?: string, branch?: string): Promise<Contributor[]> => {
    try {
        let fetchedContributors: Contributor[] = [];
        
        // Only fetch from API if we have owner and repo
        if (owner && repo) {
            // Use the ApiAdapter to fetch contributors
            fetchedContributors = await apiAdapter.getContributors(
                owner,
                repo,
                branch || undefined
            ) as Contributor[];
        }
        
        // Get custom contributors from localStorage
        const customContributors = customContributorService.getCustomContributors();
        
        // Merge fetched and custom contributors
        // Custom contributors come first so they appear at the top of the list
        const allContributors = [...customContributors, ...fetchedContributors];
        
        logger.log(`Loaded ${fetchedContributors.length} fetched + ${customContributors.length} custom contributors`);
        
        return allContributors;
    } catch (error) {
        logger.error('Error fetching contributors:', error);
        // Still return custom contributors even if API fails
        return customContributorService.getCustomContributors();
    }
};

export const getContributorDisplayName = (contributor: Contributor): string => {
    return `${contributor.firstName} ${contributor.lastName} (${contributor.id})`;
};

/**
 * Service for managing custom contributors that are not in the main contributors list
 * Custom contributors are cached in localStorage and included in commits
 */

import logger from '../utils/logger';

export interface CustomContributor {
    id: string; // ORCID or generated ID
    orcid?: string;
    firstName: string;
    lastName: string;
    git?: string;
    isCustom: true; // Flag to identify custom contributors
}

const STORAGE_KEY = 'custom_contributors';

class CustomContributorService {
    /**
     * Get all custom contributors from localStorage
     */
    getCustomContributors(): CustomContributor[] {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) {
                return [];
            }
            return JSON.parse(stored) as CustomContributor[];
        } catch (error) {
            logger.error('Error loading custom contributors:', error);
            return [];
        }
    }

    /**
     * Add a new custom contributor
     */
    addCustomContributor(contributor: Omit<CustomContributor, 'isCustom'>): CustomContributor {
        const customContributors = this.getCustomContributors();
        
        // Check if contributor already exists
        const existingIndex = customContributors.findIndex(c => c.id === contributor.id);
        
        const newContributor: CustomContributor = {
            ...contributor,
            isCustom: true
        };
        
        if (existingIndex >= 0) {
            // Update existing contributor
            customContributors[existingIndex] = newContributor;
            logger.log('Updated existing custom contributor:', newContributor);
        } else {
            // Add new contributor
            customContributors.push(newContributor);
            logger.log('Added new custom contributor:', newContributor);
        }
        
        this.saveCustomContributors(customContributors);
        return newContributor;
    }

    /**
     * Remove a custom contributor
     */
    removeCustomContributor(id: string): void {
        const customContributors = this.getCustomContributors();
        const filtered = customContributors.filter(c => c.id !== id);
        this.saveCustomContributors(filtered);
        logger.log('Removed custom contributor:', id);
    }

    /**
     * Save custom contributors to localStorage
     */
    private saveCustomContributors(contributors: CustomContributor[]): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(contributors));
        } catch (error) {
            logger.error('Error saving custom contributors:', error);
        }
    }

    /**
     * Clear all custom contributors
     */
    clearCustomContributors(): void {
        localStorage.removeItem(STORAGE_KEY);
        logger.log('Cleared all custom contributors');
    }

    /**
     * Generate a unique ID for a contributor without ORCID
     */
    generateId(firstName: string, lastName: string): string {
        // Create a simple ID from name and timestamp
        const nameSlug = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`.replace(/[^a-z0-9-]/g, '');
        const timestamp = Date.now();
        return `custom-${nameSlug}-${timestamp}`;
    }

    /**
     * Convert custom contributors to YAML format for _data/contributors.yaml
     */
    toYamlFormat(contributors: CustomContributor[]): Record<string, any> {
        const yamlData: Record<string, any> = {};
        
        contributors.forEach(contributor => {
            yamlData[contributor.id] = {
                orcid: contributor.orcid || null,
                firstName: contributor.firstName,
                lastName: contributor.lastName,
                git: contributor.git || null
            };
        });
        
        return yamlData;
    }
}

// Create singleton instance
const customContributorService = new CustomContributorService();
export default customContributorService;

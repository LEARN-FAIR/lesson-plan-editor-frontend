import { useQuery } from '@tanstack/react-query';
import type { Branch, Repository } from '../types/github';
import { useAuth } from '../contexts/AuthContext';
import apiAdapter from './apiAdapter';

/**
 * React Query hook to fetch repositories and forks
 * @returns Query result with repositories data
 */
export const useRepositoriesAndForks = () => {
    return useQuery<Repository[], Error>({
        queryKey: ['repositories'],
        queryFn: () => apiAdapter.getTargetRepoAndForks(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: true, // Always fetch repositories when the component mounts
    });
};

/**
 * React Query hook to fetch branches
 * @param owner The repository owner
 * @param repo The repository name
 * @returns Query result with branches data
 */
export const useBranches = (owner?: string, repo?: string) => {
    return useQuery<Branch[], Error>({
        queryKey: ['branches', owner, repo],
        queryFn: async () => {
            if (!owner || !repo) {
                return [];
            }
            return await apiAdapter.getRepositoryBranches(owner, repo);
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
        enabled: !!owner && !!repo, // Only run the query if owner and repo are provided
    });
};

/**
 * Enhanced React Query hook for repositories that can replace RepositoryContext
 * This hook provides the same interface as useRepositories from RepositoryContext
 * but uses React Query directly without the context wrapper
 */
export const useRepositories = () => {
    // Get authentication state from AuthContext (still needed)
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    
    // Use React Query to fetch repositories
    const {
        data: repositories = [],
        isLoading: reposLoading,
        error,
        refetch
    } = useQuery<Repository[], Error>({
        queryKey: ['repositories', isAuthenticated], // Add isAuthenticated as part of the key
        queryFn: () => apiAdapter.getTargetRepoAndForks(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: isAuthenticated, // Only fetch if authenticated
    });

    // Calculate combined loading state
    const isLoading = authLoading || (isAuthenticated && reposLoading);

    return {
        repositories,
        isLoading,
        error: error as Error | null,
        refetchRepositories: refetch
    };
};

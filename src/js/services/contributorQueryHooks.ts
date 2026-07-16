import {useQuery} from '@tanstack/react-query';
import {fetchContributors} from './contributorService';
import type {Contributor} from './contributorService';

/**
 * React Query hook to fetch contributors
 * @param owner Repository owner (optional)
 * @param repo Repository name (optional)
 * @param branch Branch name (optional)
 * @returns Query result with contributors data
 * 
 * If no repository info is provided, returns only custom contributors from localStorage
 */
export const useContributors = (owner?: string, repo?: string, branch?: string) => {
    return useQuery<Contributor[], Error>({
        queryKey: ['contributors', owner, repo, branch],
        queryFn: () => fetchContributors(owner, repo, branch),
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: true, // Always fetch contributors (will return custom ones if no repo)
    });
};

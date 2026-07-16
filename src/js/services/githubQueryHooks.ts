import {useQuery} from '@tanstack/react-query';
import githubService from './githubService';
import logger from '../utils/logger';

/**
 * React Query hook for checking if a branch has commits
 */
export const useHasCommitsOnBranch = (owner: string, repo: string, branch: string) => {
    return useQuery({
        queryKey: ['hasCommitsOnBranch', owner, repo, branch],
        queryFn: () => githubService.hasCommitsOnBranch(owner, repo, branch),
        // Only run if all parameters are provided
        enabled: !!owner && !!repo && !!branch,
        // Keep data fresh for 5 minutes
        staleTime: 5 * 60 * 1000,
    });
};

/**
 * React Query hook for getting file content from GitHub
 * Uses a singleton pattern to ensure only one instance of the query exists
 */
export const useFileContent = (owner: string, repo: string, path: string, branch: string, options?: { enabled?: boolean }) => {
    return useQuery({
        queryKey: ['fileContent', owner, repo, path, branch],
        queryFn: () => {
            return githubService.getFileContent(owner, repo, path, branch);
        },
        // Only run if all parameters are provided and not explicitly disabled
        enabled: options?.enabled !== undefined ? options.enabled : (!!owner && !!repo && !!path && !!branch),
        // Keep data fresh for 10 minutes
        staleTime: 10 * 60 * 1000,
        // Prevent garbage collection for 15 minutes
        gcTime: 15 * 60 * 1000,
        // Don't retry failed queries automatically
        retry: false,
        // Use structural sharing for better performance
        structuralSharing: true,
    });
};

/**
 * React Query hook for checking if a file has uncommitted changes
 */
export const useHasUncommittedChanges = (
    owner: string,
    repo: string,
    path: string,
    content: string,
    branch: string,
    options?: { githubContentOverride?: string; enabled?: boolean }
) => {
    // Use the fileContent query to get the cached GitHub content, but skip if we have an override
    const skipFileContentFetch = !!options?.githubContentOverride;
    const fileContentQuery = useFileContent(owner, repo, path, branch, { enabled: !skipFileContentFetch });
    
    // Compare local content with cached GitHub content
    return useQuery({
        queryKey: ['hasUncommittedChanges', owner, repo, path, branch],
        queryFn: async () => {
            // Log the current state to help with debugging
            logger.debug('useHasUncommittedChanges state:', {
                fileContentQueryStatus: skipFileContentFetch ? 'skipped' : fileContentQuery.status,
                fileContentQueryData: skipFileContentFetch ? 'using override' : fileContentQuery.data,
                hasLocalContent: !!content,
                localContentLength: content?.length
            });
            
            // If we have an override or cached GitHub content, compare directly without an API call
            if (options?.githubContentOverride !== undefined || fileContentQuery.data !== undefined) {
                const githubContent = options?.githubContentOverride || fileContentQuery.data || '';
                
                // Normalize line endings and whitespace for comparison
                const normalizedGithubContent = githubContent.replace(/\r\n/g, '\n').trim();
                const normalizedLocalContent = content.replace(/\r\n/g, '\n').trim();
                
                logger.debug('Content comparison:', {
                    normalizedGithubContentLength: normalizedGithubContent.length,
                    normalizedLocalContentLength: normalizedLocalContent.length,
                    isDifferent: normalizedGithubContent !== normalizedLocalContent
                });
                
                return normalizedGithubContent !== normalizedLocalContent;
            }
            
            // If fileContent query failed, try to refetch it
            if (fileContentQuery.isError) {
                logger.warn('File content query failed, attempting to refetch');
                const refetchResult = await fileContentQuery.refetch();

                // If refetch succeeded, try again with the new data
                if (refetchResult.data !== undefined) {
                    const githubContent = refetchResult.data || '';
                    const normalizedGithubContent = githubContent.replace(/\r\n/g, '\n').trim();
                    const normalizedLocalContent = content.replace(/\r\n/g, '\n').trim();
                    return normalizedGithubContent !== normalizedLocalContent;
                }
            }
            
            // Fallback to API call if no cached content or refetch failed
            logger.log('Falling back to direct API call for uncommitted changes check');
            return githubService.hasUncommittedChanges(owner, repo, path, content, branch);
        },
        // Only run if all parameters are provided and not explicitly disabled
        enabled: options?.enabled !== undefined ? options.enabled : (!!owner && !!repo && !!path && !!content && !!branch),
        // Keep data fresh for 1 minute
        staleTime: 60 * 1000,
        // Retry failed queries
        retry: 2,
    });
};

/**
 * React Query hook for fetching the current GitHub user
 */
export const useGitHubUser = () => {
    return useQuery({
        queryKey: ['githubUser'],
        queryFn: () => githubService.getCurrentUser(),
        // Only run if the user is authenticated
        enabled: githubService.isAuthenticated(),
        // Keep data fresh for 30 minutes
        staleTime: 30 * 60 * 1000,
        // Don't refetch on window focus since user data rarely changes during a session
        refetchOnWindowFocus: false,
    });
};

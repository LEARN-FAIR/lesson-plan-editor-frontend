import queryClient from '../services/queryClient';
import githubService from '../services/githubService';
import logger from './logger';

/**
 * Prefetch file content and store it in the React Query cache
 * This helps prevent multiple API calls for the same file
 * 
 * @param owner Repository owner
 * @param repo Repository name
 * @param path File path
 * @param branch Branch name
 */
export const prefetchFileContent = async (
    owner: string,
    repo: string,
    path: string,
    branch: string
): Promise<void> => {
    // Check if we already have this query in the cache
    const queryKey = ['fileContent', owner, repo, path, branch];
    const existingQuery = queryClient.getQueryCache().find({ queryKey });
    
    // If the query already exists and has data, don't prefetch
    if (existingQuery?.state.data !== undefined) {
        logger.log(`File content for ${path} already in cache, skipping prefetch`);
        return;
    }
    
    // Prefetch and add to cache
    return queryClient.prefetchQuery({
        queryKey,
        queryFn: () => githubService.getFileContent(owner, repo, path, branch),
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
};

/**
 * Set file content directly in the React Query cache
 * This is useful when you already have the content from another source
 * 
 * @param owner Repository owner
 * @param repo Repository name
 * @param path File path
 * @param branch Branch name
 * @param content File content
 */
export const setFileContentInCache = (
    owner: string,
    repo: string,
    path: string,
    branch: string,
    content: string
): void => {
    const queryKey = ['fileContent', owner, repo, path, branch];
    
    // Set the data in the cache
    queryClient.setQueryData(queryKey, content);
    logger.log(`Set file content for ${path} in cache`);
};

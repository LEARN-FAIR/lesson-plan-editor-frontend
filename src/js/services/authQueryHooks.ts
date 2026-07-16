import { useQuery, useQueryClient } from '@tanstack/react-query';
import { QueryClient } from '@tanstack/react-query';
import apiAdapter from './apiAdapter';
import githubService from './githubService';

/**
 * React Query hook for checking authentication status
 */
export const useAuthStatus = () => {
  return useQuery({
    queryKey: ['authStatus'],
    queryFn: () => apiAdapter.checkAuthStatus(),
    staleTime: 30000, // 30 seconds
    retry: false,
  });
};

/**
 * React Query hook for getting GitHub user info
 */
export const useGitHubUserInfo = () => {
  return useQuery({
    queryKey: ['githubUser'],
    queryFn: () => apiAdapter.getUserInfo(),
    staleTime: 30000, // 30 seconds
    retry: false,
    enabled: githubService.isAuthenticated(), // Only run if authenticated
  });
};

/**
 * Utility function to invalidate auth-related queries
 * Call this after logout or login to refresh data
 * @param queryClient React Query client instance
 */
export const invalidateAuthQueries = (queryClient: QueryClient) => {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['authStatus'] }),
    queryClient.invalidateQueries({ queryKey: ['githubUser'] }),
  ]);
};

/**
 * React hook that returns a function to invalidate auth queries
 * Use this in React components
 */
export const useInvalidateAuthQueries = () => {
  const queryClient = useQueryClient();
  return () => invalidateAuthQueries(queryClient);
};

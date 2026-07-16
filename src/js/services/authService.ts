import { QueryClient } from '@tanstack/react-query';
import apiAdapter from './apiAdapter';
import logger from '../utils/logger';
import githubService from './githubService';
import { invalidateAuthQueries } from './authQueryHooks';

/**
 * Perform logout with cache invalidation
 * @param queryClient React Query client instance
 */
export const performLogout = async (queryClient: QueryClient) => {
  try {
    // Call the API to logout
    await apiAdapter.logout();
    
    // Invalidate auth-related queries
    await invalidateAuthQueries(queryClient);
    
    // Clear local auth state
    githubService.clearAuthState();
    
    return { success: true };
  } catch (error) {
    logger.error('Error during logout:', error);
    return { success: false, error };
  }
};

/**
 * Update the githubService with the user's authentication state
 * This should be called after successful authentication
 * @param queryClient React Query client instance
 */
export const refreshAuthState = async (queryClient: QueryClient) => {
  try {
    // Invalidate existing queries to get fresh data
    await invalidateAuthQueries(queryClient);
    
    // Fetch fresh auth status
    const authStatus = await apiAdapter.checkAuthStatus();
    
    // Update githubService with the new auth state
    githubService.setAuthenticated(authStatus.authenticated);
    
    if (authStatus.authenticated) {
      // Fetch user info if authenticated
      const userInfo = await apiAdapter.getUserInfo();
      githubService.setUser(userInfo);
    }
    
    return { success: true, authenticated: authStatus.authenticated };
  } catch (error) {
    logger.error('Error refreshing auth state:', error);
    return { success: false, error };
  }
};

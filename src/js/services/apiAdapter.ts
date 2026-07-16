/**
 * API Adapter for making requests to the backend
 */

import githubService from './githubService';
import logger from '../utils/logger';

/**
 * API Adapter Service
 * 
 * This service adapts frontend API calls to work with the new Symfony backend.
 * It provides a consistent interface for the frontend services while routing
 * requests to the appropriate Symfony endpoints.
 */

// Backend API URL - set via VITE_API_URL at build time (see .env.* files).
const API_URL = import.meta.env.VITE_API_URL || 'https://api.editor.fairdata.education/api';


class ApiAdapter {
    constructor() {
        // Initialize the adapter without making an immediate API call
        // Auth status will be checked when needed
    }
    /**
     * Get the base API URL
     */
    getBaseUrl(): string {
        return API_URL;
    }
    
    // Session-based authentication doesn't need token storage methods
    private isAuthenticated: boolean = false;
    private userData: any = null;
    
    /**
     * Get authentication status
     */
    getAuthStatus(): boolean {
        return this.isAuthenticated;
    }
    
    /**
     * Get user data if authenticated
     */
    getUserData(): any {
        return this.userData;
    }
    
    /**
     * Add necessary headers to request options
     */
    private addHeaders(options: RequestInit = {}): RequestInit {
        const headers: Record<string, string> = {};
        
        // Only add Content-Type for POST or PUT requests
        if (options.method === 'POST' || options.method === 'PUT') {
            headers['Content-Type'] = 'application/json';
        }
        
        return {
            ...options,
            headers: {
                ...options.headers,
                ...headers
            },
            credentials: 'include' // Include cookies in all requests
        };
    }

    /**
     * Make an authenticated API request using session cookies
     */
    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const response = await fetch(`${API_URL}${endpoint}`, this.addHeaders(options));
        
        if (!response.ok) {
            let errorMessage = `API request failed: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
                
                // If unauthorized, update authentication status
                if (response.status === 401) {
                    this.isAuthenticated = false;
                    this.userData = null;
                }
            } catch (e) {
                // If parsing fails, use the default error message
            }
            throw new Error(errorMessage);
        }
        
        return await response.json() as T;
    }

    // ===== Auth Endpoints =====

    /**
     * Get GitHub OAuth login URL
     */
    getGitHubLoginUrl(redirectUrl?: string): string {
        let loginUrl = `${API_URL}/auth/github`;
        
        if (redirectUrl) {
            const encodedRedirectUrl = encodeURIComponent(redirectUrl);
            loginUrl += `?redirect_url=${encodedRedirectUrl}`;
        }
        
        return loginUrl;
    }

    /**
     * Check for authentication success in URL fragment after OAuth callback
     * Returns true if authentication was successful
     */
    checkAuthSuccessInUrl(): boolean {
        const hash = window.location.hash;
        if (hash && hash.includes('auth=success')) {
            // Remove the auth parameter from the URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return true;
        }
        return false;
    }

    // ===== GitHub User Endpoints =====

    /**
     * Get user information from GitHub
     * React Query will handle caching
     */
    async getUserInfo(): Promise<any> {
        return this.request('/github/user');
    }
    
    /**
     * Check if the user is authenticated using session
     * React Query will handle caching
     */
    async checkAuthStatus(): Promise<any> {
        try {
            const response = await this.request<{authenticated: boolean, user?: any}>('/auth/status');
            this.isAuthenticated = response.authenticated;
            this.userData = response.user || null;
            return response;
        } catch (error) {
            logger.error('Error checking auth status:', error);
            this.isAuthenticated = false;
            this.userData = null;
            throw error;
        }
    }

    /**
     * Logout user by clearing session on the server
     */
    async logout(): Promise<any> {
        try {
            // Notify backend to clear session
            await this.request('/auth/logout', { method: 'POST' });
            this.isAuthenticated = false;
            this.userData = null;
            // React Query will handle cache invalidation
            return { success: true };
        } catch (error) {
            logger.error('Logout error:', error);
            return { success: false, error: 'Failed to logout' };
        }
    }

    // ===== GitHub Repository Endpoints =====

    /**
     * Get target repository and its forks
     */
    async getTargetRepoAndForks(): Promise<any> {
        return this.request('/github/repositories');
    }

    /**
     * Search repositories
     */
    async searchRepositories(query: string): Promise<any> {
        return this.request(`/github/repositories?q=${encodeURIComponent(query)}`);
    }

    /**
     * Check repository access
     */
    async checkRepositoryAccess(owner: string, repo: string): Promise<any> {
        return this.request(`/github/repository/access?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`);
    }

    /**
     * Get repository branches
     */
    async getRepositoryBranches(owner: string, repo: string): Promise<any> {
        const repoInfo = await this.checkRepositoryAccess(owner, repo);
        const branchNames = repoInfo.branches || [];
        
        // Convert string branch names to Branch objects
        return branchNames.map((branchName: string) => ({
            name: branchName,
            commit: {
                sha: '', // We don't have this information from the backend
                url: ''
            },
            protected: false // We don't have this information from the backend
        }));
    }

    /**
     * Create a fork of the target repository
     */
    async createFork(): Promise<any> {
        throw new Error('Fork creation not yet implemented');
    }

    /**
     * Create a new branch from a source branch
     */
    async createBranch(owner: string, repo: string, branchName: string, sourceBranch: string): Promise<any> {
        const response = await fetch(`${this.getBaseUrl()}/github/repository/${owner}/${repo}/branches`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                branchName,
                sourceBranch
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create branch');
        }

        return response.json();
    }

    // ===== Lesson Plan Endpoints =====

    /**
     * Get all lesson plans from a repository
     */
    async getLessonPlans(owner: string, repo: string, branch?: string): Promise<any> {
        let url = `/lesson-plans?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`;
        if (branch) {
            url += `&branch=${encodeURIComponent(branch)}`;
        }
        return this.request(url);
    }

    /**
     * Get a specific lesson plan by path
     */
    async getLessonPlan(owner: string, repo: string, path: string, branch?: string): Promise<any> {
        let url = `/lesson-plans/file?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}`;
        if (branch) {
            url += `&branch=${encodeURIComponent(branch)}`;
        }
        return this.request(url);
    }

    /**
     * Save a lesson plan to GitHub
     * @param owner Repository owner
     * @param repo Repository name
     * @param path File path
     * @param content File content
     * @param commitMessage Commit message
     * @param sha File SHA (for updates)
     * @param branch Branch name
     * @param customContributors Optional array of custom contributors to commit
     * @returns Commit result
     */
    async saveLessonPlan(owner: string, repo: string, path: string, content: string, commitMessage: string, sha?: string, branch?: string, customContributors?: any[]): Promise<any> {
        return this.request('/lesson-plans/file', {
            method: 'POST',
            body: JSON.stringify({
                owner,
                repo,
                path,
                content,
                commitMessage,
                sha,
                branch,
                customContributors
            })
        });
    }

    /**
     * Get contributors from the repository
     * @param owner Repository owner (organization or username)
     * @param repo Repository name
     * @param branch Branch name
     * @returns Array of contributors
     */
    async getContributors(owner?: string, repo?: string, branch?: string): Promise<any[]> {
        // Build query parameters
        const params = new URLSearchParams();
        if (owner) params.append('owner', owner);
        if (repo) params.append('repo', repo);
        if (branch) params.append('branch', branch);

        // Create endpoint with query parameters
        const endpoint = `/contributors${params.toString() ? `?${params.toString()}` : ''}`;
        
        return this.request<any[]>(endpoint);
    }

    /**
     * Get file content from GitHub
     */
    async getFileContent(owner: string, repo: string, path: string, branch: string): Promise<string> {
        try {
            const lessonPlan = await this.getLessonPlan(owner, repo, path, branch);

            // Process the response
            let content = '';
            
            // Check if we have decoded content
            if (lessonPlan && lessonPlan.decodedContent !== undefined) {
                content = lessonPlan.decodedContent;
            } else if (lessonPlan && lessonPlan.content) {
                // Try to use content if decodedContent is not available
                try {
                    // Content might be base64 encoded
                    // Use TextDecoder to properly handle UTF-8 encoding
                    const base64 = lessonPlan.content.replace(/\s/g, '');
                    const binary = atob(base64);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) {
                        bytes[i] = binary.charCodeAt(i);
                    }
                    content = new TextDecoder('utf-8').decode(bytes);
                } catch (e) {
                    logger.warn('Error decoding base64 content:', e);
                    // If not base64, return as is
                    content = lessonPlan.content;
                }
            } else {
                // If we can't get content, return empty string
                logger.warn('No content found for file:', path);
            }
            
            return content;
        } catch (error) {
            logger.error('Error getting file content:', error);
            throw error;
        }
    }

    /**
     * Get commits for a branch
     */
    async getBranchCommits(owner: string, repo: string, branch: string): Promise<any[]> {
        return this.request(`/github/repository/${owner}/${repo}/commits?branch=${encodeURIComponent(branch)}`);
    }
}

// Create singleton instance
const apiAdapter = new ApiAdapter();
export default apiAdapter;

// Initialize the API adapter when this module is loaded

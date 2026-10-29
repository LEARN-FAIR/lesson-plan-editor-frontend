/**
 * GitHub service for handling GitHub API operations
 * Uses OAuth flow for authentication with session-based authentication
 * All GitHub API calls are now routed through the backend
 */

// Import the API adapter
import apiAdapter from './apiAdapter';
import logger from '../utils/logger';
import {ApiError, ApiErrorCode} from './apiError';

// Types for file parameters
export interface CommitFileParams {
    owner: string;      // GitHub username or organization name
    repo: string;       // Repository name
    path: string;       // File path within the repository
    message: string;    // Commit message
    content: string;    // File content to commit
    branch?: string;    // Target branch (default: main/master)
    customContributors?: any[];  // Optional custom contributors to commit
}

// User info from GitHub API
interface GitHubUser {
    login: string;
    name?: string;
    avatar_url: string;
    email?: string;
}

class GitHubService {
    private authenticated: boolean = false;
    private user: GitHubUser | null = null;

    constructor() {
        // We'll check authentication status by making an API call when needed
        // No longer loading user data from localStorage
    }

    /**
     * Initialize the GitHub service with session-based authentication
     * Checks authentication status with the backend
     * @returns Promise<boolean> Whether the user is authenticated
     */
    async initialize(): Promise<boolean> {
        // Check authentication status with the backend
        return await this.checkAuthenticationStatus();
    }

    /**
     * Redirect to GitHub for OAuth authentication via backend
     * @param redirectUrl Optional URL to redirect to after successful authentication
     */
    redirectToGitHub(redirectUrl?: string) {
        // Use the API adapter to get the login URL
        const loginUrl = apiAdapter.getGitHubLoginUrl(redirectUrl);
        window.location.href = loginUrl;
    }

    /**
     * Handle the OAuth callback from GitHub
     * With session-based authentication, the backend handles the token storage
     * @param code The OAuth code from the callback
     * @param state Optional state parameter for verification
     * @returns The redirect URL from the server response, if any
     */
    async handleAuthCallback(code: string, state?: string): Promise<string | null> {
        // If we're already authenticated, don't try to authenticate again
        if (this.authenticated && this.user) {
            logger.log('Already authenticated, skipping authentication');
            return null;
        }

        try {
            logger.log('Completing authentication via server...');
            
            // Check if authentication was successful by checking URL fragment
            if (apiAdapter.checkAuthSuccessInUrl()) {
                // Verify authentication by getting user data
                await this.getCurrentUser();
                this.authenticated = true;
            } else {
                // If no success flag in URL, check authentication status directly
                await this.checkAuthenticationStatus();
            }
            
            return null;
        } catch (error) {
            logger.error('Error handling GitHub callback:', error);
            throw error;
        }
    }

    /**
     * Check if the user is authenticated with GitHub
     * For immediate UI feedback, returns the cached authentication state
     * For a fresh check, use checkAuthenticationStatus()
     */
    isAuthenticated(): boolean {
        return this.authenticated;
    }
    
    /**
     * Check authentication status from the backend
     * This makes an API call to verify the session is valid
     */
    async checkAuthenticationStatus(): Promise<boolean> {
        try {
            // Call the backend to check if the session is valid
            const response = await apiAdapter.checkAuthStatus();
            this.authenticated = response.authenticated === true;
            
            // If authenticated, update user data from the response
            if (this.authenticated && response.user) {
                this.user = {
                    login: response.user.username || response.user.login,
                    name: response.user.name,
                    avatar_url: response.user.avatarUrl || response.user.avatar_url,
                    email: response.user.email
                };
            } else {
                this.user = null;
            }
            
            return this.authenticated;
        } catch (error) {
            logger.error('Error checking authentication status:', error);
            this.authenticated = false;
            this.user = null;
            return false;
        }
    }

    /**
     * Get current authenticated user
     */
    getUser(): GitHubUser | null {
        return this.user;
    }

    /**
     * Logout from GitHub
     * Note: This only clears local state, use authService.performLogout for full logout with cache invalidation
     */
    logout() {
        // Clear local state only
        this.clearAuthState();
    }
    
    /**
     * Clear local authentication state
     */
    clearAuthState() {
        this.authenticated = false;
        this.user = null;
    }
    
    /**
     * Set authentication status
     */
    setAuthenticated(status: boolean) {
        this.authenticated = status;
    }
    
    /**
     * Set user data
     */
    setUser(userData: any) {
        if (userData) {
            this.user = {
                login: userData.username || userData.login,
                name: userData.name,
                avatar_url: userData.avatarUrl || userData.avatar_url,
                email: userData.email
            };
        } else {
            this.user = null;
        }
    }

    /**
     * Get current authenticated user information
     */
    async getCurrentUser(): Promise<GitHubUser> {
        try {
            // Always fetch fresh user data from the backend
            // This ensures we have the most up-to-date information
            const userData = await apiAdapter.getUserInfo();
            
            this.user = {
                login: userData.login,
                name: userData.name || undefined,
                avatar_url: userData.avatar_url,
                email: userData.email || undefined
            };

            // Mark as authenticated if we successfully got user data
            this.authenticated = true;

            return this.user;
        } catch (error) {
            logger.error('Failed to get user information:', error);
            this.authenticated = false;
            throw error;
        }
    }

    /**
     * Check if the user has write access to a repository
     * @param owner Repository owner
     * @param repo Repository name
     * @returns True if the user has write access, false otherwise
     */
    async checkRepositoryWriteAccess(owner: string, repo: string): Promise<boolean> {
        if (!this.authenticated) {
            throw new Error('Not authenticated with GitHub');
        }

        try {
            const repoInfo = await apiAdapter.checkRepositoryAccess(owner, repo);
            return repoInfo.hasWriteAccess === true;
        } catch (error) {
            logger.error('Error checking repository permissions:', error);
            return false;
        }
    }

    /**
     * Get the GitHub App installation URL for a repository
     * @param owner Repository owner
     * @param repo Repository name
     * @param repoId Repository ID (optional)
     * @returns The installation URL for the GitHub App
     */
    getAppInstallationUrl(owner: string, repo: string, repoId?: number): string {
        if (repoId) {
            // Use the specific GitHub App installation URL with the repository ID preselected
            return `https://github.com/apps/lesson-plan-editor/installations/new?target_id=${repoId}`;
        } else {
            // Fallback to the basic installation URL if no repository ID is available
            return 'https://github.com/apps/lesson-plan-editor/installations/new';
        }
    }

    /**
     * Commit a file to a GitHub repository
     */
    async commitFile(params: CommitFileParams) {
        if (!this.authenticated) {
            throw new Error('Not authenticated with GitHub');
        }

        const {owner, repo, path, message, content, branch = 'main', customContributors} = params;

        try {
            // Get the file SHA from GitHub API first
            let sha: string | undefined;
            try {
                const lessonPlan = await apiAdapter.getLessonPlan(owner, repo, path, branch);
                if (lessonPlan && lessonPlan.sha) {
                    sha = lessonPlan.sha;
                    logger.log('Retrieved SHA for file update:', sha);
                }
            } catch (shaError) {
                // If we can't get the SHA, it might be a new file
                logger.warn('Could not get file SHA, might be a new file:', shaError);
                // Continue without SHA for new files
            }

            // Use provided custom contributors or undefined
            return await apiAdapter.saveLessonPlan(owner, repo, path, content, message, sha, branch, customContributors);
        } catch (error) {
            logger.error('Error committing file:', error);
            throw error;
        }
    }

    /**
     * Check if there are commits on a branch
     * @param owner Repository owner
     * @param repo Repository name
     * @param branch Branch name
     * @returns True if there are commits, false otherwise
     */
    async hasBranchCommits(owner: string, repo: string, branch: string): Promise<boolean> {
        if (!this.authenticated) {
            throw new Error('Not authenticated with GitHub');
        }

        try {
            // Try to get commits from the API
            const commits = await apiAdapter.getBranchCommits(owner, repo, branch);
            return commits.length > 0;
        } catch (error) {
            logger.error('Error checking branch commits:', error);
            
            // If the endpoint is not implemented yet (404 or 501), try an alternative approach
            // Check if we can access the repository at all - if we can, assume it has commits
            try {
                const repoInfo = await apiAdapter.checkRepositoryAccess(owner, repo);
                // If we can access the repo, assume the branch has commits
                // This is a fallback until the commits endpoint is implemented
                return true;
            } catch (repoError) {
                logger.error('Error checking repository access:', repoError);
                // If we can't even access the repo, assume there are no commits
                return false;
            }
        }
    }
    
    /**
     * Alias for hasBranchCommits - used for backward compatibility
     * @param owner Repository owner
     * @param repo Repository name
     * @param branch Branch name
     * @returns True if there are commits, false otherwise
     */
    async hasCommitsOnBranch(owner: string, repo: string, branch: string): Promise<boolean> {
        return this.hasBranchCommits(owner, repo, branch);
    }

    /**
     * Check if a file has uncommitted changes by comparing with the latest version on GitHub
     */
    async hasUncommittedChanges(owner: string, repo: string, path: string, content: string, branch: string): Promise<boolean> {
        try {
            // Get the current file content from GitHub
            const githubContent = await this.getFileContent(owner, repo, path, branch);

            // Compare the content
            return githubContent !== content;
        } catch (error) {
            logger.error('Error checking for uncommitted changes:', error);
            // If we can't get the file (e.g., it doesn't exist yet), consider it as having changes
            return true;
        }
    }

    /**
     * Get file content from GitHub
     */
    async getFileContent(owner: string, repo: string, path: string, branch: string): Promise<string> {
        // Make direct API call to get file content
        return apiAdapter.getFileContent(owner, repo, path, branch);
    }
}

/**
 * Whether an error means the GitHub App is not authorized to write to the repo
 * (not installed, or missing "Contents: read & write"). When true, the UI offers
 * to install / authorize the app instead of showing the raw error.
 *
 * Switches on the backend's machine-readable error code; the raw-phrase check is
 * only a fallback for a backend not yet returning codes.
 */
export const isAppAuthorizationError = (error: unknown): boolean => {
    if (error instanceof ApiError) {
        return error.is(ApiErrorCode.GithubAppNotAuthorized);
    }
    const message = error instanceof Error ? error.message : String(error ?? '');
    return message.includes('Resource not accessible by integration');
};

// Create singleton instance
const githubService = new GitHubService();
export default githubService;

import React, {useEffect, useState} from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    Menu,
    MenuItem,
    Snackbar,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography
} from '@mui/material';
// Using standard Button instead of LoadingButton to avoid dependency issues
import GitHubIcon from '@mui/icons-material/GitHub';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import RefreshIcon from '@mui/icons-material/Refresh';
import FolderIcon from '@mui/icons-material/Folder';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import githubService, {type CommitFileParams} from '../services/githubService';
import type {Repository} from '../types/github';
import type {LessonPlan} from '../types/lessonPlan';
import type {FairMarkdownDocument} from '../types';
import {useHasCommitsOnBranch, useHasUncommittedChanges, useFileContent} from '../services/githubQueryHooks';
import {useQueryClient} from '@tanstack/react-query';
import {prefetchFileContent, setFileContentInCache} from '../utils/queryUtils';
import ReactDiffViewer from 'react-diff-viewer-continued';
import logger from '../utils/logger';
import apiAdapter from '../services/apiAdapter';
import customContributorService from '../services/customContributorService';

interface GitHubCommitButtonProps {
    content: string;
    filePath: string;
    originalGithubContent?: string; // Add prop for original GitHub content
    disabled?: boolean;
    color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
    onExport: () => void;
    repository?: Repository;
    branch?: string;
    lessonPlan?: LessonPlan;
    document?: FairMarkdownDocument;
}

const GitHubCommitButton: React.FC<GitHubCommitButtonProps> = ({
                                                                   content,
                                                                   filePath,
                                                                   originalGithubContent: propOriginalContent,
                                                                   disabled = false,
                                                                   color,
                                                                   onExport,
                                                                   repository,
                                                                   branch,
                                                                   lessonPlan,
                                                                   document
                                                               }) => {
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean>(false);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [commitMessage, setCommitMessage] = useState<string>(`Update ${filePath}`);
    const [diffTab, setDiffTab] = useState<number>(0);
    const [contributorsContent, setContributorsContent] = useState<string>('');
    const [originalContributorsContent, setOriginalContributorsContent] = useState<string>('');
    const [usedCustomContributorsForCommit, setUsedCustomContributorsForCommit] = useState<any[]>([]);

    // GitHub App installation dialog state
    const [isAppInstallDialogOpen, setIsAppInstallDialogOpen] = useState<boolean>(false);
    const [installationUrl, setInstallationUrl] = useState<string>('');

    // Check authentication status
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(githubService.isAuthenticated());
    const [githubUser, setGithubUser] = useState(githubService.getUser());

    // State for PR mode
    const [isPrMode, setIsPrMode] = useState<boolean>(false);

    // React Query client for manual invalidation
    const queryClient = useQueryClient();

    // Check authentication status on mount
    useEffect(() => {
        setIsAuthenticated(githubService.isAuthenticated());
        setGithubUser(githubService.getUser());
    }, []);

    // Use repository and branch from props
    const selectedRepo = repository;
    const selectedBranch = branch;

    // State for tracking if refreshing
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    // Use React Query hooks for GitHub data
    const owner = selectedRepo?.owner.login || '';
    const repoName = selectedRepo?.name || '';
    const branchName = selectedBranch || '';

    // Query for branch commits
    const {
        data: hasCommits = false,
        isLoading: isLoadingCommits,
        refetch: refetchCommits
    } = useHasCommitsOnBranch(owner, repoName, branchName);

    // Use React Query to fetch file content
    const {
        data: fileContent,
        isLoading: isLoadingFileContent,
        refetch: refetchFileContent
    } = useFileContent(owner, repoName, filePath, branchName, {
        // Only enable if we don't have content from props
        enabled: !propOriginalContent && !!owner && !!repoName && !!filePath && !!branchName
    });
    
    // Use the original GitHub content from props or from the query
    const [isLoadingContent, setIsLoadingContent] = useState<boolean>(!propOriginalContent && !fileContent);
    
    // Update loading state when prop or query data changes
    useEffect(() => {
        if (propOriginalContent || fileContent) {
            setIsLoadingContent(false);
            logger.log('Using GitHub content:', { 
                source: propOriginalContent ? 'prop' : 'query',
                contentLength: (propOriginalContent || fileContent || '').length 
            });
        } else {
            setIsLoadingContent(true);
        }
    }, [propOriginalContent, fileContent]);
    
    // For UI purposes, we use the prop content or query data
    const effectiveGithubContent = propOriginalContent || fileContent || '';
    
    // Only check for uncommitted changes when file content is loaded
    const contentLoaded = effectiveGithubContent !== undefined && effectiveGithubContent !== '' && !isLoadingContent;
    
    // Manually check for uncommitted changes instead of using the hook
    const [hasUncommittedChanges, setHasUncommittedChanges] = useState<boolean>(true);
    const [isLoadingChanges, setIsLoadingChanges] = useState<boolean>(false);
    
    // Function to manually check for uncommitted changes
    const checkUncommittedChanges = () => {
        if (propOriginalContent && content) {
            // Normalize line endings and whitespace for comparison
            const normalizedGithubContent = propOriginalContent.replace(/\r\n/g, '\n').trim();
            const normalizedLocalContent = content.replace(/\r\n/g, '\n').trim();
            const hasChanged = normalizedGithubContent !== normalizedLocalContent;
            
            setHasUncommittedChanges(hasChanged);
            return hasChanged;
        }
        return true;
    };
    
    // Function to refetch changes
    const refetchChanges = () => {
        return {
            data: checkUncommittedChanges()
        };
    };

    // Manually track if content has changed from GitHub version
    const [contentChanged, setContentChanged] = useState<boolean>(false);
    
    // Compare GitHub content with local content to detect changes
    useEffect(() => {
        if (effectiveGithubContent && content) {
            // Normalize line endings and whitespace for comparison
            const normalizedGithubContent = effectiveGithubContent.replace(/\r\n/g, '\n').trim();
            const normalizedLocalContent = content.replace(/\r\n/g, '\n').trim();
            const hasChanged = normalizedGithubContent !== normalizedLocalContent;
            
            logger.log('Content comparison:', {
                githubContentLength: effectiveGithubContent.length,
                localContentLength: content.length,
                hasChanged
            });
            
            setContentChanged(hasChanged);
            setHasUncommittedChanges(hasChanged);
        }
    }, [effectiveGithubContent, content]);
    
    // Update PR mode when commits, uncommitted changes, or content changes
    useEffect(() => {
        logger.log('PR mode dependencies changed:', {
            hasCommits,
            hasUncommittedChanges,
            contentChanged,
            contentLoaded,
            githubContentLength: effectiveGithubContent?.length || 0,
            localContentLength: content?.length || 0
        });
        
        // Only show PR mode if there are commits AND no uncommitted changes AND content hasn't changed
        const shouldShowPrMode = hasCommits && !hasUncommittedChanges && !contentChanged && contentLoaded;
        logger.log(`Setting PR mode to: ${shouldShowPrMode}`);
        setIsPrMode(shouldShowPrMode);
    }, [hasCommits, hasUncommittedChanges, contentChanged, contentLoaded, effectiveGithubContent, content]);

    // Function to manually refresh GitHub information using prefetching
    const refreshGitHubInfo = async () => {
        setIsRefreshing(true);

        try {
            // Use prefetching utility to refresh file content
            // This will only fetch if needed and update the cache
            await prefetchFileContent(owner, repoName, filePath, branchName);
            
            // Refetch commits in parallel
            const commitsResult = await refetchCommits();
            
            // Get the latest content from the query
            const fileContentResult = await refetchFileContent();
            const newContent = fileContentResult.data || propOriginalContent || '';
            
            // After refreshing content, reset the content changed flag if content matches
            if (newContent && content) {
                const normalizedGithubContent = newContent.replace(/\r\n/g, '\n').trim();
                const normalizedLocalContent = content.replace(/\r\n/g, '\n').trim();
                const hasChanged = normalizedGithubContent !== normalizedLocalContent;
                
                setContentChanged(hasChanged);
                setHasUncommittedChanges(hasChanged);
                logger.log('Content comparison after refresh:', { 
                    hasChanged,
                    contentLength: newContent.length
                });
                
                // If content has changed, update the cache
                if (hasChanged) {
                    setFileContentInCache(owner, repoName, filePath, branchName, newContent);
                }
            }
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleOpenDialog = async () => {
        setIsDialogOpen(true);
        setAnchorEl(null);

        // Set commit message based on the current file path
        setCommitMessage('');
        
        // Fetch contributors file if we have custom contributors
        const allCustomContributors = customContributorService.getCustomContributors();
        
        if (allCustomContributors.length > 0 && owner && repoName && selectedBranch && document) {
            // Use structured document data instead of parsing markdown
            const usedContributorIds = new Set<string>();
            
            console.log(document);

            // Add all authors
            if (document.authors) {
                document.authors.forEach(id => usedContributorIds.add(id));
            }
            
            // Add all reviewers
            if (document.reviewers) {
                document.reviewers.forEach(id => usedContributorIds.add(id));
            }
            
            logger.log('Custom contributors check:', {
                allCustomContributors,
                authors: document.authors,
                reviewers: document.reviewers,
                usedContributorIds: Array.from(usedContributorIds)
            });
            
            // Filter custom contributors to only those actually used in the lesson plan
            // Note: allCustomContributors already contains only custom contributors from localStorage
            const usedCustomContributors = allCustomContributors.filter(c => 
                usedContributorIds.has(c.id)
            );
            
            logger.log('Used custom contributors:', usedCustomContributors);
            
            // Store for commit
            setUsedCustomContributorsForCommit(usedCustomContributors);
            
            if (usedCustomContributors.length > 0) {
                try {
                    // Fetch existing contributors file
                    const existingContent = await apiAdapter.getFileContent(owner, repoName, '_data/contributors.yaml', selectedBranch);
                    setOriginalContributorsContent(existingContent);
                    
                    // Generate YAML for used custom contributors only (array format)
                    const customYaml = usedCustomContributors.map(c => {
                        const lines = [
                            `- id: "${c.id}"`,
                            `  orcid: "${c.orcid || c.id}"`,
                            `  firstName: "${c.firstName}"`,
                            `  lastName: "${c.lastName}"`
                        ];
                        if (c.git) {
                            lines.push(`  git: "${c.git}"`);
                        }
                        return lines.join('\n');
                    }).join('\n\n');
                    
                    // Append custom contributors to existing content
                    let mergedContent = existingContent;
                    if (mergedContent && !mergedContent.endsWith('\n')) {
                        mergedContent += '\n';
                    }
                    mergedContent += customYaml;
                    
                    setContributorsContent(mergedContent);
                } catch (error) {
                    logger.warn('Could not fetch contributors file:', error);
                    setOriginalContributorsContent('');
                    
                    // If file doesn't exist, just use used custom contributors (array format)
                    const newContent = usedCustomContributors.map(c => {
                        const lines = [
                            `- id: "${c.id}"`,
                            `  orcid: "${c.orcid || c.id}"`,
                            `  firstName: "${c.firstName}"`,
                            `  lastName: "${c.lastName}"`
                        ];
                        if (c.git) {
                            lines.push(`  git: "${c.git}"`);
                        }
                        return lines.join('\n');
                    }).join('\n\n');
                    setContributorsContent(newContent);
                }
            }
        }
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setError('');
        setUsedCustomContributorsForCommit([]);
        
        // If we had a successful commit, refresh the state to update button text
        if (success) {
            logger.log('Commit was successful, refreshing state after dialog close');
            // Force immediate state update for better UX
            setContentChanged(false);
            setIsPrMode(true);
            
            // Also trigger a refresh to ensure data is up-to-date
            setTimeout(() => {
                refreshGitHubInfo();
            }, 100);
        }
    };

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleExport = () => {
        handleMenuClose();
        onExport();
    };

    const handleSignInWithGitHub = () => {
        // Redirect to GitHub for OAuth authentication
        githubService.redirectToGitHub();
    };

    const handleSignOut = () => {
        githubService.logout();
        setIsAuthenticated(false);
        setGithubUser(null);
    };

    const handleCommit = async () => {
        if (!isAuthenticated) {
            setError('Please authenticate with GitHub first');
            return;
        }

        if (!commitMessage.trim()) {
            setError('Please enter a commit message');
            return;
        }

        // Use repository and branch from props (already available as selectedRepo and selectedBranch)
        // const selectedRepo and selectedBranch are already defined from props above

        if (!selectedRepo) {
            setError('No repository selected. Please select a repository first.');
            return;
        }

        if (!selectedBranch) {
            setError('No branch selected. Please select a branch first.');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Check if the user has write access to the repoNamesitory first
            const hasAccess = await githubService.checkRepositoryWriteAccess(
                selectedRepo.owner.login,
                selectedRepo.name
            );

            if (!hasAccess) {
                // Generate installation URL
                const url = githubService.getAppInstallationUrl(
                    selectedRepo.owner.login,
                    selectedRepo.name
                );
                setInstallationUrl(url);
                setIsLoading(false);
                setIsAppInstallDialogOpen(true);
                return;
            }

            const params: CommitFileParams = {
                owner: selectedRepo.owner.login,
                repo: selectedRepo.name,
                path: filePath,
                message: commitMessage,
                content,
                branch: selectedBranch,
                customContributors: usedCustomContributorsForCommit.length > 0 ? usedCustomContributorsForCommit : undefined
            };

            const result = await githubService.commitFile(params);
            logger.log('Commit successful:', result);
            setSuccess(true);
            handleCloseDialog();

            // Invalidate queries after successful commit
            queryClient.invalidateQueries({queryKey: ['fileContent']});
            queryClient.invalidateQueries({queryKey: ['hasUncommittedChanges']});
            queryClient.invalidateQueries({queryKey: ['hasCommitsOnBranch']});
            
            // No need to invalidate cache anymore - direct fetch

            // Invalidate lesson plan content for the current file path
            if (filePath) {
                queryClient.invalidateQueries({queryKey: ['lessonPlanContent', filePath]});
            }
            
            // Force immediate state update
            setContentChanged(false);
            
            // Wait a moment for React Query to settle, then update state once
            setTimeout(async () => {
                logger.log('Performing delayed state update after commit');
                
                // Use prefetching utility to refresh file content
                // This will force a refresh by invalidating the cache first
                queryClient.removeQueries({ queryKey: ['fileContent', owner, repoName, filePath, branchName] });
                await prefetchFileContent(owner, repoName, filePath, branchName);
                
                // Then refetch both file content and commits in parallel
                const [fileContentResult, commitsResult] = await Promise.all([
                    refetchFileContent(),
                    refetchCommits()
                ]);
                
                // Get the latest content from the query or prop
                const newContent = fileContentResult.data || propOriginalContent || '';
                
                // Update the cache with the new content
                setFileContentInCache(owner, repoName, filePath, branchName, newContent);
                logger.log('Updated GitHub content after commit:', { 
                    source: fileContentResult.data ? 'query' : 'prop',
                    contentLength: newContent.length 
                });
                
                // Manually check for uncommitted changes
                let hasChanges = false;
                if (newContent && content) {
                    const normalizedGithubContent = newContent.replace(/\r\n/g, '\n').trim();
                    const normalizedLocalContent = content.replace(/\r\n/g, '\n').trim();
                    hasChanges = normalizedGithubContent !== normalizedLocalContent;
                    setHasUncommittedChanges(hasChanges);
                    setContentChanged(hasChanges);
                }
                
                logger.log('State after refetch:', {
                    hasCommits: commitsResult.data,
                    hasUncommittedChanges: hasChanges,
                    githubContentUpdated: !!newContent
                });
                
                // Update PR mode based on refetched data
                const shouldShowPrMode = !!commitsResult.data && !hasChanges && !!newContent;
                logger.log(`Setting PR mode to ${shouldShowPrMode} after commit`);
                setIsPrMode(shouldShowPrMode);
            }, 500);

        } catch (err) {
            logger.error('Commit error:', err);

            // Check if this is a GitHub App installation error
            if ((err as Error).message.includes('Resource not accessible by integration')) {
                // Generate installation URL
                const url = githubService.getAppInstallationUrl(
                    selectedRepo.owner.login,
                    selectedRepo.name
                );
                setInstallationUrl(url);
                setIsAppInstallDialogOpen(true);
            } else {
                setError(`Failed to commit to GitHub: ${(err as Error).message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseSnackbar = () => {
        setSuccess(false);
    };

    // Handle closing the app installation dialog
    const handleCloseAppInstallDialog = () => {
        setIsAppInstallDialogOpen(false);
    };

    // Handle opening the app installation URL
    const handleOpenAppInstallation = () => {
        if (selectedRepo) {
            window.open(installationUrl, '_blank');
        }
    };

    // Handle creating a pull request
    const handleCreatePullRequest = () => {
        if (!isAuthenticated) {
            setError('Please authenticate with GitHub first');
            return;
        }

        if (!selectedRepo || !selectedBranch) {
            setError('No repository or branch selected');
            return;
        }
        
        // Open GitHub PR creation page
        const url = `https://github.com/${owner}/${repoName}/pull/new/${branchName}`;
        window.open(url, '_blank');
    };
    
    // Determine if content is ready for commit operations
    const isContentReady = contentLoaded && !isLoadingChanges;
    
    // Debug logging to help diagnose issues
    useEffect(() => {
        logger.log('GitHubCommitButton state:', {
            contentLoaded,
            isContentReady,
            githubContentLength: propOriginalContent?.length || 0,
            localContentLength: content?.length || 0,
            isLoadingContent,
            hasUncommittedChanges
        });
    }, [contentLoaded, isContentReady, propOriginalContent, content, isLoadingContent, hasUncommittedChanges]);
    
    // Track if any loading is happening
    const isAnyLoading = isRefreshing || isLoadingCommits || isLoadingContent || isLoadingChanges;

    // Split button implementation with main action and dropdown
    const handleMainButtonClick = () => {
        if (isPrMode) {
            handleCreatePullRequest();
        } else {
            handleOpenDialog();
        }
    };

    // Content loading state
    if (isLoadingContent && !propOriginalContent && !isPrMode) {
        return (
            <Button
                variant="contained"
                color={color}
                startIcon={<CircularProgress size={16} color="inherit"/>}
                disabled
            >
                Loading...
            </Button>
        );
    }

    // Error state
    const hasError = !propOriginalContent && !isLoadingContent;
    if (hasError) {
        return (
            <Button
                variant="contained"
                color={color}
                startIcon={<GitHubIcon/>}
                disabled
            >
                Error loading content
            </Button>
        );
    }

    return (
        <>
            <Box sx={{display: 'flex'}}>
                <Button
                    variant="contained"
                    color={isPrMode ? "success" : (color || 'primary')}
                    onClick={handleMainButtonClick}
                    disabled={disabled || isLoading || !isAuthenticated || isAnyLoading || !isContentReady}
                    startIcon={isAnyLoading ? <CircularProgress size={20} color="inherit"/> : <GitHubIcon/>}
                    sx={{borderTopRightRadius: 0, borderBottomRightRadius: 0}}
                >
                    {isAnyLoading ? 'Loading...' : (isPrMode ? 'Create pull request' : 'Commit changes')}
                </Button>
                <Button
                    size="small"
                    variant="contained"
                    color={isPrMode ? "success" : (color || 'primary')}
                    onClick={handleMenuOpen}
                    disabled={disabled || isLoading || !isAuthenticated || isAnyLoading || !isContentReady}
                    sx={{
                        minWidth: '36px',
                        borderTopLeftRadius: 0,
                        borderBottomLeftRadius: 0,
                        borderLeft: '1px solid rgba(255,255,255,0.3)'
                    }}
                >
                    <ArrowDropDownIcon/>
                </Button>
            </Box>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={handleExport}>
                    <FileDownloadIcon fontSize="small" sx={{mr: 1}}/>
                    Download file
                </MenuItem>
                {isAuthenticated && (
                    <MenuItem onClick={() => {
                        refreshGitHubInfo();
                        handleMenuClose();
                    }}>
                        <RefreshIcon fontSize="small" sx={{mr: 1}}/>
                        Refresh GitHub status
                    </MenuItem>
                )}
            </Menu>

            <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
                <DialogTitle sx={{ pb: 1 }}>Commit to GitHub</DialogTitle>
                <DialogContent>
                    {error && <Alert severity="error" sx={{mb: 2}}>{error}</Alert>}

                    {!isAuthenticated ? (
                        <>
                            <DialogContentText>
                                Connect with your GitHub account to commit changes to a repoNamesitory.
                            </DialogContentText>
                            <Box sx={{mt: 3, mb: 3, display: 'flex', justifyContent: 'center'}}>
                                <Button
                                    onClick={handleSignInWithGitHub}
                                    variant="contained"
                                    startIcon={<GitHubIcon/>}
                                    size="large"
                                >
                                    Sign in with GitHub
                                </Button>
                            </Box>
                            <DialogContentText variant="body2" color="text.secondary" align="center">
                                You'll be redirected to GitHub to authorize this application
                            </DialogContentText>
                        </>
                    ) : (
                        <>
                            {isAuthenticated && selectedRepo && (
                                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
                                    {/* Left column: Repository, branch, file info */}
                                    <Box sx={{ flex: 1, width: '400px' }}>
                                        {/* Display repoNamesitory info */}
                                        <Box sx={{
                                            mb: 1,
                                            mt: '28px',
                                            p: 0.75,
                                            bgcolor: 'background.paper',
                                            borderRadius: 1,
                                            border: '1px solid',
                                            borderColor: 'divider'
                                        }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <FolderIcon color="primary" fontSize="small" sx={{ mr: 0.5 }} />
                                                <Typography variant="caption" color="text.secondary">
                                                    Repository
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2">
                                                {selectedRepo.full_name}
                                            </Typography>
                                        </Box>

                                        {/* Display branch info */}
                                        <Box sx={{
                                            mb: 1,
                                            p: 0.75,
                                            bgcolor: 'background.paper',
                                            borderRadius: 1,
                                            border: '1px solid',
                                            borderColor: 'divider'
                                        }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <AccountTreeIcon color="primary" fontSize="small" sx={{ mr: 0.5 }} />
                                                <Typography variant="caption" color="text.secondary">
                                                    Branch
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2">
                                                {selectedBranch}
                                            </Typography>
                                        </Box>

                                        {/* Display file path info */}
                                        <Box sx={{
                                            mb: 1,
                                            p: 0.75,
                                            bgcolor: 'background.paper',
                                            borderRadius: 1,
                                            border: '1px solid',
                                            borderColor: 'divider'
                                        }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <InsertDriveFileIcon color="primary" fontSize="small" sx={{ mr: 0.5 }} />
                                                <Typography variant="caption" color="text.secondary">
                                                    File
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2" sx={{wordBreak: 'break-all'}}>
                                                {filePath}
                                            </Typography>
                                        </Box>

                                        <TextField
                                            margin="dense"
                                            label="Commit message"
                                            fullWidth
                                            variant="outlined"
                                            value={commitMessage}
                                            onChange={(e) => setCommitMessage(e.target.value)}
                                            required
                                            size="small"
                                            error={!commitMessage.trim()}
                                            helperText={!commitMessage.trim() ? 'Commit message is required' : ''}
                                        />
                                    </Box>
                                    
                                    {/* Right column: Diff viewer with tabs */}
                                    <Box sx={{ flex: 2, overflow: 'hidden' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <CompareArrowsIcon color="primary" fontSize="small" sx={{ mr: 0.5 }} />
                                                <Typography variant="caption" color="text.secondary">
                                                    Changes to be committed
                                                </Typography>
                                            </Box>
                                        </Box>
                                        
                                        <Tabs value={diffTab} onChange={(_, newValue) => setDiffTab(newValue)} sx={{ mb: 1, minHeight: '36px' }}>
                                            <Tab label="Lesson Plan" sx={{ minHeight: '36px', py: 0.5, textTransform: 'none' }} />
                                            {contributorsContent && (
                                                <Tab label="Contributors" sx={{ minHeight: '36px', py: 0.5, textTransform: 'none' }} />
                                            )}
                                        </Tabs>
                                        
                                        <Box sx={{ 
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderRadius: 1,
                                            overflow: 'auto',
                                            maxHeight: '400px'
                                        }}>
                                            {diffTab === 0 && (
                                                <ReactDiffViewer
                                                    oldValue={propOriginalContent || ''}
                                                    newValue={content}
                                                    splitView={false}
                                                    showDiffOnly={false}
                                                    useDarkTheme={false}
                                                    styles={{
                                                        contentText: {
                                                            fontSize: '0.7rem',
                                                            lineHeight: '1.2',
                                                            fontFamily: 'monospace'
                                                        },
                                                        gutter: {
                                                            fontSize: '0.65rem',
                                                            padding: '0 0.3rem',
                                                            lineHeight: '1.2'
                                                        },
                                                        line: {
                                                            padding: '0'
                                                        }
                                                    }}
                                                />
                                            )}
                                            {diffTab === 1 && contributorsContent && (
                                                <ReactDiffViewer
                                                    oldValue={originalContributorsContent}
                                                    newValue={contributorsContent}
                                                    splitView={false}
                                                    showDiffOnly={false}
                                                    useDarkTheme={false}
                                                    styles={{
                                                        contentText: {
                                                            fontSize: '0.7rem',
                                                            lineHeight: '1.2',
                                                            fontFamily: 'monospace'
                                                        },
                                                        gutter: {
                                                            fontSize: '0.65rem',
                                                            padding: '0 0.3rem',
                                                            lineHeight: '1.2'
                                                        },
                                                        line: {
                                                            padding: '0'
                                                        }
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    </Box>
                                </Box>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    {isAuthenticated && (
                        <Button
                            onClick={handleCommit}
                            disabled={isLoading || !selectedRepo || !selectedBranch || !commitMessage.trim()}
                            variant="contained"
                            color="primary"
                            startIcon={isLoading ? <CircularProgress size={20} color="inherit"/> : <GitHubIcon/>}
                        >
                            {isLoading ? 'Committing...' : 'Commit'}
                        </Button>
                        )}
                </DialogActions>
            </Dialog>

            {/* GitHub App Installation Dialog */}
            <Dialog open={isAppInstallDialogOpen} onClose={handleCloseAppInstallDialog}>
                <DialogTitle>
                    <Box display="flex" alignItems="center">
                        <GitHubIcon color="warning" sx={{mr: 1}}/>
                        GitHub App Installation Required
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        To commit changes to this repoNamesitory, you need to install the GitHub App.
                        This will grant the necessary permissions to create branches and make commits.
                    </DialogContentText>

                    <Alert severity="info" sx={{mt: 2, mb: 2}}>
                        <Typography variant="body2" gutterBottom>
                            <strong>Installation steps:</strong>
                        </Typography>
                        <ol style={{marginTop: 0, paddingLeft: '1.5rem'}}>
                            <li>Click the "Install GitHub App" button below</li>
                            <li>On the GitHub page, select your organization/account</li>
                            <li>Choose the repoNamesitory you want to install the app on</li>
                            <li>Click "Install" to complete the process</li>
                            <li>Return to this page and try again</li>
                        </ol>
                    </Alert>

                    {selectedRepo && (
                        <Box sx={{
                            mt: 2,
                            p: 0.75,
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider'
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <FolderIcon color="primary" fontSize="small" sx={{ mr: 0.5 }} />
                                <Typography variant="caption" color="text.secondary">
                                    Selected Repository
                                </Typography>
                            </Box>
                            <Typography variant="body2">
                                {selectedRepo.full_name}
                            </Typography>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseAppInstallDialog}>Cancel</Button>
                    <Button
                        onClick={handleOpenAppInstallation}
                        variant="contained"
                        color="primary"
                    >
                        Install GitHub App
                    </Button>
                </DialogActions>
            </Dialog>

        </>
    );
};

export default GitHubCommitButton;

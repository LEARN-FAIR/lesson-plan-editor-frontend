import React, {useEffect, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {
    Alert,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography
} from '@mui/material';
import type {SelectChangeEvent} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AddIcon from '@mui/icons-material/Add';
import WarningIcon from '@mui/icons-material/Warning';
import type {Branch, Repository} from '../types/github';
import githubService from '../services/githubService';
import apiAdapter from '../services/apiAdapter';
import logger from '../utils/logger';
import {useBranches} from '../services/githubRepoQueryHooks';

interface BranchSelectorProps {
    onBranchSelected: (branch: string) => void;
    onBack?: () => void;
    repository?: Repository;
    repoId?: number; // Add repoId prop to trigger refresh when repo changes
}

const BranchSelector: React.FC<BranchSelectorProps> = ({onBranchSelected, onBack, repository, repoId}) => {
    const queryClient = useQueryClient();

    // All useState hooks must be at the top
    const [selectedBranch, setSelectedBranch] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState<boolean>(false);
    const [newBranchName, setNewBranchName] = useState<string>('');
    const [sourceBranch, setSourceBranch] = useState<string>('');
    const [creatingBranch, setCreatingBranch] = useState<boolean>(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [hasWriteAccess, setHasWriteAccess] = useState<boolean>(true);
    const [isAppInstallDialogOpen, setIsAppInstallDialogOpen] = useState<boolean>(false);
    const [installationUrl, setInstallationUrl] = useState<string>('');

    // All useRef hooks must be at the top
    const accessCheckRef = React.useRef(false);
    const branchInitializedRef = React.useRef(false);

    // Use repository from props
    const repo = repository;

    // Use React Query to fetch branches
    const {
        data: branchesData = [],
        isLoading: loading,
        error: branchQueryError,
    } = useBranches(repo?.owner.login, repo?.name);

    // Filter out the main branch - we don't want to allow direct edits to main
    const branches = branchesData.filter((branch: Branch) => branch.name !== 'main');

    // All useEffect hooks must be at the top (after other hooks)
    // Set error from query
    React.useEffect(() => {
        if (branchQueryError) {
            setError((branchQueryError as Error).message);
        }
    }, [branchQueryError]);

    // Separate useEffect for access check - runs only once when branches are loaded
    useEffect(() => {
        // Only run once when branches are first loaded
        if (branches.length > 0 && !loading && !accessCheckRef.current && !hasWriteAccess) {
            // Use a timeout to prevent immediate re-renders
            const timer = setTimeout(() => {
                checkRepositoryAccess();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [loading]); // Only depend on loading state to prevent loops

    // Set up selected branch when branches are loaded - runs only once
    useEffect(() => {
        if (branches.length > 0 && !loading && !branchInitializedRef.current) {
            // Mark as initialized to prevent future runs
            branchInitializedRef.current = true;

            // Auto-select the first available branch
            setSelectedBranch(branches[0].name);
            // Notify parent component of the selection
            onBranchSelected(branches[0].name);
        }
    }, [branches, loading, onBranchSelected]); // Include onBranchSelected in dependencies

    // Reset branch selection when repository changes
    useEffect(() => {
        if (repo) {
            // Reset branch selection state when repo changes
            setSelectedBranch('');
            branchInitializedRef.current = false;
            refreshBranches();
        }
    }, [repoId]);

    // Function definitions (must be before early returns)
    const checkRepositoryAccess = async () => {
        if (!repo) return false;

        // Skip access check if we already know the result or already checking
        if (hasWriteAccess || accessCheckRef.current) {
            return hasWriteAccess;
        }

        // Set flag to prevent concurrent checks
        accessCheckRef.current = true;

        try {
            const hasAccess = await githubService.checkRepositoryWriteAccess(repo.owner.login, repo.name);
            setHasWriteAccess(hasAccess);
            return hasAccess;
        } catch (err) {
            logger.error('Error checking repository access:', err);
            setHasWriteAccess(false);
            return false;
        } finally {
            // Reset after a delay to allow for potential retries later
            setTimeout(() => {
                accessCheckRef.current = false;
            }, 5000);
        }
    };

    const refreshBranches = () => {
        if (repo) {
            queryClient.invalidateQueries({queryKey: ['branches', repo.owner.login, repo.name]});
        }
    };

    // Handle branch selection
    const handleBranchChange = (event: SelectChangeEvent) => {
        const branchName = event.target.value;
        setSelectedBranch(branchName);
        onBranchSelected(branchName);
    };

    if (!repo) {
        return (
            <div>
                <Typography variant="h6" color="error">
                    No repository selected
                </Typography>
            </div>
        );
    }

    if (loading) {
        return (
            <div style={{display: 'flex', justifyContent: 'center', padding: '20px'}}>
                <CircularProgress/>
            </div>
        );
    }

    if (error) {
        return (
            <div>
                <Alert severity="error">
                    Error loading branches: {error}
                </Alert>
            </div>
        );
    }

    if (branches.length === 0) {
        return (
            <div>
                <Alert severity="info">
                    No branches available for editing. Only the main branch exists.
                </Alert>
            </div>
        );
    }

    // State variables are now declared at the top of the component

    // Functions are now defined at the top of the component

    // All useEffect hooks are now at the top of the component

    // Handle opening the create branch dialog
    const handleOpenCreateDialog = async () => {
        const repo = repository;
        if (!repo) return;

        // Check if user has write access to the repository
        const hasAccess = await checkRepositoryAccess();

        if (!hasAccess) {
            // Generate installation URL
            const url = githubService.getAppInstallationUrl(repo.owner.login, repo.name);
            setInstallationUrl(url);
            setIsAppInstallDialogOpen(true);
            return;
        }

        setSourceBranch(selectedBranch || (repo?.default_branch || ''));
        setNewBranchName('');
        setCreateError(null);
        setIsCreateDialogOpen(true);
    };

    // Handle closing the create branch dialog
    const handleCloseCreateDialog = () => {
        setIsCreateDialogOpen(false);
    };

    // Handle creating a new branch
    const handleCreateBranch = async () => {
        if (!newBranchName) {
            setCreateError('Branch name is required');
            return;
        }

        // Validate branch name (no spaces, special characters, etc.)
        const branchNameRegex = /^[\w.-]+$/;
        if (!branchNameRegex.test(newBranchName)) {
            setCreateError('Branch name can only contain letters, numbers, hyphens, underscores, and periods');
            return;
        }

        // Check if branch already exists
        if (branches.some((b: Branch) => b.name === newBranchName)) {
            setCreateError(`Branch '${newBranchName}' already exists`);
            return;
        }

        setCreatingBranch(true);
        setCreateError(null);

        try {
            // Check repository access again before creating branch
            const hasAccess = await checkRepositoryAccess();
            if (!hasAccess) {
                const repo = repository;
                if (repo) {
                    const url = githubService.getAppInstallationUrl(repo.owner.login, repo.name);
                    setInstallationUrl(url);
                    handleCloseCreateDialog();
                    setIsAppInstallDialogOpen(true);
                    return;
                }
            }

            // Create the branch via API adapter
            if (repository) {
                await apiAdapter.createBranch(repository.owner.login, repository.name, newBranchName, selectedBranch);
            }
        } catch (err) {
            logger.error('Error creating branch:', err);

            // Check if this is a permissions error
            const errorMessage = (err as Error).message;
            if (errorMessage.includes('Resource not accessible by integration')) {
                const repo = repository;
                if (repo) {
                    const url = githubService.getAppInstallationUrl(repo.owner.login, repo.name);
                    setInstallationUrl(url);
                    handleCloseCreateDialog();
                    setIsAppInstallDialogOpen(true);
                    return;
                }
            }

            setCreateError(`Failed to create branch: ${errorMessage}`);
        } finally {
            setCreatingBranch(false);
        }
    };

    // Handle closing the app installation dialog
    const handleCloseAppInstallDialog = () => {
        setIsAppInstallDialogOpen(false);
    };

    // Handle opening the app installation URL
    const handleOpenAppInstallation = () => {
        window.open(installationUrl, '_blank');
        handleCloseAppInstallDialog();
    };

    return (
        <Box sx={{maxWidth: 600, mt: 2}}>
            {error && <Alert severity="error" sx={{mb: 2}}>{error}</Alert>}

            {branches.length > 0 ? (
                <>
                    <FormControl fullWidth margin="normal">
                        <InputLabel id="branch-select-label">Branch</InputLabel>
                        <Select
                            labelId="branch-select-label"
                            id="branch-select"
                            value={selectedBranch}
                            label="Branch"
                            onChange={handleBranchChange}
                            startAdornment={<AccountTreeIcon sx={{mr: 1, color: 'action.active'}}/>}
                        >
                            {branches.map((branch: Branch) => (
                                <MenuItem key={branch.name} value={branch.name}>
                                    {branch.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <Box sx={{mt: 2, display: 'flex', justifyContent: 'flex-start'}}>
                        <Button
                            startIcon={<AddIcon/>}
                            onClick={handleOpenCreateDialog}
                            variant="outlined"
                            color="primary"
                        >
                            Create New Branch
                        </Button>
                    </Box>
                </>
            ) : (
                <>
                    <Alert severity="info" sx={{mb: 2}}>No branches found in this repository.</Alert>
                    <Button
                        startIcon={<AddIcon/>}
                        onClick={handleOpenCreateDialog}
                        variant="outlined"
                        color="primary"
                    >
                        Create New Branch
                    </Button>
                </>
            )}

            {/* Create Branch Dialog */}
            <Dialog open={isCreateDialogOpen} onClose={handleCloseCreateDialog}>
                <DialogTitle>Create New Branch</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Create a new branch based on an existing branch. The new branch will contain all the
                        same files and commit history as the source branch.
                    </DialogContentText>

                    {createError && (
                        <Alert severity="error" sx={{mt: 2, mb: 2}}>
                            {createError}
                        </Alert>
                    )}

                    <TextField
                        autoFocus
                        margin="dense"
                        id="branch-name"
                        label="New Branch Name"
                        type="text"
                        fullWidth
                        variant="outlined"
                        value={newBranchName}
                        onChange={(e) => setNewBranchName(e.target.value)}
                        sx={{mt: 2}}
                    />

                    <FormControl fullWidth margin="normal">
                        <InputLabel id="source-branch-label">Source Branch</InputLabel>
                        <Select
                            labelId="source-branch-label"
                            id="source-branch"
                            value={sourceBranch}
                            label="Source Branch"
                            onChange={(e) => setSourceBranch(e.target.value)}
                        >
                            {branches.map((branch: Branch) => (
                                <MenuItem key={branch.name} value={branch.name}>
                                    {branch.name}
                                </MenuItem>
                            ))}
                            {/* Include main branch as a source option */}
                            {!branches.some((b: Branch) => b.name === 'main') && (
                                <MenuItem value="main">main</MenuItem>
                            )}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCreateDialog}>Cancel</Button>
                    <Button
                        onClick={handleCreateBranch}
                        variant="contained"
                        color="primary"
                        disabled={creatingBranch || !newBranchName}
                    >
                        {creatingBranch ? <CircularProgress size={24}/> : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* GitHub App Installation Dialog */}
            <Dialog open={isAppInstallDialogOpen} onClose={handleCloseAppInstallDialog}>
                <DialogTitle>
                    <Box display="flex" alignItems="center">
                        <WarningIcon color="warning" sx={{mr: 1}}/>
                        GitHub App Installation Required
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        To create branches or commit changes, you need to install the GitHub App for this
                        repository.
                        This will grant the necessary permissions to create branches and make commits.
                    </DialogContentText>

                    <Alert severity="info" sx={{mt: 2, mb: 2}}>
                        <Typography variant="body2" gutterBottom>
                            <strong>Installation steps:</strong>
                        </Typography>
                        <ol style={{marginTop: 0, paddingLeft: '1.5rem'}}>
                            <li>Click the "Install GitHub App" button below</li>
                            <li>On the GitHub page, select your organization/account</li>
                            <li>Choose the repository you want to install the app on</li>
                            <li>Click "Install" to complete the process</li>
                            <li>Return to this page and try again</li>
                        </ol>
                    </Alert>

                    {repo && (
                        <Box sx={{
                            mt: 2,
                            p: 2,
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider'
                        }}>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Selected
                                Repository</Typography>
                            <Typography variant="body1">
                                {repo.full_name}
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
        </Box>
    );
};

export default BranchSelector;

import React, {useEffect, useState} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {GitBranch, Plus, TriangleAlert} from 'lucide-react';
import type {Branch, Repository} from '../types/github';
import githubService, {isAppAuthorizationError} from '../services/githubService';
import apiAdapter from '../services/apiAdapter';
import logger from '../utils/logger';
import {useBranches} from '../services/githubRepoQueryHooks';
import {Button} from './ui/button';
import {Input} from './ui/input';
import {Label} from './ui/label';
import {Alert} from './ui/alert';
import {Spinner} from './ui/spinner';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from './ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';

interface BranchSelectorProps {
    onBranchSelected: (branch: string) => void;
    onBack?: () => void;
    repository?: Repository;
    repoId?: number;
}

const BranchSelector: React.FC<BranchSelectorProps> = ({onBranchSelected, repository, repoId}) => {
    const queryClient = useQueryClient();

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

    const accessCheckRef = React.useRef(false);
    const branchInitializedRef = React.useRef(false);

    const repo = repository;

    const {data: branchesData = [], isLoading: loading, error: branchQueryError} = useBranches(
        repo?.owner.login,
        repo?.name,
    );

    // Filter out the main branch - we don't allow direct edits to main.
    const branches = branchesData.filter((branch: Branch) => branch.name !== 'main');

    useEffect(() => {
        if (branchQueryError) {
            setError((branchQueryError as Error).message);
        }
    }, [branchQueryError]);

    useEffect(() => {
        if (branches.length > 0 && !loading && !accessCheckRef.current && !hasWriteAccess) {
            const timer = setTimeout(() => {
                checkRepositoryAccess();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (branches.length > 0 && !loading && !branchInitializedRef.current) {
            branchInitializedRef.current = true;
            setSelectedBranch(branches[0].name);
            onBranchSelected(branches[0].name);
        }
    }, [branches, loading, onBranchSelected]);

    useEffect(() => {
        if (repo) {
            setSelectedBranch('');
            branchInitializedRef.current = false;
            refreshBranches();
        }
    }, [repoId]); // eslint-disable-line react-hooks/exhaustive-deps

    const checkRepositoryAccess = async () => {
        if (!repo) return false;
        if (hasWriteAccess || accessCheckRef.current) return hasWriteAccess;
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

    const handleBranchChange = (branchName: string) => {
        setSelectedBranch(branchName);
        onBranchSelected(branchName);
    };

    const handleOpenCreateDialog = async () => {
        if (!repo) return;
        const hasAccess = await checkRepositoryAccess();
        if (!hasAccess) {
            setInstallationUrl(githubService.getAppInstallationUrl(repo.owner.login, repo.name));
            setIsAppInstallDialogOpen(true);
            return;
        }
        setSourceBranch(selectedBranch || repo.default_branch || '');
        setNewBranchName('');
        setCreateError(null);
        setIsCreateDialogOpen(true);
    };

    const handleCreateBranch = async () => {
        if (!newBranchName) {
            setCreateError('Branch name is required');
            return;
        }
        if (!/^[\w.-]+$/.test(newBranchName)) {
            setCreateError('Branch name can only contain letters, numbers, hyphens, underscores, and periods');
            return;
        }
        if (branches.some((b: Branch) => b.name === newBranchName)) {
            setCreateError(`Branch '${newBranchName}' already exists`);
            return;
        }

        setCreatingBranch(true);
        setCreateError(null);
        try {
            const hasAccess = await checkRepositoryAccess();
            if (!hasAccess && repository) {
                setInstallationUrl(githubService.getAppInstallationUrl(repository.owner.login, repository.name));
                setIsCreateDialogOpen(false);
                setIsAppInstallDialogOpen(true);
                return;
            }
            if (repository) {
                await apiAdapter.createBranch(repository.owner.login, repository.name, newBranchName, selectedBranch);
            }
        } catch (err) {
            logger.error('Error creating branch:', err);
            const errorMessage = (err as Error).message;
            if (isAppAuthorizationError(err) && repository) {
                setInstallationUrl(githubService.getAppInstallationUrl(repository.owner.login, repository.name));
                setIsCreateDialogOpen(false);
                setIsAppInstallDialogOpen(true);
                return;
            }
            setCreateError(errorMessage);
        } finally {
            setCreatingBranch(false);
        }
    };

    const handleOpenAppInstallation = () => {
        window.open(installationUrl, '_blank');
        setIsAppInstallDialogOpen(false);
    };

    if (!repo) {
        return <div className="text-sm font-semibold text-destructive">No repository selected</div>;
    }

    if (loading) {
        return (
            <div className="flex justify-center p-5">
                <Spinner />
            </div>
        );
    }

    if (error) {
        return <Alert variant="error">Error loading branches: {error}</Alert>;
    }

    if (branches.length === 0) {
        return (
            <div className="max-w-xl">
                <Alert variant="info" className="mb-3">
                    No branches available for editing. Only the main branch exists.
                </Alert>
                <Button variant="outline" onClick={handleOpenCreateDialog}>
                    <Plus className="h-4 w-4" />
                    Create new branch
                </Button>
                {renderDialogs()}
            </div>
        );
    }

    function renderDialogs() {
        return (
            <>
                {/* Create branch dialog */}
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Create new branch</DialogTitle>
                            <DialogDescription>
                                Create a new branch based on an existing branch. The new branch will contain all the
                                same files and commit history as the source branch.
                            </DialogDescription>
                        </DialogHeader>

                        {createError && <Alert variant="error">{createError}</Alert>}

                        <div className="min-w-0">
                            <Label htmlFor="new-branch-name" className="mb-1.5 block">
                                New branch name
                            </Label>
                            <Input
                                id="new-branch-name"
                                autoFocus
                                value={newBranchName}
                                onChange={(e) => setNewBranchName(e.target.value)}
                                placeholder="my-feature-branch"
                            />
                        </div>

                        <div className="min-w-0">
                            <Label className="mb-1.5 block">Source branch</Label>
                            <Select value={sourceBranch} onValueChange={setSourceBranch}>
                                <SelectTrigger className="w-full min-w-0">
                                    <SelectValue placeholder="Select a source branch" />
                                </SelectTrigger>
                                <SelectContent>
                                    {branches.map((branch: Branch) => (
                                        <SelectItem key={branch.name} value={branch.name}>
                                            {branch.name}
                                        </SelectItem>
                                    ))}
                                    {!branches.some((b: Branch) => b.name === 'main') && (
                                        <SelectItem value="main">main</SelectItem>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <DialogFooter>
                            <Button variant="secondary" onClick={() => setIsCreateDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleCreateBranch} disabled={creatingBranch || !newBranchName}>
                                {creatingBranch ? <Spinner size={16} className="text-white" /> : null}
                                Create
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* App install dialog */}
                <Dialog open={isAppInstallDialogOpen} onOpenChange={setIsAppInstallDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <TriangleAlert className="h-5 w-5 text-amber-500" />
                                GitHub App installation required
                            </DialogTitle>
                            <DialogDescription>
                                To create branches or commit changes, you need to install the GitHub App for this
                                repository.
                            </DialogDescription>
                        </DialogHeader>

                        <Alert variant="info">
                            <div className="mb-1 font-semibold">Installation steps:</div>
                            <ol className="ml-5 list-decimal space-y-0.5">
                                <li>Click the "Install GitHub App" button below</li>
                                <li>On the GitHub page, select your organization/account</li>
                                <li>Choose the repository you want to install the app on</li>
                                <li>Click "Install" to complete the process</li>
                                <li>Return to this page and try again</li>
                            </ol>
                        </Alert>

                        {repo && (
                            <div className="rounded-md border border-border bg-background p-2">
                                <div className="text-xs text-muted-foreground">Selected repository</div>
                                <div className="text-sm">{repo.full_name}</div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button variant="secondary" onClick={() => setIsAppInstallDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleOpenAppInstallation}>Install GitHub App</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </>
        );
    }

    return (
        <div className="max-w-xl">
            {error && <Alert variant="error" className="mb-3">{error}</Alert>}

            <Label className="mb-1.5 block">Branch</Label>
            <Select value={selectedBranch} onValueChange={handleBranchChange}>
                <SelectTrigger className="w-full">
                    <span className="flex items-center gap-2">
                        <GitBranch className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Select a branch" />
                    </span>
                </SelectTrigger>
                <SelectContent>
                    {branches.map((branch: Branch) => (
                        <SelectItem key={branch.name} value={branch.name}>
                            {branch.name}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <div className="mt-3">
                <Button variant="outline" onClick={handleOpenCreateDialog}>
                    <Plus className="h-4 w-4" />
                    Create new branch
                </Button>
            </div>

            {renderDialogs()}
        </div>
    );
};

export default BranchSelector;

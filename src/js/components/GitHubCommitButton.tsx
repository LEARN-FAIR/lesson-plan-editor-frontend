import React, {useEffect, useState} from 'react';
import {
    ArrowLeftRight,
    ChevronDown,
    Download,
    FileText,
    Folder,
    GitBranch,
    Github,
    RefreshCw,
} from 'lucide-react';
import githubService, {type CommitFileParams} from '../services/githubService';
import type {Repository} from '../types/github';
import type {LessonPlan} from '../types/lessonPlan';
import type {FairMarkdownDocument} from '../types';
import {useFileContent, useHasCommitsOnBranch} from '../services/githubQueryHooks';
import {useQueryClient} from '@tanstack/react-query';
import {prefetchFileContent, setFileContentInCache} from '../utils/queryUtils';
import ReactDiffViewer from 'react-diff-viewer-continued';
import logger from '../utils/logger';
import apiAdapter from '../services/apiAdapter';
import customContributorService from '../services/customContributorService';
import {Button} from './ui/button';
import {Spinner} from './ui/spinner';
import {Alert} from './ui/alert';
import {Input} from './ui/input';
import {Label} from './ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {Tabs, TabsList, TabsTrigger} from './ui/tabs';

interface GitHubCommitButtonProps {
    content: string;
    filePath: string;
    originalGithubContent?: string;
    disabled?: boolean;
    onExport: () => void;
    repository?: Repository;
    branch?: string;
    lessonPlan?: LessonPlan;
    document?: FairMarkdownDocument;
}

const diffStyles = {
    contentText: {fontSize: '0.7rem', lineHeight: '1.2', fontFamily: 'monospace'},
    gutter: {fontSize: '0.65rem', padding: '0 0.3rem', lineHeight: '1.2'},
    line: {padding: '0'},
};

const infoBoxClass = 'mb-2 rounded-md border border-border bg-background p-2';

const GitHubCommitButton: React.FC<GitHubCommitButtonProps> = ({
    content,
    filePath,
    originalGithubContent: propOriginalContent,
    disabled = false,
    onExport,
    repository,
    branch,
    document,
}) => {
    const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean>(false);
    const [commitMessage, setCommitMessage] = useState<string>(`Update ${filePath}`);
    const [diffTab, setDiffTab] = useState<'lesson' | 'contributors'>('lesson');
    const [contributorsContent, setContributorsContent] = useState<string>('');
    const [originalContributorsContent, setOriginalContributorsContent] = useState<string>('');
    const [usedCustomContributorsForCommit, setUsedCustomContributorsForCommit] = useState<any[]>([]);

    const [isAppInstallDialogOpen, setIsAppInstallDialogOpen] = useState<boolean>(false);
    const [installationUrl, setInstallationUrl] = useState<string>('');

    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(githubService.isAuthenticated());

    const [isPrMode, setIsPrMode] = useState<boolean>(false);

    const queryClient = useQueryClient();

    useEffect(() => {
        setIsAuthenticated(githubService.isAuthenticated());
    }, []);

    // Auto-dismiss the success toast.
    useEffect(() => {
        if (success) {
            const t = setTimeout(() => setSuccess(false), 4000);
            return () => clearTimeout(t);
        }
    }, [success]);

    const selectedRepo = repository;
    const selectedBranch = branch;

    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    const owner = selectedRepo?.owner.login || '';
    const repoName = selectedRepo?.name || '';
    const branchName = selectedBranch || '';

    const {
        data: hasCommits = false,
        isLoading: isLoadingCommits,
        refetch: refetchCommits,
    } = useHasCommitsOnBranch(owner, repoName, branchName);

    const {
        data: fileContent,
        isLoading: isLoadingFileContent,
        refetch: refetchFileContent,
    } = useFileContent(owner, repoName, filePath, branchName, {
        enabled: !propOriginalContent && !!owner && !!repoName && !!filePath && !!branchName,
    });

    const [isLoadingContent, setIsLoadingContent] = useState<boolean>(!propOriginalContent && !fileContent);

    useEffect(() => {
        if (propOriginalContent || fileContent) {
            setIsLoadingContent(false);
        } else {
            setIsLoadingContent(true);
        }
    }, [propOriginalContent, fileContent]);

    const effectiveGithubContent = propOriginalContent || fileContent || '';
    const contentLoaded = effectiveGithubContent !== undefined && effectiveGithubContent !== '' && !isLoadingContent;

    const [hasUncommittedChanges, setHasUncommittedChanges] = useState<boolean>(true);
    const [isLoadingChanges] = useState<boolean>(false);

    const [contentChanged, setContentChanged] = useState<boolean>(false);

    useEffect(() => {
        if (effectiveGithubContent && content) {
            const normalizedGithubContent = effectiveGithubContent.replace(/\r\n/g, '\n').trim();
            const normalizedLocalContent = content.replace(/\r\n/g, '\n').trim();
            const hasChanged = normalizedGithubContent !== normalizedLocalContent;
            setContentChanged(hasChanged);
            setHasUncommittedChanges(hasChanged);
        }
    }, [effectiveGithubContent, content]);

    useEffect(() => {
        const shouldShowPrMode = hasCommits && !hasUncommittedChanges && !contentChanged && contentLoaded;
        setIsPrMode(shouldShowPrMode);
    }, [hasCommits, hasUncommittedChanges, contentChanged, contentLoaded, effectiveGithubContent, content]);

    const refreshGitHubInfo = async () => {
        setIsRefreshing(true);
        try {
            await prefetchFileContent(owner, repoName, filePath, branchName);
            await refetchCommits();
            const fileContentResult = await refetchFileContent();
            const newContent = fileContentResult.data || propOriginalContent || '';
            if (newContent && content) {
                const normalizedGithubContent = newContent.replace(/\r\n/g, '\n').trim();
                const normalizedLocalContent = content.replace(/\r\n/g, '\n').trim();
                const hasChanged = normalizedGithubContent !== normalizedLocalContent;
                setContentChanged(hasChanged);
                setHasUncommittedChanges(hasChanged);
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
        setCommitMessage('');

        const allCustomContributors = customContributorService.getCustomContributors();

        if (allCustomContributors.length > 0 && owner && repoName && selectedBranch && document) {
            const usedContributorIds = new Set<string>();
            if (document.authors) document.authors.forEach((id) => usedContributorIds.add(id));
            if (document.reviewers) document.reviewers.forEach((id) => usedContributorIds.add(id));

            const usedCustomContributors = allCustomContributors.filter((c) => usedContributorIds.has(c.id));
            setUsedCustomContributorsForCommit(usedCustomContributors);

            if (usedCustomContributors.length > 0) {
                const buildYaml = (list: typeof usedCustomContributors) =>
                    list
                        .map((c) => {
                            const lines = [
                                `- id: "${c.id}"`,
                                `  orcid: "${c.orcid || c.id}"`,
                                `  firstName: "${c.firstName}"`,
                                `  lastName: "${c.lastName}"`,
                            ];
                            if (c.git) lines.push(`  git: "${c.git}"`);
                            return lines.join('\n');
                        })
                        .join('\n\n');

                try {
                    const existingContent = await apiAdapter.getFileContent(
                        owner,
                        repoName,
                        '_data/contributors.yaml',
                        selectedBranch,
                    );
                    setOriginalContributorsContent(existingContent);
                    let mergedContent = existingContent;
                    if (mergedContent && !mergedContent.endsWith('\n')) mergedContent += '\n';
                    mergedContent += buildYaml(usedCustomContributors);
                    setContributorsContent(mergedContent);
                } catch (err) {
                    logger.warn('Could not fetch contributors file:', err);
                    setOriginalContributorsContent('');
                    setContributorsContent(buildYaml(usedCustomContributors));
                }
            }
        }
    };

    const handleCloseDialog = () => {
        setIsDialogOpen(false);
        setError('');
        setUsedCustomContributorsForCommit([]);
        if (success) {
            setContentChanged(false);
            setIsPrMode(true);
            setTimeout(() => refreshGitHubInfo(), 100);
        }
    };

    const handleExport = () => {
        onExport();
    };

    const handleSignInWithGitHub = () => {
        githubService.redirectToGitHub();
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
            const hasAccess = await githubService.checkRepositoryWriteAccess(
                selectedRepo.owner.login,
                selectedRepo.name,
            );
            if (!hasAccess) {
                const url = githubService.getAppInstallationUrl(selectedRepo.owner.login, selectedRepo.name);
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
                customContributors:
                    usedCustomContributorsForCommit.length > 0 ? usedCustomContributorsForCommit : undefined,
            };

            const result = await githubService.commitFile(params);
            logger.log('Commit successful:', result);
            setSuccess(true);
            handleCloseDialog();

            queryClient.invalidateQueries({queryKey: ['fileContent']});
            queryClient.invalidateQueries({queryKey: ['hasUncommittedChanges']});
            queryClient.invalidateQueries({queryKey: ['hasCommitsOnBranch']});
            if (filePath) {
                queryClient.invalidateQueries({queryKey: ['lessonPlanContent', filePath]});
            }

            setContentChanged(false);

            setTimeout(async () => {
                queryClient.removeQueries({queryKey: ['fileContent', owner, repoName, filePath, branchName]});
                await prefetchFileContent(owner, repoName, filePath, branchName);
                const [fileContentResult, commitsResult] = await Promise.all([
                    refetchFileContent(),
                    refetchCommits(),
                ]);
                const newContent = fileContentResult.data || propOriginalContent || '';
                setFileContentInCache(owner, repoName, filePath, branchName, newContent);

                let hasChanges = false;
                if (newContent && content) {
                    const normalizedGithubContent = newContent.replace(/\r\n/g, '\n').trim();
                    const normalizedLocalContent = content.replace(/\r\n/g, '\n').trim();
                    hasChanges = normalizedGithubContent !== normalizedLocalContent;
                    setHasUncommittedChanges(hasChanges);
                    setContentChanged(hasChanges);
                }
                setIsPrMode(!!commitsResult.data && !hasChanges && !!newContent);
            }, 500);
        } catch (err) {
            logger.error('Commit error:', err);
            if ((err as Error).message.includes('Resource not accessible by integration')) {
                const url = githubService.getAppInstallationUrl(selectedRepo.owner.login, selectedRepo.name);
                setInstallationUrl(url);
                setIsAppInstallDialogOpen(true);
            } else {
                setError(`Failed to commit to GitHub: ${(err as Error).message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenAppInstallation = () => {
        if (selectedRepo) {
            window.open(installationUrl, '_blank');
        }
    };

    const handleCreatePullRequest = () => {
        if (!isAuthenticated) {
            setError('Please authenticate with GitHub first');
            return;
        }
        if (!selectedRepo || !selectedBranch) {
            setError('No repository or branch selected');
            return;
        }
        const url = `https://github.com/${owner}/${repoName}/pull/new/${branchName}`;
        window.open(url, '_blank');
    };

    const isContentReady = contentLoaded && !isLoadingChanges;
    const isAnyLoading = isRefreshing || isLoadingCommits || isLoadingContent || isLoadingChanges;

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
            <Button variant="teal" disabled>
                <Spinner size={16} className="text-white" />
                Loading…
            </Button>
        );
    }

    // Error state
    if (!propOriginalContent && !isLoadingContent) {
        return (
            <Button variant="teal" disabled>
                <Github className="h-4 w-4" />
                Error loading content
            </Button>
        );
    }

    const mainVariant = isPrMode ? 'success' : 'teal';
    const actionsDisabled = disabled || isLoading || !isAuthenticated || isAnyLoading || !isContentReady;

    return (
        <>
            <div className="flex">
                <Button
                    variant={mainVariant}
                    onClick={handleMainButtonClick}
                    disabled={actionsDisabled}
                    className="rounded-r-none"
                >
                    {isAnyLoading ? <Spinner size={16} className="text-white" /> : <Github className="h-4 w-4" />}
                    {isAnyLoading ? 'Loading…' : isPrMode ? 'Create pull request' : 'Commit'}
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant={mainVariant}
                            disabled={actionsDisabled}
                            aria-label="More actions"
                            className="rounded-l-none border-l border-white/30 px-2"
                        >
                            <ChevronDown className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleExport}>
                            <Download className="h-4 w-4" />
                            Download file
                        </DropdownMenuItem>
                        {isAuthenticated && (
                            <DropdownMenuItem onClick={() => refreshGitHubInfo()}>
                                <RefreshCw className="h-4 w-4" />
                                Refresh GitHub status
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Commit dialog */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Commit to GitHub</DialogTitle>
                    </DialogHeader>

                    {error && <Alert variant="error">{error}</Alert>}

                    {!isAuthenticated ? (
                        <div className="text-center">
                            <p className="text-sm text-muted-foreground">
                                Connect with your GitHub account to commit changes to a repository.
                            </p>
                            <div className="my-6 flex justify-center">
                                <Button size="lg" onClick={handleSignInWithGitHub}>
                                    <Github className="h-4 w-4" />
                                    Sign in with GitHub
                                </Button>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                You'll be redirected to GitHub to authorize this application.
                            </p>
                        </div>
                    ) : (
                        selectedRepo && (
                            <div className="flex flex-col gap-4 md:flex-row">
                                {/* Left: repo/branch/file + commit message */}
                                <div className="w-full md:w-[360px]">
                                    <div className={infoBoxClass}>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Folder className="h-3.5 w-3.5 text-navy" /> Repository
                                        </div>
                                        <div className="text-sm">{selectedRepo.full_name}</div>
                                    </div>
                                    <div className={infoBoxClass}>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <GitBranch className="h-3.5 w-3.5 text-navy" /> Branch
                                        </div>
                                        <div className="text-sm">{selectedBranch}</div>
                                    </div>
                                    <div className={infoBoxClass}>
                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <FileText className="h-3.5 w-3.5 text-navy" /> File
                                        </div>
                                        <div className="break-all text-sm">{filePath}</div>
                                    </div>

                                    <Label htmlFor="commit-message" className="mb-1.5 mt-3 block">
                                        Commit message
                                    </Label>
                                    <Input
                                        id="commit-message"
                                        value={commitMessage}
                                        onChange={(e) => setCommitMessage(e.target.value)}
                                        placeholder="Describe your changes"
                                    />
                                    {!commitMessage.trim() && (
                                        <div className="mt-1 text-xs text-destructive">Commit message is required</div>
                                    )}
                                </div>

                                {/* Right: diff */}
                                <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground">
                                        <ArrowLeftRight className="h-3.5 w-3.5 text-navy" /> Changes to be committed
                                    </div>
                                    <Tabs value={diffTab} onValueChange={(v) => setDiffTab(v as typeof diffTab)}>
                                        <TabsList>
                                            <TabsTrigger value="lesson">Lesson plan</TabsTrigger>
                                            {contributorsContent && (
                                                <TabsTrigger value="contributors">Contributors</TabsTrigger>
                                            )}
                                        </TabsList>
                                    </Tabs>
                                    <div className="mt-1 max-h-[400px] overflow-auto rounded-md border border-border">
                                        {diffTab === 'lesson' && (
                                            <ReactDiffViewer
                                                oldValue={propOriginalContent || ''}
                                                newValue={content}
                                                splitView={false}
                                                showDiffOnly={false}
                                                useDarkTheme={false}
                                                styles={diffStyles}
                                            />
                                        )}
                                        {diffTab === 'contributors' && contributorsContent && (
                                            <ReactDiffViewer
                                                oldValue={originalContributorsContent}
                                                newValue={contributorsContent}
                                                splitView={false}
                                                showDiffOnly={false}
                                                useDarkTheme={false}
                                                styles={diffStyles}
                                            />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    )}

                    <DialogFooter>
                        <Button variant="secondary" onClick={handleCloseDialog}>
                            Cancel
                        </Button>
                        {isAuthenticated && (
                            <Button
                                onClick={handleCommit}
                                disabled={isLoading || !selectedRepo || !selectedBranch || !commitMessage.trim()}
                            >
                                {isLoading ? <Spinner size={16} className="text-white" /> : <Github className="h-4 w-4" />}
                                {isLoading ? 'Committing…' : 'Commit'}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* GitHub App installation dialog */}
            <Dialog open={isAppInstallDialogOpen} onOpenChange={setIsAppInstallDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Github className="h-5 w-5 text-amber-500" />
                            GitHub App installation required
                        </DialogTitle>
                        <DialogDescription>
                            To commit changes to this repository, you need to install the GitHub App. This grants the
                            permissions to create branches and make commits.
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

                    {selectedRepo && (
                        <div className={infoBoxClass}>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Folder className="h-3.5 w-3.5 text-navy" /> Selected repository
                            </div>
                            <div className="text-sm">{selectedRepo.full_name}</div>
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

            {/* Success toast */}
            {success && (
                <div className="fixed bottom-6 left-6 z-[1500] animate-fade-in rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-md">
                    Changes committed successfully.
                </div>
            )}
        </>
    );
};

export default GitHubCommitButton;

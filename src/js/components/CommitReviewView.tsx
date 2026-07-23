import React, {useEffect, useState} from 'react';
import {ArrowLeft, Check, FileText, Folder, GitBranch, Github, TriangleAlert} from 'lucide-react';
import {useQueryClient} from '@tanstack/react-query';
import ReactDiffViewer from 'react-diff-viewer-continued';
import githubService, {type CommitFileParams} from '../services/githubService';
import type {Repository} from '../types/github';
import type {FairMarkdownDocument} from '../types';
import {useHasCommitsOnBranch} from '../services/githubQueryHooks';
import {prefetchFileContent, setFileContentInCache} from '../utils/queryUtils';
import apiAdapter from '../services/apiAdapter';
import customContributorService from '../services/customContributorService';
import logger from '../utils/logger';
import {Button} from './ui/button';
import {Spinner} from './ui/spinner';
import {Alert} from './ui/alert';
import {Label} from './ui/label';
import {Textarea} from './ui/textarea';
import {Tabs, TabsList, TabsTrigger} from './ui/tabs';
import {Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from './ui/dialog';

interface CommitReviewViewProps {
    content: string;
    filePath: string;
    originalGithubContent?: string;
    repository?: Repository;
    branch?: string;
    document?: FairMarkdownDocument;
    /** Close the commit view and return to the editor. */
    onClose: () => void;
}

const diffStyles = {
    contentText: {fontSize: '0.75rem', lineHeight: '1.3', fontFamily: 'monospace'},
    gutter: {fontSize: '0.7rem', padding: '0 0.4rem', lineHeight: '1.3'},
    line: {padding: '0'},
};

/**
 * Inline "Review & commit changes" takeover (per the design handoff): replaces
 * the editor's sub-header + sections while the app header stays put. Shows the
 * commit message + unified diff and commits straight to GitHub.
 */
const CommitReviewView: React.FC<CommitReviewViewProps> = ({
    content,
    filePath,
    originalGithubContent = '',
    repository,
    branch,
    document,
    onClose,
}) => {
    const queryClient = useQueryClient();
    const [isAuthenticated] = useState<boolean>(githubService.isAuthenticated());
    const [commitMessage, setCommitMessage] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean>(false);

    const [diffTab, setDiffTab] = useState<'lesson' | 'contributors'>('lesson');
    const [contributorsContent, setContributorsContent] = useState<string>('');
    const [originalContributorsContent, setOriginalContributorsContent] = useState<string>('');
    const [usedCustomContributors, setUsedCustomContributors] = useState<
        ReturnType<typeof customContributorService.getCustomContributors>
    >([]);

    const [isAppInstallDialogOpen, setIsAppInstallDialogOpen] = useState<boolean>(false);
    const [installationUrl, setInstallationUrl] = useState<string>('');

    const owner = repository?.owner.login || '';
    const repoName = repository?.name || '';
    const branchName = branch || '';

    const {data: hasCommits = false} = useHasCommitsOnBranch(owner, repoName, branchName);

    const normalizedOriginal = originalGithubContent.replace(/\r\n/g, '\n').trim();
    const normalizedLocal = content.replace(/\r\n/g, '\n').trim();
    const hasChanges = normalizedOriginal !== normalizedLocal;
    // No local edits but the branch has commits → offer a pull request instead.
    const isPrMode = !hasChanges && hasCommits;

    // Build the merged contributors.yaml diff for any custom contributors in use.
    useEffect(() => {
        const all = customContributorService.getCustomContributors();
        if (all.length === 0 || !owner || !repoName || !branchName || !document) return;

        const usedIds = new Set<string>([...(document.authors || []), ...(document.reviewers || [])]);
        const used = all.filter((c) => usedIds.has(c.id));
        setUsedCustomContributors(used);
        if (used.length === 0) return;

        const buildYaml = (list: typeof used) =>
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

        apiAdapter
            .getFileContent(owner, repoName, '_data/contributors.yaml', branchName)
            .then((existing) => {
                setOriginalContributorsContent(existing);
                let merged = existing;
                if (merged && !merged.endsWith('\n')) merged += '\n';
                setContributorsContent(merged + buildYaml(used));
            })
            .catch((err) => {
                logger.warn('Could not fetch contributors file:', err);
                setOriginalContributorsContent('');
                setContributorsContent(buildYaml(used));
            });
    }, [owner, repoName, branchName, document]);

    const handleCommit = async () => {
        if (!isAuthenticated) return setError('Please authenticate with GitHub first');
        if (!commitMessage.trim()) return setError('Please enter a commit message');
        if (!repository) return setError('No repository selected.');
        if (!branch) return setError('No branch selected.');

        setIsLoading(true);
        setError(null);
        try {
            const hasAccess = await githubService.checkRepositoryWriteAccess(owner, repoName);
            if (!hasAccess) {
                setInstallationUrl(githubService.getAppInstallationUrl(owner, repoName));
                setIsAppInstallDialogOpen(true);
                setIsLoading(false);
                return;
            }

            const params: CommitFileParams = {
                owner,
                repo: repoName,
                path: filePath,
                message: commitMessage,
                content,
                branch: branchName,
                customContributors: usedCustomContributors.length > 0 ? usedCustomContributors : undefined,
            };
            await githubService.commitFile(params);
            setSuccess(true);

            queryClient.invalidateQueries({queryKey: ['fileContent']});
            queryClient.invalidateQueries({queryKey: ['hasCommitsOnBranch']});
            setTimeout(async () => {
                queryClient.removeQueries({queryKey: ['fileContent', owner, repoName, filePath, branchName]});
                await prefetchFileContent(owner, repoName, filePath, branchName);
                setFileContentInCache(owner, repoName, filePath, branchName, content);
            }, 500);
        } catch (err) {
            const message = (err as Error).message;
            if (message.includes('Resource not accessible by integration')) {
                setInstallationUrl(githubService.getAppInstallationUrl(owner, repoName));
                setIsAppInstallDialogOpen(true);
            } else {
                setError(`Failed to commit to GitHub: ${message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreatePullRequest = () => {
        window.open(`https://github.com/${owner}/${repoName}/pull/new/${branchName}`, '_blank');
    };

    return (
        <div className="min-h-0 flex-1 overflow-auto bg-zinc-50 px-8 py-7">
            <div className="mx-auto max-w-[1040px]">
                {/* Title row */}
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div className="text-[19px] font-semibold text-navy">Review &amp; commit changes</div>
                    <Button variant="ghost" onClick={onClose}>
                        <ArrowLeft className="h-4 w-4" />
                        Back to editor
                    </Button>
                </div>

                {error && (
                    <Alert variant="error" className="mb-4">
                        {error}
                    </Alert>
                )}

                {success ? (
                    <Alert variant="info" className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-600" />
                        Changes committed successfully.
                        <Button variant="ghost" size="sm" className="ml-auto" onClick={onClose}>
                            Back to editor
                        </Button>
                    </Alert>
                ) : !isAuthenticated ? (
                    <Alert variant="info" className="flex flex-col items-start gap-3">
                        <span>Connect with your GitHub account to commit changes.</span>
                        <Button onClick={() => githubService.redirectToGitHub()}>
                            <Github className="h-4 w-4" />
                            Sign in with GitHub
                        </Button>
                    </Alert>
                ) : (
                    <div className="flex flex-col gap-6 md:flex-row">
                        {/* Left: commit message + actions */}
                        <div className="w-full flex-shrink-0 md:w-[280px]">
                            <div className="mb-4 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Folder className="h-3.5 w-3.5 shrink-0 text-navy" />
                                    <span className="break-all">{repository?.full_name}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <GitBranch className="h-3.5 w-3.5 shrink-0 text-navy" />
                                    <span className="break-all">{branch}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <FileText className="h-3.5 w-3.5 shrink-0 text-navy" />
                                    <span className="break-all">{filePath}</span>
                                </div>
                            </div>

                            {isPrMode ? (
                                <Alert variant="info" className="mt-3 flex flex-col items-start gap-3">
                                    <span>No local changes. This branch has commits ready for a pull request.</span>
                                    <Button variant="success" onClick={handleCreatePullRequest}>
                                        <Github className="h-4 w-4" />
                                        Create pull request
                                    </Button>
                                </Alert>
                            ) : (
                                <>
                                    <Label htmlFor="commit-message" className="mb-1.5 block">
                                        Commit message
                                    </Label>
                                    <Textarea
                                        id="commit-message"
                                        value={commitMessage}
                                        onChange={(e) => setCommitMessage(e.target.value)}
                                        placeholder="Describe your changes"
                                        className="min-h-24"
                                    />
                                    <Button
                                        className="mt-3 w-full"
                                        onClick={handleCommit}
                                        disabled={isLoading || !commitMessage.trim() || !hasChanges}
                                    >
                                        {isLoading ? (
                                            <Spinner size={16} className="text-primary-foreground" />
                                        ) : (
                                            <Check className="h-4 w-4" />
                                        )}
                                        {isLoading ? 'Committing…' : 'Commit changes'}
                                    </Button>
                                    <Button variant="ghost" className="mt-1 w-full" onClick={onClose}>
                                        Cancel
                                    </Button>
                                    {!hasChanges && (
                                        <div className="mt-2 text-xs text-muted-foreground">
                                            No changes to commit.
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Right: diff */}
                        <div className="min-w-0 flex-1">
                            <div className="mb-2 text-sm font-medium text-zinc-700">Changes</div>
                            {contributorsContent && (
                                <Tabs
                                    value={diffTab}
                                    onValueChange={(v) => setDiffTab(v as typeof diffTab)}
                                    className="mb-2"
                                >
                                    <TabsList>
                                        <TabsTrigger value="lesson">Lesson plan</TabsTrigger>
                                        <TabsTrigger value="contributors">Contributors</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            )}
                            <div className="max-h-[540px] overflow-auto rounded-lg border border-border">
                                {diffTab === 'lesson' ? (
                                    <ReactDiffViewer
                                        oldValue={originalGithubContent}
                                        newValue={content}
                                        splitView={false}
                                        showDiffOnly={false}
                                        useDarkTheme={false}
                                        styles={diffStyles}
                                    />
                                ) : (
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
                )}
            </div>

            {/* GitHub App installation dialog (edge case, stays modal) */}
            <Dialog open={isAppInstallDialogOpen} onOpenChange={setIsAppInstallDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <TriangleAlert className="h-5 w-5 text-amber-500" />
                            GitHub App installation required
                        </DialogTitle>
                        <DialogDescription>
                            To commit changes to this repository, install the GitHub App to grant commit permissions.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setIsAppInstallDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={() => window.open(installationUrl, '_blank')}>Install GitHub App</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CommitReviewView;

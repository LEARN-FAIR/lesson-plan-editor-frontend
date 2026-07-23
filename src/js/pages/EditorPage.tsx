import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {Download, GitBranch, GitCommitHorizontal, X} from 'lucide-react';
import {useRepositories} from '../services/githubRepoQueryHooks';
import {useFileContent} from '../services/githubQueryHooks';
import {exportMarkdownFile, getCurrentFilename} from '../services/markdownService';
import {parseMarkdown, serializeMarkdown} from '../utils/markdownUtils';
import {constructLessonPath} from '../utils/urlUtils';
import logger from '../utils/logger';
import type {FairMarkdownDocument} from '../types';
import UserMenu from '../components/navigation/UserMenu';
import CommitReviewView from '../components/CommitReviewView';
import SinglePageEditor from '../components/editor/SinglePageEditor';
import {Button} from '../components/ui/button';
import {PageSpinner} from '../components/ui/spinner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';

const EditorPage: React.FC = () => {
    const navigate = useNavigate();
    const [document, setDocument] = useState<FairMarkdownDocument>();
    const [markdownContent, setMarkdownContent] = useState<string>('');
    const [commitOpen, setCommitOpen] = useState<boolean>(false);
    // The serialized content as first loaded / last committed — used to detect edits.
    const [baselineContent, setBaselineContent] = useState<string | null>(null);
    const [leaveOpen, setLeaveOpen] = useState<boolean>(false);

    const params = useParams<{owner: string; repo: string; branch: string; category: string; lesson: string}>();
    const {owner, repo, branch, category, lesson} = params;
    const fullLessonPath = category && lesson ? constructLessonPath(category, lesson) : '';

    const {repositories = []} = useRepositories();
    const repository = repositories.find((r) => r.owner.login === owner && r.name === repo);

    const {data: fileContent, isLoading: isLoadingFileContent} = useFileContent(
        owner || '',
        repo || '',
        fullLessonPath,
        branch || '',
        {enabled: !!owner && !!repo && !!branch && !!fullLessonPath},
    );

    useEffect(() => {
        if (fileContent !== undefined) {
            const parsed = parseMarkdown(fileContent);
            setDocument(parsed);
            // Seed the serialized content so the Commit button + diff are available
            // immediately (not only after the first edit).
            try {
                const serialized = serializeMarkdown(parsed);
                setMarkdownContent(serialized);
                setBaselineContent((prev) => prev ?? serialized);
            } catch (error) {
                logger.error('Error serializing markdown:', error);
            }
        }
    }, [fileContent]);

    const normalize = (s: string) => s.replace(/\r\n/g, '\n').trim();
    const hasUnsavedChanges =
        baselineContent !== null && normalize(markdownContent) !== normalize(baselineContent);

    // Warn on browser-level navigation (refresh, tab close, external link).
    useEffect(() => {
        if (!hasUnsavedChanges) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', handler);
        return () => window.removeEventListener('beforeunload', handler);
    }, [hasUnsavedChanges]);

    // Guard the browser Back button. BrowserRouter has no useBlocker, so we push
    // a sentinel history entry and intercept the resulting popstate: re-arm the
    // sentinel to stay put and prompt. Confirming "Leave" navigates to the list.
    useEffect(() => {
        if (!hasUnsavedChanges) return;
        window.history.pushState(null, '', window.location.href);
        const onPopState = () => {
            window.history.pushState(null, '', window.location.href);
            setLeaveOpen(true);
        };
        window.addEventListener('popstate', onPopState);
        return () => window.removeEventListener('popstate', onPopState);
    }, [hasUnsavedChanges]);

    if (isLoadingFileContent || fileContent === undefined || document === undefined) {
        return <PageSpinner />;
    }

    const originalGithubContent = fileContent || '';

    const handleDocumentChange = (updatedDocument: Partial<FairMarkdownDocument>) => {
        const newDocument = {...document, ...updatedDocument};
        setDocument(newDocument);
        try {
            setMarkdownContent(serializeMarkdown(newDocument));
        } catch (error) {
            logger.error('Error serializing markdown:', error);
        }
    };

    const handleExportMarkdown = () => {
        if (markdownContent) {
            exportMarkdownFile(markdownContent, getCurrentFilename(fullLessonPath) || lesson);
        }
    };

    // In-app navigation back to the lesson list — guard when there are edits.
    const requestLeave = () => {
        if (hasUnsavedChanges) {
            setLeaveOpen(true);
        } else {
            navigate('/');
        }
    };

    return (
        <div className="flex h-screen flex-col font-sans">
            {/* Header bar */}
            <header
                className="flex flex-shrink-0 items-center justify-between px-8 py-[18px]"
                style={{background: 'linear-gradient(180deg, rgb(12,52,80), rgb(10,44,68))'}}
            >
                <div className="min-w-0">
                    <div className="text-lg font-semibold text-white">Lesson Plan Editor</div>
                    <div className="mt-1 flex items-center gap-2.5 text-xs text-white/65">
                        <GitBranch className="h-3.5 w-3.5 shrink-0" />
                        <button
                            type="button"
                            onClick={requestLeave}
                            className="max-w-full cursor-pointer appearance-none truncate border-0 bg-transparent p-0 text-white/65 transition-colors hover:text-white"
                            title="Back to lesson selection"
                        >
                            {owner}/{repo}
                        </button>
                        <span className="opacity-50">•</span>
                        <span>{branch}</span>
                        {lesson && (
                            <>
                                <span className="opacity-50">•</span>
                                <span className="truncate">{lesson}</span>
                            </>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        onClick={handleExportMarkdown}
                        className="h-9 border border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </Button>
                    {markdownContent &&
                        (commitOpen ? (
                            <Button
                                variant="ghost"
                                onClick={() => setCommitOpen(false)}
                                className="h-9 border border-white/25 bg-white/10 text-white hover:bg-white/20 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                                Hide changes
                            </Button>
                        ) : (
                            <Button variant="teal" className="h-9" onClick={() => setCommitOpen(true)}>
                                <GitCommitHorizontal className="h-4 w-4" />
                                Commit
                            </Button>
                        ))}
                    <UserMenu />
                </div>
            </header>

            {commitOpen ? (
                <CommitReviewView
                    content={markdownContent}
                    originalGithubContent={originalGithubContent}
                    filePath={getCurrentFilename(fullLessonPath)}
                    repository={repository}
                    branch={branch}
                    document={document}
                    onCommitted={() => setBaselineContent(markdownContent)}
                    onClose={() => setCommitOpen(false)}
                />
            ) : (
                <SinglePageEditor
                    document={document}
                    onDocumentChange={handleDocumentChange}
                    owner={owner}
                    repo={repo}
                    branch={branch}
                />
            )}

            {/* Unsaved-changes guard for in-app navigation */}
            <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Leave without committing?</DialogTitle>
                        <DialogDescription>
                            You have uncommitted changes that will be lost if you leave this lesson plan. Commit them
                            first to keep your work.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setLeaveOpen(false)}>
                            Stay
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                setLeaveOpen(false);
                                navigate('/');
                            }}
                        >
                            Leave without committing
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default EditorPage;

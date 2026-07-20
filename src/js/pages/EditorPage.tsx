import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import {useRepositories} from '../services/githubRepoQueryHooks';
import {useFileContent} from '../services/githubQueryHooks';
import {exportMarkdownFile, getCurrentFilename} from '../services/markdownService';
import {parseMarkdown, serializeMarkdown} from '../utils/markdownUtils';
import {constructLessonPath} from '../utils/urlUtils';
import logger from '../utils/logger';
import type {FairMarkdownDocument} from '../types';
import UserMenu from '../components/navigation/UserMenu';
import GitHubCommitButton from '../components/GitHubCommitButton';
import SinglePageEditor from '../components/editor/SinglePageEditor';
import {Button} from '../components/ui/button';
import {PageSpinner} from '../components/ui/spinner';

const EditorPage: React.FC = () => {
    const navigate = useNavigate();
    const [document, setDocument] = useState<FairMarkdownDocument>();
    const [markdownContent, setMarkdownContent] = useState<string>('');

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
                setMarkdownContent(serializeMarkdown(parsed));
            } catch (error) {
                logger.error('Error serializing markdown:', error);
            }
        }
    }, [fileContent]);

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
            exportMarkdownFile(markdownContent);
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
                        <button
                            type="button"
                            onClick={() => navigate('/')}
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
                        Export
                    </Button>
                    {markdownContent && (
                        <GitHubCommitButton
                            content={markdownContent}
                            originalGithubContent={originalGithubContent}
                            filePath={getCurrentFilename(fullLessonPath)}
                            repository={repository}
                            branch={branch}
                            document={document}
                            onExport={handleExportMarkdown}
                        />
                    )}
                    <UserMenu />
                </div>
            </header>

            <SinglePageEditor
                document={document}
                onDocumentChange={handleDocumentChange}
                owner={owner}
                repo={repo}
                branch={branch}
            />
        </div>
    );
};

export default EditorPage;

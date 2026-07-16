import React, {useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import logger from '../utils/logger';
import {Alert, AlertTitle, Box, Button, CircularProgress, Container, Divider, Stack, Typography} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import DescriptionIcon from '@mui/icons-material/Description';
import {useQueryClient} from '@tanstack/react-query';
import {useRepositories} from '../services/githubRepoQueryHooks';
import {useFileContent} from '../services/githubQueryHooks';
import {useLessonPlanContent} from '../services/lessonPlanQueryHooks';
import {exportMarkdownFile, getCurrentFilename} from '../services/markdownService';
import {parseMarkdown, serializeMarkdown} from '../utils/markdownUtils';
import {constructLessonPath} from '../utils/urlUtils';
import type {FairMarkdownDocument} from '../types';
import UserMenu from '../components/navigation/UserMenu';
import StyledAppBar from '../components/navigation/StyledAppBar';
import GitHubCommitButton from '../components/GitHubCommitButton';
import {EditorTabs} from "../components/LessonPlanEditor";

const EditorPage: React.FC = () => {
    const navigate = useNavigate();
    const [document, setDocument] = useState<FairMarkdownDocument>();
    const [manualError, setManualError] = useState<string | null>(null);

    const [markdownContent, setMarkdownContent] = useState<string>('');
    const params = useParams<{ owner: string, repo: string, branch: string, category: string, lesson: string }>();
    const {owner, repo, branch, category, lesson} = params;
    const fullLessonPath = category && lesson ? constructLessonPath(category, lesson) : '';

    // Get repositories to find the full repository object
    const {repositories = []} = useRepositories();
    const repository = repositories.find(r => r.owner.login === owner && r.name === repo);

    // Use React Query hook for file content
    const {
        data: fileContent,
        isLoading: isLoadingFileContent
    } = useFileContent(
        owner || '',
        repo || '',
        fullLessonPath,
        branch || '',
        {enabled: !!owner && !!repo && !!branch && !!fullLessonPath}
    );

    useEffect(() => {
        if (fileContent !== undefined) {
            setDocument(parseMarkdown(fileContent));
        }
    }, [fileContent]);

    if (isLoadingFileContent || fileContent === undefined || document === undefined) {
        return <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh'
        }}>
            <CircularProgress/>
        </Box>
    }

    const originalGithubContent = fileContent || '';

    const error = !isLoadingFileContent ? (
        manualError
    ) : null;

    const handleDocumentChange = (updatedDocument: Partial<FairMarkdownDocument>) => {
        if (document) {
            const newDocument = {...document, ...updatedDocument};
            setDocument(newDocument);

            // Serialize and save
            try {
                const markdown = serializeMarkdown(newDocument);
                setMarkdownContent(markdown);
                // The content update will be handled by the useEffect that watches markdownContent
            } catch (error) {
                logger.error('Error serializing markdown:', error);
                // Handle error state
            }
        }
    };

    const handleExportMarkdown = () => {
        if (markdownContent) {
            exportMarkdownFile(markdownContent);
        }
    };
    //
    const handleReturnToSelection = () => {
        navigate('/');
    };

    return (
        <Box sx={{display: 'flex', flexDirection: 'column', height: '100vh'}}>
            <StyledAppBar>
                <Box sx={{display: 'flex', flexDirection: 'column'}}>
                    <Typography variant="h6" component="div" color="white">
                        Lesson Plan Editor
                    </Typography>
                    {owner && repo && lesson && (
                        <Box
                            component="button"
                            onClick={handleReturnToSelection}
                            sx={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                p: 0,
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <Stack direction="row" spacing={2} sx={{opacity: 0.8, color: 'white'}}>
                                <Box sx={{display: 'flex', alignItems: 'center'}}>
                                    <GitHubIcon fontSize="small" sx={{mr: 0.5}}/>
                                    <Typography variant="caption" color="inherit">
                                        {`${owner}/${repo}`}
                                    </Typography>
                                </Box>
                                <Box sx={{display: 'flex', alignItems: 'center'}}>
                                    <AccountTreeIcon fontSize="small" sx={{mr: 0.5}}/>
                                    <Typography variant="caption" color="inherit">
                                        {branch}
                                    </Typography>
                                </Box>
                                <Divider orientation="vertical" flexItem sx={{bgcolor: 'rgba(255,255,255,0.3)'}}/>
                                <Box sx={{display: 'flex', alignItems: 'center'}}>
                                    <DescriptionIcon fontSize="small" sx={{mr: 0.5}}/>
                                    <Typography variant="caption" color="inherit">
                                        {lesson || ''}
                                    </Typography>
                                </Box>
                            </Stack>
                        </Box>
                    )}
                </Box>
                <Box sx={{display: 'flex', gap: 1, alignItems: 'center'}}>
                    {markdownContent && (
                        <GitHubCommitButton
                            content={markdownContent}
                            originalGithubContent={originalGithubContent}
                            filePath={getCurrentFilename(fullLessonPath)}
                            repository={repository}
                            branch={branch}
                            document={document}
                            color="secondary"
                            onExport={handleExportMarkdown}
                        />
                    )}
                    <UserMenu/>
                </Box>
            </StyledAppBar>

            <Container maxWidth="lg" sx={{flexGrow: 1, display: 'flex', flexDirection: 'column', py: 2}}>
                {isLoadingFileContent ? (
                    <Container maxWidth="lg" sx={{
                        mt: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '80vh'
                    }}>
                        <CircularProgress size={60}/>
                    </Container>
                ) : error ? (
                    <Alert severity="error" sx={{mt: 2}}>
                        <AlertTitle>Error</AlertTitle>
                        {error}
                    </Alert>
                ) : (
                    <Box sx={{flexGrow: 1, display: 'flex', flexDirection: 'column'}}>
                        <EditorTabs 
                            document={document} 
                            onDocumentChange={handleDocumentChange}
                            owner={owner}
                            repo={repo}
                            branch={branch}
                        />
                    </Box>
                )}
            </Container>
        </Box>
    );
};

export default EditorPage;

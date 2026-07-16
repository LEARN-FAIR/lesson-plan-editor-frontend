import React from 'react';
import {Alert, AlertTitle, Box, CircularProgress, Container, Typography} from '@mui/material';
import {useNavigate} from 'react-router-dom';
import {generateLessonPlanUrl} from '../utils/urlUtils';
import logger from '../utils/logger';
import type {Repository} from '../types/github';
import type {LessonPlan} from '../types/lessonPlan';
import {useRepositories} from '../services/githubRepoQueryHooks';
import UserMenu from '../components/navigation/UserMenu';
import SetupStepper from '../components/SetupStepper';
import StyledAppBar from '../components/navigation/StyledAppBar';

const SetupPage: React.FC = () => {
    const navigate = useNavigate();

    // Use Repository Context to access repositories
    const {
        isLoading: isLoadingRepos,
        error: reposError
    } = useRepositories();

    // Loading and error states from repositories only
    const loading = isLoadingRepos;
    const error = reposError ? (reposError as Error).message : null;

    const handleSetupComplete = (repo: Repository, lessonPlan: LessonPlan, branch?: string) => {
        // Generate and navigate to the appropriate URL
        // EditorPage will handle all loading from URL parameters
        const url = generateLessonPlanUrl(repo, lessonPlan, branch);
        logger.log('Navigating to editor with URL:', url);
        navigate(url);
    };

    return (
        <Box sx={{display: 'flex', flexDirection: 'column', height: '100vh'}}>
            <StyledAppBar>
                <Typography variant="h6" component="div" color="white" sx={{flexGrow: 1}}>
                    Lesson Plan Editor
                </Typography>
                <UserMenu/>
            </StyledAppBar>

            <Container maxWidth="lg" sx={{flexGrow: 1, display: 'flex', flexDirection: 'column', py: 2}}>
                {loading ? (
                    <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>
                        <CircularProgress/>
                    </Box>
                ) : error ? (
                    <Alert severity="error" sx={{mt: 2}}>
                        <AlertTitle>Error</AlertTitle>
                        {error}
                    </Alert>
                ) : (
                    <Box sx={{flexGrow: 1, display: 'flex', flexDirection: 'column'}}>
                        <SetupStepper onComplete={handleSetupComplete}/>
                    </Box>
                )}
            </Container>
        </Box>
    );
};

export default SetupPage;

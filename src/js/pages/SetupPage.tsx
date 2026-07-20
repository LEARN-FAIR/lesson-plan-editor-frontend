import React from 'react';
import {useNavigate} from 'react-router-dom';
import {generateLessonPlanUrl} from '../utils/urlUtils';
import logger from '../utils/logger';
import type {Repository} from '../types/github';
import type {LessonPlan} from '../types/lessonPlan';
import {useRepositories} from '../services/githubRepoQueryHooks';
import UserMenu from '../components/navigation/UserMenu';
import SetupStepper from '../components/SetupStepper';
import {Alert, AlertTitle} from '../components/ui/alert';
import {Spinner} from '../components/ui/spinner';

const SetupPage: React.FC = () => {
    const navigate = useNavigate();

    const {isLoading: isLoadingRepos, error: reposError} = useRepositories();

    const loading = isLoadingRepos;
    const error = reposError ? (reposError as Error).message : null;

    const handleSetupComplete = (repo: Repository, lessonPlan: LessonPlan, branch?: string) => {
        const url = generateLessonPlanUrl(repo, lessonPlan, branch);
        logger.log('Navigating to editor with URL:', url);
        navigate(url);
    };

    return (
        <div className="flex h-screen flex-col font-sans">
            <header
                className="flex flex-shrink-0 items-center justify-between px-8 py-[18px]"
                style={{background: 'linear-gradient(180deg, rgb(12,52,80), rgb(10,44,68))'}}
            >
                <div className="text-lg font-semibold text-white">Lesson Plan Editor</div>
                <UserMenu />
            </header>

            <div className="flex-1 overflow-auto bg-zinc-50 px-4 py-8">
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <Spinner size={40} />
                    </div>
                ) : error ? (
                    <div className="mx-auto max-w-3xl">
                        <Alert variant="error">
                            <AlertTitle>Error</AlertTitle>
                            {error}
                        </Alert>
                    </div>
                ) : (
                    <SetupStepper onComplete={handleSetupComplete} />
                )}
            </div>
        </div>
    );
};

export default SetupPage;

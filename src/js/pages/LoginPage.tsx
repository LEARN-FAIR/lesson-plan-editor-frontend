import React, {useEffect} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {Github} from 'lucide-react';
import githubService from '../services/githubService';
import {useAuth} from '../contexts/AuthContext';
import logger from '../utils/logger';
import Visual from '../components/images/home-visual.svg';
import {Button} from '../components/ui/button';
import {Card} from '../components/ui/card';
import {PageSpinner} from '../components/ui/spinner';

const LoginPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const {isAuthenticated, isLoading} = useAuth();

    const searchParams = new URLSearchParams(location.search);
    const redirectUrl = searchParams.get('redirect_url') || '/';

    logger.log('LoginPage: redirect_url is', redirectUrl);

    useEffect(() => {
        if (isAuthenticated && !isLoading) {
            logger.log('User is authenticated, redirecting to:', redirectUrl);
            navigate(redirectUrl, {replace: true});
        }
    }, [isAuthenticated, isLoading, navigate, redirectUrl]);

    if (isLoading) {
        return <PageSpinner />;
    }

    if (isAuthenticated) {
        return null;
    }

    const handleLogin = () => {
        if (redirectUrl && redirectUrl !== '/login') {
            logger.log('Using redirect URL for GitHub OAuth:', redirectUrl);
            localStorage.setItem('redirect_url', redirectUrl);
            githubService.redirectToGitHub(redirectUrl);
        } else {
            githubService.redirectToGitHub();
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
            <Card className="flex w-full max-w-md flex-col items-center p-8 text-center shadow-sm">
                <img
                    src={Visual}
                    alt="FAIR Lesson Plan Editor"
                    className="mb-5 h-auto w-3/5 max-w-full"
                />
                <h1 className="mb-2 text-2xl font-semibold text-navy">FAIR Lesson Plan Editor</h1>
                <p className="mb-6 text-sm text-muted-foreground">
                    Please sign in with GitHub to use the application.
                </p>
                <Button size="lg" onClick={handleLogin}>
                    <Github className="h-4 w-4" />
                    Sign in with GitHub
                </Button>
            </Card>
        </div>
    );
};

export default LoginPage;

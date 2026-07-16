import React, {useEffect} from 'react';
import {Box, Button, CircularProgress, Container, Paper, Typography} from '@mui/material';
import {useLocation, useNavigate} from 'react-router-dom';
import githubService from '../services/githubService';
import {useAuth} from '../contexts/AuthContext';
import logger from '../utils/logger';
import Visual from '../components/images/home-visual.svg';
import AddIcon from "@mui/icons-material/Add";
import GitHubIcon from "@mui/icons-material/GitHub";

const LoginPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const {isAuthenticated, isLoading} = useAuth();

    // Get redirect_url from query parameters
    const searchParams = new URLSearchParams(location.search);
    const redirectUrl = searchParams.get('redirect_url') || '/';

    logger.log('LoginPage: redirect_url is', redirectUrl);

    // If user is already authenticated, redirect to the requested page
    useEffect(() => {
        if (isAuthenticated && !isLoading) {
            logger.log('User is authenticated, redirecting to:', redirectUrl);
            navigate(redirectUrl, {replace: true});
        }
    }, [isAuthenticated, isLoading, navigate, redirectUrl]);

    // Show loading indicator while checking authentication
    if (isLoading) {
        return (
            <Box sx={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>
                <CircularProgress/>
            </Box>
        );
    }

    // If user is already authenticated, don't render the login page
    if (isAuthenticated) {
        return null;
    }

    const handleLogin = () => {
        // Pass the redirect_url as a state parameter to GitHub OAuth
        // This will be available in the state when we return from GitHub
        if (redirectUrl && redirectUrl !== '/login') {
            logger.log('Using redirect URL for GitHub OAuth:', redirectUrl);
            // Store in local storage as a fallback
            localStorage.setItem('redirect_url', redirectUrl);

            // Pass the redirect_url to the GitHub service
            githubService.redirectToGitHub(redirectUrl);
        } else {
            // Redirect to GitHub OAuth without a specific redirect URL
            githubService.redirectToGitHub();
        }
    };

    return (
        <Container maxWidth="sm" sx={{mt: 8}}>
            <Paper elevation={3} sx={{p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <img src={Visual} alt="FAIR Lesson Plan Editor"
                     style={{maxWidth: '60%', height: 'auto', marginBottom: '20px'}}/>
                <Typography variant="h4" component="h1" color="primary" gutterBottom>
                    FAIR Lesson Plan Editor
                </Typography>
                <Typography variant="body1" paragraph>
                    Please sign in with GitHub to use the application.
                </Typography>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleLogin}
                    size="large"
                    sx={{mt: 2}}
                    startIcon={<GitHubIcon/>}
                >
                    Sign in with GitHub
                </Button>
            </Paper>
        </Container>
    );
};

export default LoginPage;

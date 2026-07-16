import React, {useEffect, useRef, useState} from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import {Box, CircularProgress, Paper, Typography} from '@mui/material';
import {useQueryClient} from '@tanstack/react-query';
import {refreshAuthState} from '../services/authService';
import logger from '../utils/logger';
import {useAuth} from '../contexts/AuthContext';
import apiAdapter from '../services/apiAdapter';

/**
{{ ... }}
 * This component should be rendered at the /github-callback route.
 */
const GitHubCallback: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const {isAuthenticated} = useAuth();
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState<boolean>(false);
    const processed = useRef<boolean>(false);
    const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

    // Get the redirect URL when component mounts
    useEffect(() => {
        // First try to get from local storage (set by LoginPage)
        const storedUrl = localStorage.getItem('redirect_url');
        if (storedUrl) {
            logger.log('Found stored redirect URL:', storedUrl);
            setRedirectUrl(storedUrl);
            // Don't clear it yet, we'll need it in the callback handler
        } else {
            logger.log('No stored redirect URL, will use default');
            setRedirectUrl('/');
        }
    }, []);

    // Handle the OAuth callback
    useEffect(() => {
        // Only process once per component mount
        if (processed.current) {
            logger.log('Already processed OAuth callback, skipping');
            return;
        }

        const handleCallback = async () => {
            // If already processing, don't try again
            if (processing) {
                logger.log('Already processing OAuth callback, skipping');
                return;
            }

            try {
                logger.log('Starting GitHub OAuth callback processing');
                setProcessing(true);
                processed.current = true;
                
                // Check for authentication success in URL fragment
                const authSuccess = apiAdapter.checkAuthSuccessInUrl();
                
                // Use refreshAuthState to update auth state and invalidate queries
                const authResult = await refreshAuthState(queryClient);
                logger.log('Authentication refresh result:', authResult);
                
                if (!authResult.authenticated) {
                    throw new Error('Authentication failed - session not established');
                }
                
                // Clear the URL fragment to prevent token leakage
                window.history.replaceState({}, document.title, '/github-callback');

                // Get the final redirect URL to use
                const sessionRedirectUrl = localStorage.getItem('redirect_url');
                logger.log('Session storage redirect URL at redirect time:', sessionRedirectUrl);

                // If we have a complex editor URL in session storage, prioritize it
                const isEditorUrl = sessionRedirectUrl && sessionRedirectUrl.startsWith('/editor/');

                // Always prioritize local storage for authenticated users
                const finalRedirectUrl = sessionRedirectUrl || redirectUrl || '/';
                logger.log('Final redirect URL decision:', {
                    redirectUrl,
                    sessionRedirectUrl,
                    isEditorUrl,
                    finalRedirectUrl
                });

                // Now clear the local storage
                localStorage.removeItem('redirect_url');

                try {
                    const decodedUrl = decodeURIComponent(finalRedirectUrl);
                    logger.log('Redirecting to:', decodedUrl);
                    window.location.href = decodedUrl; // Use direct location change instead of navigate
                } catch (error) {
                    logger.error('Error decoding redirect URL:', error);
                    window.location.href = finalRedirectUrl; // Use direct location change instead of navigate
                }
            } catch (err) {
                logger.error('GitHub OAuth callback error:', err);
                setError(`Authentication failed: ${(err as Error).message}`);
                setProcessing(false);
            }
        };

        // Execute the callback handler once
        handleCallback();
    }, [location.search, processing, redirectUrl]);

    // No manual redirect function needed anymore

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                p: 3
            }}
        >
            <Paper elevation={3} sx={{p: 4, maxWidth: 500, textAlign: 'center'}}>
                {error ? (
                    <>
                        <Typography variant="h5" color="error" gutterBottom>
                            Authentication Error
                        </Typography>
                        <Typography color="text.secondary">{error}</Typography>
                        <Box sx={{mt: 2}}>
                            <Typography>
                                <a href="/" style={{textDecoration: 'none'}}>Return to the editor</a>
                            </Typography>
                        </Box>
                    </>
                ) : (
                    <>
                        <CircularProgress size={60} sx={{mb: 2}}/>
                        <Typography variant="h5" gutterBottom>
                            Completing GitHub Authentication
                        </Typography>
                        <Typography color="text.secondary">
                            You'll be redirected back to the editor in a moment...
                        </Typography>
                    </>
                )}
            </Paper>
        </Box>
    );
};

export default GitHubCallback;

import React, {useEffect, useRef, useState} from 'react';
import {useLocation} from 'react-router-dom';
import {useQueryClient} from '@tanstack/react-query';
import {refreshAuthState} from '../services/authService';
import logger from '../utils/logger';
import apiAdapter from '../services/apiAdapter';
import {Card} from '../components/ui/card';
import {Spinner} from '../components/ui/spinner';

/**
 * Handles the GitHub OAuth callback. Rendered at the /github-callback route.
 */
const GitHubCallback: React.FC = () => {
    const location = useLocation();
    const queryClient = useQueryClient();
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState<boolean>(false);
    const processed = useRef<boolean>(false);
    const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

    useEffect(() => {
        const storedUrl = localStorage.getItem('redirect_url');
        if (storedUrl) {
            logger.log('Found stored redirect URL:', storedUrl);
            setRedirectUrl(storedUrl);
        } else {
            logger.log('No stored redirect URL, will use default');
            setRedirectUrl('/');
        }
    }, []);

    useEffect(() => {
        if (processed.current) {
            logger.log('Already processed OAuth callback, skipping');
            return;
        }

        const handleCallback = async () => {
            if (processing) {
                logger.log('Already processing OAuth callback, skipping');
                return;
            }

            try {
                logger.log('Starting GitHub OAuth callback processing');
                setProcessing(true);
                processed.current = true;

                apiAdapter.checkAuthSuccessInUrl();

                const authResult = await refreshAuthState(queryClient);
                logger.log('Authentication refresh result:', authResult);

                if (!authResult.authenticated) {
                    throw new Error('Authentication failed - session not established');
                }

                window.history.replaceState({}, document.title, '/github-callback');

                const sessionRedirectUrl = localStorage.getItem('redirect_url');
                const finalRedirectUrl = sessionRedirectUrl || redirectUrl || '/';
                localStorage.removeItem('redirect_url');

                try {
                    const decodedUrl = decodeURIComponent(finalRedirectUrl);
                    logger.log('Redirecting to:', decodedUrl);
                    window.location.href = decodedUrl;
                } catch (err) {
                    logger.error('Error decoding redirect URL:', err);
                    window.location.href = finalRedirectUrl;
                }
            } catch (err) {
                logger.error('GitHub OAuth callback error:', err);
                setError(`Authentication failed: ${(err as Error).message}`);
                setProcessing(false);
            }
        };

        handleCallback();
    }, [location.search, processing, redirectUrl, queryClient]);

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-6">
            <Card className="max-w-md p-8 text-center shadow-sm">
                {error ? (
                    <>
                        <h2 className="mb-2 text-xl font-semibold text-destructive">Authentication error</h2>
                        <p className="text-sm text-muted-foreground">{error}</p>
                        <p className="mt-3 text-sm">
                            <a href="/" className="text-teal hover:underline">
                                Return to the editor
                            </a>
                        </p>
                    </>
                ) : (
                    <>
                        <div className="mb-4 flex justify-center">
                            <Spinner size={48} />
                        </div>
                        <h2 className="mb-2 text-xl font-semibold text-navy">Completing GitHub authentication</h2>
                        <p className="text-sm text-muted-foreground">
                            You'll be redirected back to the editor in a moment…
                        </p>
                    </>
                )}
            </Card>
        </div>
    );
};

export default GitHubCallback;

import React, {useEffect, useMemo, useState} from 'react';
import {useParams} from 'react-router-dom';
import {usePublicLessonContent} from '../services/lessonPlanQueryHooks';
import {MarkdownParseError, parseMarkdown} from '../utils/markdownUtils';
import {useAuth} from '../contexts/AuthContext';
import githubService from '../services/githubService';
import {redirectToOrcid} from '../services/authService';
import apiAdapter from '../services/apiAdapter';
import logger from '../utils/logger';
import type {SuggestionPayload} from '../utils/lessonItems';
import PublicNav from '../components/PublicNav';
import SuggestChangesForm from '../components/suggest/SuggestChangesForm';
import {PageSpinner} from '../components/ui/spinner';

const PENDING_KEY = 'pendingSuggestion';

/**
 * Public, unauthenticated "Suggest changes" page. Loads a published lesson plan
 * (backend resolves the repo), lets a visitor draft proposed edits, then signs
 * in with GitHub/ORCID to submit a review request.
 */
const SuggestChangesPage: React.FC = () => {
    const {category, lesson} = useParams<{category: string; lesson: string}>();
    const {isAuthenticated, isLoading: authLoading} = useAuth();

    const {data: raw, isLoading, isError} = usePublicLessonContent(category, lesson);

    const {parsedDoc, parseError} = useMemo(() => {
        if (!raw) return {parsedDoc: undefined, parseError: undefined};
        try {
            return {parsedDoc: parseMarkdown(raw), parseError: undefined};
        } catch (e) {
            logger.error('Error parsing lesson plan markdown:', e);
            return {
                parsedDoc: undefined,
                parseError: e instanceof MarkdownParseError
                    ? e
                    : new MarkdownParseError('The lesson file could not be read.'),
            };
        }
    }, [raw]);

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState(false);
    const [submittedUrl, setSubmittedUrl] = useState<string | null>(null);

    const submit = async (payload: SuggestionPayload) => {
        setSubmitting(true);
        setSubmitError(null);
        try {
            const result = await apiAdapter.submitSuggestions(payload);
            setSubmittedUrl(result?.url || null);
            setSubmitted(true);
        } catch (e) {
            logger.error('Error submitting suggestions:', e);
            setSubmitError(`Could not submit your proposal: ${(e as Error).message}`);
        } finally {
            setSubmitting(false);
        }
    };

    // After returning from OAuth: authenticated + a saved draft → submit it.
    useEffect(() => {
        if (authLoading || !isAuthenticated || submitted) return;
        const saved = localStorage.getItem(PENDING_KEY);
        if (!saved) return;
        localStorage.removeItem(PENDING_KEY);
        try {
            submit(JSON.parse(saved) as SuggestionPayload);
        } catch {
            /* ignore malformed draft */
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authLoading, isAuthenticated]);

    const handleSignIn = (provider: 'github' | 'orcid', payload: SuggestionPayload) => {
        const returnUrl = window.location.pathname + window.location.search;
        localStorage.setItem(PENDING_KEY, JSON.stringify(payload));
        localStorage.setItem('redirect_url', returnUrl);
        if (provider === 'github') {
            githubService.redirectToGitHub(returnUrl);
        } else {
            redirectToOrcid(returnUrl);
        }
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen flex-col font-sans" style={{background: '#f7f7f8'}}>
                <PublicNav />
                <PageSpinner />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col font-sans" style={{background: '#f7f7f8'}}>
            <PublicNav />
            {!parsedDoc || isError ? (
                <main className="mx-auto max-w-[760px] px-6 py-20 text-center">
                    <h1 className="mb-2 text-2xl font-semibold text-navy">
                        {parseError ? 'Lesson plan source is invalid' : 'Lesson plan not found'}
                    </h1>
                    <p className="text-[15px] text-zinc-600">
                        {parseError
                            ? `YAML error: ${parseError.reason || parseError.message}${parseError.line ? ` (line ${parseError.line}${parseError.column ? `, column ${parseError.column}` : ''})` : ''}.`
                            : "We couldn't load this lesson plan. Please return to the handbook and try again."}
                    </p>
                </main>
            ) : (
                <SuggestChangesForm
                    document={parsedDoc}
                    category={category || ''}
                    lesson={lesson || ''}
                    isAuthenticated={isAuthenticated}
                    submitting={submitting}
                    submitError={submitError}
                    submitted={submitted}
                    submittedUrl={submittedUrl}
                    onSignIn={handleSignIn}
                    onSubmit={submit}
                />
            )}
        </div>
    );
};

export default SuggestChangesPage;

import React from 'react';
import {Navigate, useLocation} from 'react-router-dom';
import {useAuth} from '../../contexts/AuthContext';
import logger from '../../utils/logger';
import {PageSpinner} from '../ui/spinner';

/**
 * ProtectedRoute component for React Router v6.
 * Checks authentication status and redirects to login if not authenticated.
 * Usage: <Route path="/" element={<ProtectedRoute element={<Component/>} />} />
 */
interface ProtectedRouteProps {
    element: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({element}) => {
    const {isAuthenticated, isLoading} = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <PageSpinner />;
    }

    if (!isAuthenticated) {
        if (location.pathname !== '/login' && location.pathname !== '/github-callback') {
            const fullPath = location.pathname + (location.search || '') + (location.hash || '');
            logger.log('Redirecting to login with redirect_url:', fullPath);
            const encodedRedirectUrl = encodeURIComponent(fullPath);
            return <Navigate to={`/login?redirect_url=${encodedRedirectUrl}`} replace />;
        }
        return <Navigate to="/login" replace />;
    }

    return <>{element}</>;
};

export default ProtectedRoute;

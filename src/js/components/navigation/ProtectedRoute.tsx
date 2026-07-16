import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Box, CircularProgress } from '@mui/material';
import logger from '../../utils/logger';

/**
 * ProtectedRoute component for React Router v6
 * It checks authentication status and redirects to login if not authenticated
 * Usage: <Route path="/" element={<ProtectedRoute element={<Component/>} />} />
 */
interface ProtectedRouteProps {
    element: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element }) => {
    const { isAuthenticated, isLoading } = useAuth();
    const location = useLocation();

    // Show loading indicator while checking authentication
    if (isLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    // If not authenticated, redirect to login with redirect_url query parameter
    if (!isAuthenticated) {
        // Encode the current path for redirect after login
        if (location.pathname !== '/login' && location.pathname !== '/github-callback') {
            const fullPath = location.pathname +
                (location.search ? location.search : '') +
                (location.hash ? location.hash : '');
            logger.log('Redirecting to login with redirect_url:', fullPath);

            // Use query parameter instead of session storage
            const encodedRedirectUrl = encodeURIComponent(fullPath);
            return <Navigate to={`/login?redirect_url=${encodedRedirectUrl}`} replace />;
        }

        return <Navigate to="/login" replace />;
    }

    // If authenticated, render the protected content
    return <>{element}</>;
};

export default ProtectedRoute;

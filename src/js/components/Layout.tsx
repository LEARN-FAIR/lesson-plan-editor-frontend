import React from 'react';
import {Box, CircularProgress, CssBaseline, Typography} from '@mui/material';
import {useLocation} from 'react-router-dom';
import {useAuth} from '../contexts/AuthContext';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({children}) => {
    const location = useLocation();
    const {isLoading} = useAuth();

    // Check if we're on the login page or GitHub callback page
    const isAuthPage = location.pathname === '/login' || location.pathname === '/github-callback';

    // If we're still loading auth state, render a minimal layout
    if (isLoading && !isAuthPage) {
        return (
            <Box sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                flexDirection: 'column'
            }}>
                <CircularProgress size={40} sx={{mb: 2}}/>
            </Box>
        );
    }

    return (
        <Box sx={{display: 'flex', flexDirection: 'column', minHeight: '100vh'}}>
            <CssBaseline/>
            {children}
        </Box>
    );
};

export default Layout;
